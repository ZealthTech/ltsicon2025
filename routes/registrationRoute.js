const express = require("express");
const REGISTRATION = express.Router();
const form = require("../controllers/registrationController");
const JWT = require("../middleware/auth");

REGISTRATION.post(
  "/upload-personal-info",
  JWT.verifyToken([3]),
  form.personalInfo
);
REGISTRATION.post(
  "/upload-professional-info",
  JWT.verifyToken([3]),
  form.professionalInfo
);
REGISTRATION.post(
  "/upload-conference-info",
  JWT.verifyToken([3]),
  form.conferenceInfo
);
REGISTRATION.post(
  "/upload-workshop-info",
  JWT.verifyToken([3]),
  form.workshopInfo
);
REGISTRATION.post(
  "/upload-accomodation-info",
  JWT.verifyToken([3]),
  form.accomodationInfo
);
REGISTRATION.post("/all-info", form.allInfo);

module.exports = REGISTRATION;
