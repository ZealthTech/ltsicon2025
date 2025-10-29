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

    const { userId } = req.body;

    // 1. Validation
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

    // 2. Check cache first
    let memberList = nodeCache.get(cacheKey);
    //  let memberList = nodeCache.get(cacheKey);

    if (!memberList) {
      // If not cached, fetch from DB
      memberList = await prisma.invitedMember.findMany({
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
          responsibilityWork: {
            select: {
              invitedMemId: true,
              role: true,
            },
          },
        },
      });

      if (!memberList || memberList.length === 0) {
        return res.status(404).json({
          status: false,
          message: "No memberList found for this user",
        });
      }

      // Save to cache
      nodeCache.set(cacheKey, memberList, 60 * 5); // cache for 5 minutes
    }

    // 3. Transform response (add full photo URL)
    const memberListWithFullPhotoURL = memberList.map((member) => ({
      ...member,
      photo: member.photo ? BASE_URL_IMG+"/photo" + member.photo : null,
      biodata: member.biodata ? BASE_URL_IMG+"/biodata" + member.biodata : null,
    }));

    return res.status(200).json({
      status: true,
      message: "Invited Member list fetched successfully",
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
