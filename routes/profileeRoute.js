const express = require("express");
const FILE = require("../middleware/multer");
const PROFILE = express.Router();
const profile = require("../controllers/profileController");

PROFILE.post("/upload-profile", FILE.profileImageUpload, profile.profileUpload);

module.exports = PROFILE;
