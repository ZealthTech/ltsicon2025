const express = require("express");
const INVITED = express.Router();
const invitedM = require("../controllers/invitedMemberController");
const JWT = require("../middleware/auth");

INVITED.post("/fetch-invited-member-list", JWT.verifyToken([3]), invitedM.fetchMember);
INVITED.post("/fetch-invited-member-detail", JWT.verifyToken([3]), invitedM.fetchDetail);

module.exports = INVITED;
