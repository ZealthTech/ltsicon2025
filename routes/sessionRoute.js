const express = require("express");
const SESSION = express.Router();
const session = require("../controllers/sessionController");
const JWT = require("../middleware/auth");

SESSION.post(
  "/fetch-session",
  JWT.verifyToken([3]),
  session.fetchSession,
);
SESSION.post(
  "/my-session",
  JWT.verifyToken([3]),
  session.mySession,
);
SESSION.post(
  "/joined-session",
  JWT.verifyToken([3]),
  session.joinSession,
);
SESSION.get(
  "/get-speciality",
  session.speciality,
);
SESSION.get(
  "/get-session",
  session.sessionList,
);
SESSION.get(
  "/get-days",
  session.days,
);
SESSION.get(
  "/get-rooms",
  session.rooms,
);

module.exports = SESSION;