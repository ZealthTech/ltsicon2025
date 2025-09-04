const express = require("express");
const JWT = require("../middleware/auth");
const ALBUM = express.Router();
const FILE = require("../middleware/multer");
const gallery = require("../controllers/albumController");

ALBUM.post("/upload-album", FILE.albumUpload, gallery.uploadAlbum);
ALBUM.post(
  "/fetch-album-list",
  JWT.verifyToken([1, 3]),
  gallery.fetchAlbumList
);
ALBUM.post("/fetch-album-detail",JWT.verifyToken([1, 3]), gallery.fetchAlbumDetail);

module.exports = ALBUM;
