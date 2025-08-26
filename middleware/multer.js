const multer = require("multer");
const path = require("path");
const fs = require("fs");
const baseUploadDir = path.join(__dirname, "../uploads");

// This function generates a custom folder for each document type
const generateFolderPath = (fieldname) => {
  // Custom logic for folder names, you can change this as needed
  switch (fieldname) {
    case "aadhaarCard":
      return path.join(baseUploadDir, `aadhaarCard`);
    case "signature":
      return path.join(baseUploadDir, `signature`);
    case "medicalCouncilCertificate":
      return path.join(baseUploadDir, `medicalCouncilCertificate`);
    case "cv":
      return path.join(baseUploadDir, `cv`);
    case "screenshot":
      return path.join(baseUploadDir, `screenshot`);
    case "renewpayment":
      return path.join(baseUploadDir, `renewpayment`);
    case "profileImage":
      return path.join(baseUploadDir, `profileImage`);
    case "newsPdf":
      return path.join(baseUploadDir, `newsPdf`);
    case "file":
      return path.join(baseUploadDir, `file`);
    case "imageFile":
      return path.join(baseUploadDir, `imageFile`);
    case "thumbnail":
      return path.join(baseUploadDir, `thumbnail`);
    default:
      return baseUploadDir;
  }
};

// Create the dynamic folders for each document type if they don't exist
const createFolderIfNeeded = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};
const documentMemForm = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const folderPath = generateFolderPath(file.fieldname); // Dynamic folder name based on fieldname
      createFolderIfNeeded(folderPath); // Ensure the folder exists
      cb(null, folderPath); // Use dynamic folder path
    },
    filename: function (req, file, cb) {
      const extArray = file.mimetype.split("/");
      const extension = extArray[extArray.length - 1];
      const uniqueName = `${file.fieldname}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;
      cb(null, uniqueName); // Use unique file names
    },
  }),
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/avif",
      "image/webp",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

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
  },
});
const documentMemForms = documentMemForm.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "aadhaarCard", maxCount: 1 },
  { name: "signature", maxCount: 1 },
  { name: "medicalCouncilCertificate", maxCount: 1 },
  { name: "cv", maxCount: 1 },
]);

module.exports = {
  documentMemForms,
};
