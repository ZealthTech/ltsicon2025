const express = require("express");
const user = require("./userRoute");
const test = require("./testRoute");
const utility = require("./utilityRoute");
const home = require("./homeRoute");
const banner = require("./bannerRoute");
const news = require("./newsRoute");
const router = express.Router();

router.use("/", test); // Handle / routes
router.use("/user", user); // Handle /user routes
router.use("/utility", utility); // Handle /user routes
router.use("/home", home); // Handle /user routes
router.use("/banner", banner); // Handle /user routes
router.use("/news", news); // Handle /user routes

module.exports = router;
