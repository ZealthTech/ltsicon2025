const express = require("express");
const JWT = require("../middleware/auth");
const general = express.Router();
const Info = require("../controllers/generalInfoController");

general.post("/get-list", JWT.verifyToken([3]), Info.getList);
general.post("/detail-list", JWT.verifyToken([3]), Info.getDetailById);

module.exports = general;
