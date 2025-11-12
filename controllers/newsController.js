require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;

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

    const { title, description, speakerName, speakerDetail, eventDate, time, venue, sequence, status } = req.body;

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
        speakerName,
        speakerDetail,
        eventDate,
        time,
        venue,
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
const fetchNewsDetail = async (req, res) => {
  try {
    const { id } = req.body;

    // validate id
    if (!id) {
      return res.status(400).json({
        status: false,
        message: "News ID is required",
      });
    }

    console.log("id", id);

    // fetch news from db
    const news = await prisma.news.findUnique({
      where: { id: Number(id) }, // cast to Number if id is int in schema
    });

    if (!news) {
      return res.status(404).json({
        status: false,
        message: "News not found",
      });
    }
    const updatedData = { ...news, newsImage: news.newsImage ? `${BASE_URL_IMG}${news.newsImage}` : null };
    console.log("news", news);

    // success
    res.status(200).json({
      status: true,
      message: "News fetched successfully",
      data: updatedData,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};


module.exports = { newsUpload, fetchNewsDetail };
