const express = require("express");
const JWT = require("../middleware/auth");

const user = express.Router();

const USER = require("../controllers/userController")
const Notify = require("../controllers/notificationController")

user.post("/signup-otp-send", USER.signupSendOtp);
user.post("/signup-otp-verify", USER.signupOtpVerify);
user.post("/signup-form", USER.signupForm);

user.post("/login-email-send-otp", USER.loginwithEmailSendOtp);
user.post("/login-email-otp-verify", USER.loginwithEmailOtpVerify);

user.post("/login-ltsinumber-send-otp", USER.loginwithLtsiNumberSendOtp);
user.post("/login-ltsinumber-otp-verify", USER.loginwithLtsiNumberOtpVerify);
user.post("/update-fcm", JWT.verifyToken([3]), USER.updateFCM);
user.post("/send-notification",  Notify.adminSendNotification);
console.log("first")
user.delete("/delete-user", USER.deleteUser);

module.exports = user;