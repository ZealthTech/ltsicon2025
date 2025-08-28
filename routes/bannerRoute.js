const express = require("express");
const FILE = require("../middleware/multer");
const BANNER = express.Router();
const banner = require("../controllers/bannerController");

BANNER.post("/upload-banner", FILE.bannerImageUpload, banner.bannerUpload);
BANNER.post("/fetch-banner", banner.fetchBanner);

module.exports = BANNER;
