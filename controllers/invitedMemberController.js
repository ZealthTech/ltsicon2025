require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG_OLD;
const nodeCache = require("../middleware/cache.js");

const fetchMember = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, search } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    const cacheKey = "memberList_" + userId;

    // Check cache
    let memberList = nodeCache.get(cacheKey);

    if (!memberList) {
      // 1️⃣ Fetch all members
      const members = await prisma.invitedMember.findMany({
        where: { status: 1 },
        select: {
          id: true,
          name: true,
          ltsino: true,
          photo: true,
          biodata: true,
          status: true,
          state: true,
          country: true,
        },
      });

      if (!members || members.length === 0) {
        return res.status(404).json({
          status: false,
          message: "No invited members found",
        });
      }

      // 2️⃣ Fetch all responsibility works separately
      const works = await prisma.responsibilityWork.findMany({
        select: {
          invitedMemId: true,
          role: true,
        },
      });

      // 3️⃣ Manually combine the data
      memberList = members.map((member) => ({
        ...member,
        responsibilityWork: works.filter(
          (w) => w.invitedMemId === member.id
        ), // attach matching work items
      }));

      // 4️⃣ Cache the combined result
      nodeCache.set(cacheKey, memberList, 60 * 5);
    }

    // 5️⃣ Add full photo + biodata URLs
    let memberListWithFullPhotoURL = memberList.map((member) => ({
      ...member,
      photo: member.photo ? `${BASE_URL_IMG}/photo/${member.photo}` : null,
      biodata: member.biodata
        ? `${BASE_URL_IMG}/biodata/${member.biodata}`
        : null,
    }));

    // 6️⃣ Optional search filter
    if (search && search.trim() !== "") {
      const searchLower = search.trim().toLowerCase();
      memberListWithFullPhotoURL = memberListWithFullPhotoURL.filter(
        (member) =>
          member.name?.toLowerCase().includes(searchLower) ||
          member.ltsino?.toLowerCase().includes(searchLower) ||
          member.state?.toLowerCase().includes(searchLower) ||
          member.country?.toLowerCase().includes(searchLower) ||
          member.responsibilityWork?.some((r) =>
            r.role?.toLowerCase().includes(searchLower)
          )
      );
    }

    // ✅ Final response
    return res.status(200).json({
      status: true,
      message: search
        ? `Filtered results for "${search}" fetched successfully`
        : "Invited Member list fetched successfully",
      count: memberListWithFullPhotoURL.length,
      data: memberListWithFullPhotoURL,
    });
  } catch (err) {
    console.error("fetch Invited Member Detail API error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const fetchDetail = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, id } = req.body;

    // 1. Validation
    if (!userId || !id) {
      return res.status(400).json({
        status: false,
        message: "userId and id are required",
      });
    }
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    const memberDetail = await prisma.invitedMember.findUnique({
      where: {
        id: Number(id),
      },
      include: { responsibilityWork: true },
    });
    if (!memberDetail) {
      return res.status(404).json({
        status: false,
        message: "Please provide valid Id",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Invited Member Detail fetched successfully",
      data: memberDetail,
    });
  } catch (err) {
    console.error("fetch Invited Member Detail API error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = { fetchMember, fetchDetail };
