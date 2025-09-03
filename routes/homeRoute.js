const express = require("express");
const JWT = require("../middleware/auth");
const homeData = express.Router();
const HOME = require("../controllers/homeController");

homeData.post("/data", JWT.verifyToken([3]), HOME.homepage);

module.exports = homeData;
