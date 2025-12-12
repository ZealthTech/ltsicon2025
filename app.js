const express = require("express");
const helmet = require("helmet");
const xssClean = require("xss-clean");
const cors = require("cors");
const router = require("./routes");

require("dotenv").config();

const app = express();

// initialize cache middleware

const PORT = process.env.PORT || 3050;

app.use(helmet());
app.use(xssClean());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/public", express.static("public"));
app.use("/uploads/file", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); //  Critical
  next();
});

app.use("/uploads/bannerImages", express.static("uploads/bannerImages"));
app.use("/uploads/newsImages", express.static("uploads/newsImages"));
app.use("/uploads/profileImages", express.static("uploads/profileImages"));
app.use("/uploads/icons", express.static("uploads/icons"));
app.use("/uploads/abstractFiles", express.static("uploads/abstractFiles"));
app.use("/uploads/qrcodeImages", express.static("uploads/qrcodeImages"));
app.use("/uploads/albumImages", express.static("uploads/albumImages"));
app.use("/uploads/thumbnails", express.static("uploads/thumbnails"));
app.use("/uploads/generalInfo", express.static("uploads/generalInfo"));
app.use("/uploads/Logo", express.static("uploads/Logo"));
app.use("/uploads/photo", express.static("uploads/photo"));
app.use("/uploads/biodata", express.static("uploads/biodata"));
app.use(
  "/uploads/screenShots",
  express.static("uploads/screenShots")
);
// Set Content-Type headers based on file extensions
const contentTypeMap = {
  ".js": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".html": "text/html; charset=UTF-8",
  ".json": "application/json; charset=UTF-8", // optional, for APIs
};

app.use((req, res, next) => {
  const ext = Object.keys(contentTypeMap).find((ext) => req.url.endsWith(ext));
  if (ext) {
    res.setHeader("Content-Type", contentTypeMap[ext]);
  }
  next();
});


// Sample route
app.get("/", (req, res) => {
  res.send("LTSICON Server is running!");
});
app.use("/api", router);
app.listen(PORT, () => console.log(`LTSI Server running on port ${PORT}`));

module.exports = app;
