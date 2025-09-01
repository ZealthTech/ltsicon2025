require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const uploadAbstract = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const {
      submissionId, // for updating draft
      userId,
      categoryId,
      subCategoryId,
      themeId,
      abstractTitle,
      abstractDetail,
      keywords,
      authorDetails,
      IsConflictofInterest,
      message,
      abstractFile, // single file for PDF/image/video
      submissionStatus, // "DRAFT" or "SAVE"
    } = req.body;

    // 1. Validation
    if (
      !userId ||
      !categoryId ||
      !themeId ||
      !abstractTitle ||
      !abstractDetail ||
      !keywords ||
      !authorDetails ||
      !submissionStatus ||
      !IsConflictofInterest
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required.",
      });
    }
    // 2. Abstract word count (max 300 words)
    const wordCount = abstractDetail.trim().split(/\s+/).length;
    if (wordCount > 300) {
      return res.status(400).json({
        status: false,
        message: "Abstract detail cannot exceed 300 words.",
      });
    }

    // 3. Keywords validation (max 5)
    const keywordArray = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywordArray.length > 5) {
      return res
        .status(400)
        .json({ status: false, message: "Maximum of 5 keywords allowed." });
    }

    // 4. File type validation (PDF/Image/Video)
    const allowedExtensions = [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".mp4",
      ".mov",
      ".avi",
      ".mkv",
      ".webm",
    ];
    const fileExt = abstractFile
      ? abstractFile.substring(abstractFile.lastIndexOf(".")).toLowerCase()
      : "";

    console.log("fileExt11", fileExt);
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({
        status: false,
        message:
          "Only PDF, image, or video files are allowed for abstractFile.",
      });
    }
    console.log("fileExt", fileExt);
    const themeName = await prisma.absTheme.findUnique({
      where: { themeId: Number(themeId) },
      select: { themeName: true },
    });
    // 5. Create new submission or update draft
    let submission;

    if (submissionId && submissionStatus === "DRAFT") {
      // Update existing draft
      submission = await prisma.absSubmission.update({
        where: { submissionId: Number(submissionId) },
        data: {
          userId: Number(userId),
          categoryId,
          subCategoryId,
          themeName,
          abstractTitle,
          abstractDetail,
          keywords: keywordArray.join(","),
          abstractFile,
          IsConflictofInterest: Number(IsConflictofInterest) || 0,
          message,
          submissionStatus,
          status: 0, // draft
          createdOn: new Date(),
        },
      });

      // Delete old authors and re-insert
      await prisma.absAuthor.deleteMany({
        where: { submissionId: submission.submissionId },
      });
      await prisma.absAuthor.createMany({
        data: authorDetails.map((a) => ({
          submissionId: submission.submissionId,
          title: a.title,
          firstName: a.firstName,
          lastName: a.lastName,
          designation: a.designation,
          institution: a.institution,
          country: a.country,
          phone: a.phone,
          email: a.email,
          isPresentingAuthor: a.isPresentingAuthor,
          correspondingAuthor: a.correspondingAuthor,
          status: 1,
        })),
      });
    } else {
      // New submission or final save
      submission = await prisma.absSubmission.create({
        data: {
          userId: Number(userId),
          categoryId,
          subCategoryId,
          themeName,
          abstractTitle,
          abstractDetail,
          keywords: keywordArray.join(","),
          abstractFile,
          IsConflictofInterest: Number(IsConflictofInterest) || 0,
          message,
          submissionStatus,
          status: submissionStatus === "SAVE" ? 1 : 0,
          createdOn: new Date(),
        },
      });

      await prisma.absAuthor.createMany({
        data: authorDetails.map((a) => ({
          submissionId: submission.submissionId,
          title: a.title,
          firstName: a.firstName,
          lastName: a.lastName,
          designation: a.designation,
          institution: a.institution,
          country: a.country,
          phone: a.phone,
          email: a.email,
          isPresentingAuthor: a.isPresentingAuthor,
          correspondingAuthor: a.correspondingAuthor,
          status: 1,
        })),
      });
    }

    return res.status(200).json({
      status: true,
      message:
        submissionStatus === "DRAFT"
          ? "Abstract saved as draft successfully."
          : "Abstract submitted successfully.",
      data: submission,
    });
  } catch (err) {
    console.error("Abstract submission error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const fetchAbstractDetail = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, submissionId } = req.body;

    // 1. Validation
    if (!userId || !submissionId) {
      return res.status(400).json({
        status: false,
        message: "userId and submissionId are required",
      });
    }

    // 2. Fetch submission with authors + user info
    const submission = await prisma.absSubmission.findFirst({
      where: {
        submissionId: Number(submissionId),
        userId: Number(userId),
      },
      include: {
        authors: true,
        user: {
          select: {
            userId: true,
            roleId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            gender: true,
            country: true,
            medicalCouncilNumber: true,
            isLTSI: true,
            LTSINumber: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({
        status: false,
        message: "No submission found for this user",
      });
    }

    // 3. Response
    return res.status(200).json({
      status: true,
      message: "Abstract details fetched successfully",
      data: submission,
    });
  } catch (err) {
    console.error("fetchAbstractDetail API error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};
const deleteAbstract = async (req, res) => {
  try {
    if (req.method !== "DELETE") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, submissionId } = req.body;

    // 1. Validation
    if (!userId || !submissionId) {
      return res.status(400).json({
        status: false,
        message: "userId and submissionId are required",
      });
    }

    // 2. Check if submission exists and belongs to this user
    const submission = await prisma.absSubmission.findFirst({
      where: {
        submissionId: Number(submissionId),
        userId: Number(userId),
      },
    });

    if (!submission) {
      return res.status(404).json({
        status: false,
        message: "Abstract not found for this user",
      });
    }

    // 3. Delete related authors first
    await prisma.absAuthor.deleteMany({
      where: { submissionId: Number(submissionId) },
    });

    // 4. Delete submission
    await prisma.absSubmission.delete({
      where: { submissionId: Number(submissionId) },
    });

    return res.status(200).json({
      status: true,
      message: "Abstract deleted successfully",
    });
  } catch (err) {
    console.error("deleteAbstract API error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  uploadAbstract,
  fetchAbstractDetail,
  deleteAbstract,
};
