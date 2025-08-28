const express = require("express");

const homeData = express.Router();

const HOME = require("../controllers/homeController");

homeData.post("/data", HOME.homepage);

module.exports = homeData;