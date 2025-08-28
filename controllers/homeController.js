require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    const user = await prisma.user.findFirst({
      where: { userId: Number(userId), roleId: Number(roleId), status: 1 },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found",
      });
    }

    //  Fetch banners
    const banners = await prisma.banner.findMany({
      where: { status: 1 },
      orderBy: { sequence: "asc" },
    });

    //  Fetch news
    const news = await prisma.news.findMany({
      where: { status: 1 },
      orderBy: { createdOn: "desc" },
    });

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
    };

    // Check abstracts
    const abstracts = await prisma.absSubmission.findMany({
      where: { userId: Number(userId) },
    });
    const abstractObj = {
      isAbstractSubmission: abstracts.length > 0 ? 1 : 0,
      list: abstracts,
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon2.png",
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
    };
    const allSessionsObj = {
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon2.png",
    };
    const albumObj = {
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon1.png",
    };
    const speakersObj = {
      icon: "https://con.bordersandbeyond.in/uploads/icons/icon2.png",
    };

    //  Final unified response
    return res.status(200).json({
      status: true,
      message: "Homepage data fetched successfully",
      data: {
        user,
        banners,
        news,
        registration: registrationObj,
        abstractSubmission: abstractObj,
        workshop: workshopObj,
        allSessionsObj,
        albumObj,
        speakersObj,
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
