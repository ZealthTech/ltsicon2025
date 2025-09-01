const express = require("express");

const route = express.Router();

const UTILITY = require("../controllers/utilityController")

route.get("/fetch-title", UTILITY.title);
route.get("/fetch-speciality", UTILITY.speciality);
route.get("/fetch-country", UTILITY.countryList);
route.get("/fetch-workshop", UTILITY.workshop);
route.get("/fetch-accomodation", UTILITY.accomodation);
route.get("/fetch-conferencefees", UTILITY.conferenceFees);
route.get("/fetch-abstheme", UTILITY.abstractTheme);
route.get("/fetch-abscategory", UTILITY.abstractCategory);

module.exports = route;