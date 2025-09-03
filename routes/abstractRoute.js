const express = require("express");
const FILE = require("../middleware/multer");
const ABSTRACT = express.Router();
const abs = require("../controllers/abstractController");
const JWT = require("../middleware/auth");

ABSTRACT.post("/upload-abstract",JWT.verifyToken([3]), FILE.abstractUpload, abs.uploadAbstract);
ABSTRACT.post("/fetch-detail", JWT.verifyToken([3]), abs.fetchAbstractDetail);
ABSTRACT.delete("/delete-abstract", JWT.verifyToken([3]), abs.deleteAbstract);

module.exports = ABSTRACT;
