const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseUploadDir = path.join(__dirname, "../uploads");

// Generate a folder path dynamically based on field name
const generateFolderPath = (fieldname) => {
  const folderMap = {
    bannerImage: "bannerImages",
    newsImage: "newsImages",
    abstractFile: "abstractFiles",
    profileImage: "profileImages",
  };

  return path.join(baseUploadDir, folderMap[fieldname] || "others");
};

// Ensure a folder exists before saving a file
const createFolderIfNeeded = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Shared allowed file types
const allowedTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/avif",
  "image/webp",
  "image/gif",

  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Videos
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/x-matroska", // .mkv
  "video/webm",
  "video/mpeg",
];

// Factory function to create multer uploaders dynamically
const createUploader = (fields) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folderPath = generateFolderPath(file.fieldname);
      createFolderIfNeeded(folderPath);
      cb(null, folderPath);
    },
    filename: (req, file, cb) => {
      const extArray = file.mimetype.split("/");
      const extension = extArray[extArray.length - 1];
      const uniqueName = `${file.fieldname}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type! Only images, PDFs, and DOC/DOCX files are allowed."
        ),
        false
      );
    }
  };

  return multer({ storage, fileFilter }).fields(fields);
};

// Example usage
const bannerImageUpload = createUploader([
  { name: "bannerImage", maxCount: 1 },
]);
const newsImageUpload = createUploader([{ name: "newsImage", maxCount: 1 }]);
const abstractUpload = createUploader([{ name: "abstractFile", maxCount: 1 }]);
const profileImageUpload = createUploader([{ name: "profileImage", maxCount: 1 }]);

module.exports = {
  bannerImageUpload,
  newsImageUpload,
  abstractUpload,
  profileImageUpload
};
