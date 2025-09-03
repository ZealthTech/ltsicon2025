const express = require("express");
const user = require("./userRoute");
const test = require("./testRoute");
const utility = require("./utilityRoute");
const home = require("./homeRoute");
const banner = require("./bannerRoute");
const registration = require("./registrationRoute");
const abstract = require("./abstractRoute");
const profile = require("./profileeRoute");
const payment = require("./paymentRoute");
const news = require("./newsRoute");
const router = express.Router();

router.use("/", test); // Handle / routes
router.use("/user", user); // Handle /user routes
router.use("/utility", utility); // Handle /user routes
router.use("/home", home); // Handle /user routes
router.use("/banner", banner); // Handle /user routes
router.use("/news", news); // Handle /user routes
router.use("/registration", registration); // Handle /user routes
router.use("/abstract", abstract); // Handle /user routes
router.use("/profile", profile); // Handle /user routes
router.use("/payment", payment); // Handle /user routes

module.exports = router;
