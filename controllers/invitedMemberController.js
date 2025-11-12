require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG_OLD;
const nodeCache = require("../middleware/cache.js");

const cleanName = (name) => {
  if (!name || typeof name !== "string") return "";
  return name
    .split(",") // split by comma
    .map(
      (n) =>
        n
          .trim() // remove extra spaces
          .replace(/^(Dr\.?|Prof\.?)\s+/i, "") // remove prefixes
          .replace(/\s+/g, " ") // collapse multiple spaces
          .replace(/\b\w/g, (char) => char.toUpperCase()) // capitalize words
    )
    .filter(Boolean) // remove empty strings
    .join(", "); // join back together
};

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
      const members = await prisma.$queryRaw`
  SELECT 
    id, name, ltsino, photo, biodata, status, state, country
  FROM invited_member
  WHERE status = 1
  ORDER BY
    LTRIM(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(LOWER(name), 'dr.', ''),
          'dr ', ''),
        'prof.', ''),
      'prof ', '')
    );
`;

      console.log("mememem", members)
      if (!members || members.length === 0) {
        return res.status(200).json({
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
        responsibilityWork: works.filter((w) => w.invitedMemId === member.id), // attach matching work items
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

    const { userId, id, name } = req.body;

    // Validation
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
    const formattedSearchName = name
      ? name
        .replace(/^(Dr\.?|Prof\.?)\s+/i, "")
        .trim()
        .toLowerCase()
      : "";

    const orFilters = [];

    if (id) {
      orFilters.push({ id: Number(id) });
    }

    if (formattedSearchName) {
      orFilters.push({
        name: {
          contains: formattedSearchName,
        },
      });
    }

    if (orFilters.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Either ID or Name is required to search",
      });
    }
    // Fetch invited member
    const memberDetail = await prisma.invitedMember.findFirst({
      where: { OR: orFilters },
      select: {
        id: true,
        name: true,
        ltsino: true,
        photo: true,
        biodata: true,
        email: true,
        phone: true,
        country: true,
        state: true,
        nights: true,
        status: true,
        createdOn: true,
      },
    });

    if (!memberDetail) {
      return res.status(200).json({
        status: false,
        message: "No invited member found ",
      });
    }

    // Fetch their responsibility work (manual join)
    const responsibilities = await prisma.responsibilityWork.findMany({
      where: { invitedMemId: Number(memberDetail.id) },
      select: {
        id: true,
        title: true,
        role: true,
        topic: true,
        dateTime: true,
        location: true,
        genre: true,
        theme: true,
      },
    });

    // Combine results
    const fullMemberDetail = {
      ...memberDetail,
      photo: memberDetail.photo
        ? `${BASE_URL_IMG}photo/${memberDetail.photo}`
        : null,
      biodata: memberDetail.biodata
        ? `${BASE_URL_IMG}biodata/${memberDetail.biodata}`
        : null,
      responsibilityWork: responsibilities,
      formattedName: cleanName(memberDetail.name),
    };

    // Send response
    return res.status(200).json({
      status: true,
      message: "Invited Member Detail fetched successfully",
      data: fullMemberDetail,
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
