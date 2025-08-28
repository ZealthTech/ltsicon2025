require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bannerUpload = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }
    // If multer failed or no file uploaded
    if (
      !req.files ||
      !req.files.bannerImage ||
      req.files.bannerImage.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "No banner image uploaded!",
      });
    }

    const { name, sequence, status } = req.body;

    const absolutePath = req.files.bannerImage[0].path;
    // Convert to relative path starting from "uploads"
    const relativePath = absolutePath.split("uploads")[1].replace(/\\/g, "/");
    const bannerImagePath = `/uploads${relativePath}`;
    console.log("banner", bannerImagePath);
    // Save in database
    const banner = await prisma.banner.create({
      data: {
        name: name,
        bannerImage: bannerImagePath,
        sequence: sequence ? Number(sequence) : null,
        status: status ? Number(status) : 1,
      },
    });

    res.status(201).json({
      status: true,
      message: "Banner uploaded successfully!",
      data: banner,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const fetchBanner = async (req, res) => {
  try {
    res.send("LTSI is Working Fine");
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = { bannerUpload, fetchBanner };
