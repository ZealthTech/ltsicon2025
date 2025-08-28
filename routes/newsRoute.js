const express = require("express");
const FILE = require("../middleware/multer");
const NEWS = express.Router();
const news = require("../controllers/newsController");

NEWS.post("/upload-news", FILE.newsImageUpload, news.newsUpload);
NEWS.post("/fetch-news", news.fetchNews);

module.exports = NEWS;
