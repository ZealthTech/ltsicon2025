const express = require("express");
const FILE = require("../middleware/multer");
const SESSION = express.Router();
const session = require("../controllers/sessionController");
const JWT = require("../middleware/auth");

SESSION.post(
  "/fetch-session",
  JWT.verifyToken([3]),
  session.fetchSession,
);
SESSION.post(
  "/joined-session",
  JWT.verifyToken([3]),
  session.joinSession,
);

module.exports = SESSION;