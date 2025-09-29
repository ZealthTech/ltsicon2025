const express = require("express");
const FILE = require("../middleware/multer");
const NEWS = express.Router();
const news = require("../controllers/newsController");
const JWT = require("../middleware/auth");

NEWS.post(
  "/upload-news",
  FILE.newsImageUpload,
  news.newsUpload
);
NEWS.post("/fetch-news-detail", JWT.verifyToken([3]), news.fetchNewsDetail);

module.exports = NEWS;
