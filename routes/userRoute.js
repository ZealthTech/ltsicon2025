const express = require("express");

const user = express.Router();

const USER = require("../controllers/userController")

user.post("/signup-otp-send", USER.signupSendOtp);
user.post("/signup-otp-verify", USER.signupOtpVerify);
user.post("/signup-form", USER.signupForm);

module.exports = user;