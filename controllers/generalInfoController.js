require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodeCache = require("../middleware/cache.js");
const BASE_URL_IMG = process.env.BASE_URL_IMG;

const getList = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    // Validate input
    if (!userId || !roleId) {
      return res.status(400).json({
        status: false,
        message: "userId and roleId are required",
      });
    }

    //  Auth check
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid token",
      });
    }

    // Try to get cached data
    let generalData = nodeCache.get("generalInfoList");

    //  If not cached, build it
    if (!generalData) {
      const welcome = {
        id: 1,
        icon: `${BASE_URL_IMG}/uploads/generalInfo/About.png`,
        label: "Welcome Message",
      };
      const attend = {
        id: 2,
        icon: `${BASE_URL_IMG}/uploads/generalInfo/committee.png`,
        label: "Who should Attend",
      };
      const executive = {
        id: 3,
        icon: `${BASE_URL_IMG}/uploads/generalInfo/council.png`,
        label: "LTSI Executive",
      };
      const venue = {
        id: 4,
        icon: `${BASE_URL_IMG}/uploads/generalInfo/Venue.png`,
        label: "About the venue",
      };
      const delhi = {
        id: 5,
        icon: `${BASE_URL_IMG}/uploads/generalInfo/session.png`,
        label: "About Delhi",
      };
      const events = {
        id: 6,
        icon: `${BASE_URL_IMG}/uploads/generalInfo/event.png`,
        label: "Social Events",
      };

      generalData = {
        welcome,
        attend,
        executive,
        venue,
        delhi,
        events,
      };

      // Cache it for 1 hour
      nodeCache.set("generalInfoList", generalData, 3600);
    }

    // Create a list or transform if needed
    const list = [generalData];

    // Return success response
    return res.status(200).json({
      status: true,
      message: "General information list fetched successfully",
      data: {
        list,
      },
    });
  } catch (error) {
    console.error("homepage error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
const getDetailById = async (req, res) => {
  try {
    const { userId, roleId, id } = req.body;

    // Validate input
    if (!userId || !roleId || !id) {
      return res.status(400).json({
        status: false,
        message: "userId and role are required",
      });
    }

    //  Auth check
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid token",
      });
    }

    // Return success response
    return res.status(200).json({
      status: true,
      message: "General information list fetched successfully",
      
    });
  } catch (error) {
    console.error("homepage error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { getList, getDetailById };
