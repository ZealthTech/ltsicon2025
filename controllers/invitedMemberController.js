require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;

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
    // 2. Fetch memberList with authors + user info
    const memberList = await prisma.invitedMember.findMany({
      where: {
        status: 1,
      },
      select: {
        id: true,
        name: true,
        ltsino: true,
        photo: true,
        status: true,
        responsibilityWork: {
          select: {
            invitedMemId: true,
            role: true,
          },
        },
      },
    });

    if (!memberList) {
      return res.status(404).json({
        status: false,
        message: "No memberList found for this user",
      });
    }
    const memberListWithFullPhotoURL = memberList.map((member) => ({
      ...member,
      photo: member.photo ? BASE_URL_IMG + member.photo : null,
    }));
    // 3. Response
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

module.exports = { fetchMember, fetchDetail };
