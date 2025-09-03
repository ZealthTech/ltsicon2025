const express = require("express");
const FILE = require("../middleware/multer");
const PAYMENT = express.Router();
const payment = require("../controllers/paymentController");

PAYMENT.post("/upload-payment", FILE.qrcodeImageUpload, payment.paymentUpload);
PAYMENT.get("/fetch-payment", payment.fetchpayment);

module.exports = PAYMENT;
