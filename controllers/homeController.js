require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const nodeCache = require("../middleware/cache.js");
const BASE_URL_IMG = process.env.BASE_URL_IMG;

// TTLs in seconds
const GLOBAL_TTL = 60 * 100; // 5 minutes
const USER_TTL = 60 * 100;   // 2 minutes

const homepage = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    if (!userId || !roleId) {
      return res.status(400).json({
        status: false,
        message: "userId and roleId is required",
      });
    }

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    // Cache keys
    const globalCacheKey = "homepage_global";
    const userCacheKey = `homepage_user_${userId}`;

    // Try to fetch cached global and user pieces
    let globalData = nodeCache.get(globalCacheKey);
    let userData = nodeCache.get(userCacheKey);

    // ---------- Global data (banners, news, static sections) ----------
    if (!globalData) {
      // Fetch banners
      const bannersRaw = await prisma.banner.findMany({
        where: { status: 1 },
        orderBy: { sequence: "asc" },
      });
      const banners = bannersRaw.map((b) => ({
        ...b,
        bannerImage: b.bannerImage ? `${BASE_URL_IMG}${b.bannerImage}` : null,
      }));

      // Fetch news
      const newsRaw = await prisma.news.findMany({
        where: { status: 1 },
        orderBy: { createdOn: "desc" },
      });
      const news = newsRaw.map((n) => ({
        ...n,
        newsImage: n.newsImage ? `${BASE_URL_IMG}${n.newsImage}` : null,
      }));

      // static section icons (these rarely change, hence global)
      const allSessionsObj = {
        icon: "https://con.bordersandbeyond.in/uploads/icons/session.png",
        label: "Scientific Programs",
      };
      const albumObj = {
        icon: "https://con.bordersandbeyond.in/uploads/icons/album.png",
        label: "Photo Album",
      };
      const speakersObj = {
        icon: "https://con.bordersandbeyond.in/uploads/icons/Speaker.png",
        label: "Faculty & Speakers",
      };

      globalData = { banners, news, allSessionsObj, albumObj, speakersObj };

      // cache global data
      nodeCache.set(globalCacheKey, globalData, GLOBAL_TTL);
    }

    // ---------- User-specific data (profile, registrations, abstracts, workshops) ----------
    if (!userData) {
      //  Fetch user profile
      const userDataRaw = await prisma.user.findFirst({
        where: { userId: Number(userId), roleId: Number(roleId), status: 1 },
      });

      if (!userDataRaw) {
        return res.status(401).json({
          status: false,
          message: "User not found",
        });
      }

      const user = {
        ...userDataRaw,
        profileImage: userDataRaw.profileImage
          ? `${BASE_URL_IMG}${userDataRaw.profileImage}`
          : null,
      };

      // registrations
      const registrations = await prisma.booking.findMany({
        where: {
          userId: Number(userId),
          memberType: { not: null },
          memberTypeFee: { not: null },
        },
      });

      let isRegistration = 0;
      let isPaymentDone = 0;
      if (registrations.length > 0) {
        // existing logic: if any booking has status === 1 consider payment done? (keep original logic)
        const hasPaid = registrations.some((booking) => booking.status === 1);
        isRegistration = 1;
        isPaymentDone = hasPaid ? 1 : 0;
      }

      const registrationObj = {
        isRegistration,
        isPaymentDone,
        icon: "https://con.bordersandbeyond.in/uploads/icons/Register.png",
        label: "Registration",
      };

      // abstracts
      const abstracts = await prisma.absSubmission.findMany({
        where: { userId: Number(userId) },
      });
      const abstractObj = {
        isAbstractSubmission: abstracts.length > 0 ? 1 : 0,
        list: abstracts,
        icon: "https://con.bordersandbeyond.in/uploads/icons/submission.png",
        label: "My Abstracts",
      };

      // workshops (flatten bookingDetails)
      const bookingsWithWorkshops = await prisma.booking.findMany({
        where: { userId: Number(userId) },
        include: { bookingDetails: true },
      });
      const workshopsList = bookingsWithWorkshops.flatMap((b) => b.bookingDetails || []);
      const workshopObj = {
        isWorkshop: workshopsList.length > 0 ? 1 : 0,
        list: workshopsList,
        icon: "https://con.bordersandbeyond.in/uploads/icons/workshop.png",
        label: "Workshop",
      };

      // Compose userData (sections will be assembled when responding)
      userData = {
        user,
        registrationObj,
        abstractObj,
        workshopObj,
      };

      // cache per-user
      nodeCache.set(userCacheKey, userData, USER_TTL);
    }

    // ---------- Compose response sections (merge static + user-specific) ----------
    const sections = [
      userData.registrationObj,
      userData.abstractObj,
      userData.workshopObj,
      globalData.allSessionsObj,
      globalData.albumObj,
      globalData.speakersObj,
    ];

    // Final response
    return res.status(200).json({
      status: true,
      message: "Homepage data fetched successfully",
      data: {
        user: userData.user,
        banners: globalData.banners,
        news: globalData.news,
        sections,
      },
    });
  } catch (error) {
    console.error("homepage error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = { homepage };
