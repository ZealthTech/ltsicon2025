require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;
const fs = require("fs");
const path = require("path");

const profileUpload = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    if (
      !req.files ||
      !req.files.profileImage ||
      req.files.profileImage.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "No profile image uploaded!",
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "User ID is required",
      });
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { userId: Number(userId) },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found",
      });
    }

    // Handle file path
    const absolutePath = req.files.profileImage[0].path;
    const relativePath = absolutePath.split("uploads")[1].replace(/\\/g, "/");
    const profileImageDB = `/uploads${relativePath}`;
    const profileImagePath = `${BASE_URL_IMG}/uploads${relativePath}`;

    // Update existing profile
    const profile = await prisma.user.update({
      where: { userId: Number(userId) },
      data: {
        profileImage: profileImageDB,
      },
    });
    const responseData = {
      ...profile,
      profileImage: profileImagePath,
    };
    res.status(200).json({
      status: true,
      message: "Profile image updated successfully!",
      data: responseData,
    });
  } catch (error) {
    console.error("Profile upload error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = { profileUpload };
