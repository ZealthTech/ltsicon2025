const express = require("express");
const user = require("./userRoute");
const test = require("./testRoute");
const router = express.Router();

router.use("/", test); // Handle / routes
router.use("/user", user); // Handle /user routes

module.exports = router;
