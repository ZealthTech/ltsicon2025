const express = require("express");

const user = express.Router();

const USER = require("../controllers/userController")

user.post("/signup-otp-send", USER.signupSendOtp);
user.post("/signup-otp-verify", USER.signupOtpVerify);
user.post("/signup-form", USER.signupForm);

user.post("/login-email-send-otp", USER.loginwithEmailSendOtp);
user.post("/login-email-otp-verify", USER.loginwithEmailOtpVerify);

user.post("/login-ltsinumber-send-otp", USER.loginwithLtsiNumberSendOtp);
user.post("/login-ltsinumber-otp-verify", USER.loginwithLtsiNumberOtpVerify);

module.exports = user;