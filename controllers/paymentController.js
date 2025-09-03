require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;

const paymentUpload = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    // Validate file upload
    if (
      !req.files ||
      !req.files.qrcodeImage ||
      req.files.qrcodeImage.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "No QR code image uploaded!",
      });
    }

    const {
      id,
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      branch,
      status,
    } = req.body;

    if (
      !bankName ||
      !accountNumber ||
      !ifscCode ||
      !accountHolderName ||
      !branch
    ) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be provided.",
      });
    }
    // Handle file path
    const absolutePath = req.files.qrcodeImage[0].path;
    const relativePath = absolutePath.split("uploads")[1].replace(/\\/g, "/");
    const qrcodeImageDB = `/uploads${relativePath}`;
    const qrcodeImagePath = `${BASE_URL_IMG}/uploads${relativePath}`;
    console.log("qrcodeImagePath", qrcodeImagePath);

    // Save in DB
    let paymentDetails;
    if (id) {
      paymentDetails = await prisma.paymentDetails.update({
        where: { id: Number(id) },
        data: {
          bankName,
          accountNumber,
          ifscCode,
          accountHolderName,
          branch,
          qrcodeImage: qrcodeImageDB, // store relative path in DB
          status: status ? Number(status) : 1,
        },
      });
    } else {
      paymentDetails = await prisma.paymentDetails.create({
        data: {
          bankName,
          accountNumber,
          ifscCode,
          accountHolderName,
          branch,
          qrcodeImage: qrcodeImageDB, // store relative path in DB
          status: status ? Number(status) : 1,
        },
      });
    }
    // Send full URL in response
    const responseData = {
      ...paymentDetails,
      qrcodeImage: qrcodeImagePath,
    };

    res.status(201).json({
      status: true,
      message: "Payment details uploaded successfully!",
      data: responseData,
    });
  } catch (error) {
    console.error("Payment upload error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const fetchpayment = async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const paymentDetails = await prisma.paymentDetails.findFirst({
      orderBy: { id: "desc" },
    });
    console.log(paymentDetails);
    // Map to include full image URL
    const responseData = {
      ...paymentDetails,
      qrcodeImage: `${BASE_URL_IMG}${paymentDetails.qrcodeImage}`,
    };

    res.status(200).json({
      status: true,
      message: "Payment details fetched successfully!",
      data: responseData,
    });
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = { paymentUpload, fetchpayment };
