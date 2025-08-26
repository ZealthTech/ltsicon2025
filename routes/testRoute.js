const express = require("express");

const test = express.Router();

const TEST = require("../controllers/testController");

test.get("/", TEST.testController);

module.exports = test;