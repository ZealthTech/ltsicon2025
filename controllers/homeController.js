require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;

const homepage = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        status: false,
        message: "userId and roleId is required",
      });
    }

    //  Fetch user profile
    const userData = await prisma.user.findFirst({
      where: { userId: Number(userId), roleId: Number(roleId), status: 1 },
    });

    if (!userData) {
      return res.status(401).json({
        status: false,
        message: "User not found",
      });
    }

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    const user = {
      ...userData,
      profileImage: userData.profileImage
        ? `${BASE_URL_IMG}${userData.profileImage}`
        : null,
    };
    //  Fetch banners
    const bannerss = await prisma.banner.findMany({
      where: { status: 1 },
      orderBy: { sequence: "asc" },
    });

    // Add baseURL only when sending response
    const banners = bannerss.map((b) => ({
      ...b,
      bannerImage: b.bannerImage ? `${BASE_URL_IMG}${b.bannerImage}` : null,
    }));

    // Fetch news
    const newss = await prisma.news.findMany({
      where: { status: 1 },
      orderBy: { createdOn: "desc" },
    });

    const news = newss.map((n) => ({
      ...n,
      newsImage: n.newsImage ? `${BASE_URL_IMG}${n.newsImage}` : null,
    }));

    //  Check registrations
    const registrations = await prisma.booking.findMany({
      where: {
        userId: Number(userId),
        memberType: { not: null },
        memberTypeFee: { not: null },
      },
    });
    const registrationObj = {
      isRegistration: registrations.length > 0 ? 1 : 0,
      list: registrations,
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon1.png",
      label: "Registration",
    };
    // Check abstracts
    const abstracts = await prisma.absSubmission.findMany({
      where: { userId: Number(userId) },
    });
    const abstractObj = {
      isAbstractSubmission: abstracts.length > 0 ? 1 : 0,
      list: abstracts,
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon2.png",
      label: "Abstract Submission",
    };
    //  Check workshops
    const bookingsWithWorkshops = await prisma.booking.findMany({
      where: { userId: Number(userId) },
      include: { bookingDetails: true },
    });
    const workshopsList = bookingsWithWorkshops.flatMap(
      (b) => b.bookingDetails
    );
    const workshopObj = {
      isWorkshop: workshopsList.length > 0 ? 1 : 0,
      list: workshopsList,
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon1.png",
      label: "Workshop",
    };
    const allSessionsObj = {
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon2.png",
      label: "All Sessions",
    };
    const albumObj = {
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon1.png",
      label: "Photo Album",
    };
    const speakersObj = {
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon2.png",
      label: "Faculty & Speakers",
    };

    const sections = [
      registrationObj,
      abstractObj,
      workshopObj,
      allSessionsObj,
      albumObj,
      speakersObj,
    ];

    //  Final unified response
    return res.status(200).json({
      status: true,
      message: "Homepage data fetched successfully",
      data: {
        user,
        banners,
        news,
        sections,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = { homepage };
