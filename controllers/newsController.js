require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const newsUpload = async (req, res) => {
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
      !req.files.newsImage ||
      req.files.newsImage.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "No news image uploaded!",
      });
    }

    const { title, description, sequence, status } = req.body;

    const absolutePath = req.files.newsImage[0].path;
    // Convert to relative path starting from "uploads"
    const relativePath = absolutePath.split("uploads")[1].replace(/\\/g, "/");
    const newsImageDB = `/uploads${relativePath}`;
    const newsImagePath = `${BASE_URL_IMG}/uploads${relativePath}`;
    console.log("newsImagePath", newsImagePath);

    // Save in database
    const News = await prisma.news.create({
      data: {
        title,
        description,
        newsImage: newsImageDB,
        sequence: sequence ? Number(sequence) : null,
        status: status ? Number(status) : 1,
      },
    });
    const responseData = {
      ...News,
      newsImage: newsImagePath,
    };
    res.status(201).json({
      status: true,
      message: "NewsImage uploaded successfully!",
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
const fetchNews = async (req, res) => {
  try {
    res.send("LTSI is Working Fine");
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = { newsUpload, fetchNews };
