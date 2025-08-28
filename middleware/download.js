const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function downloadImage(imageUrl, userEmail) {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    // Define storage folder (make sure it exists)
    const uploadDir = path.join(__dirname,".." ,"uploads", "profileImages");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Unique filename, e.g. email + timestamp
    const ext = path.extname(imageUrl) || ".jpg";
    const fileName = `${userEmail}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Save image locally
    fs.writeFileSync(filePath, response.data);

    // Return relative path (for DB)
    return `/uploads/profileImages/${fileName}`;
  } catch (err) {
    console.error("Image download failed:", err.message);
    return null; // fallback if no image
  }
}
module.exports = { downloadImage };