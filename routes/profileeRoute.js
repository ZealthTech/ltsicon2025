const express = require("express");
const FILE = require("../middleware/multer");
const PROFILE = express.Router();
const profile = require("../controllers/profileController");
const JWT = require("../middleware/auth");

PROFILE.post(
  "/upload-profile",
  JWT.verifyToken([3]),
  FILE.profileImageUpload,
  profile.profileUpload
);

module.exports = PROFILE;
