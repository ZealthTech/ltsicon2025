require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;

const generateAbstractSubmissionId = async () => {
  let absId;
  let exists = true;

  while (exists) {
    // Generate a 4-digit random number (1000–9999)
    const number = Math.floor(1000 + Math.random() * 9000);
    absId = `ABS${number}`;

    // Check uniqueness in DB
    exists = await prisma.absSubmission.findFirst({
      where: { abstractSubmissionId: absId }, // adjust field name
    });
  }

  return absId;
};

const uploadAbstract = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const {
      submissionId,
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
      submissionStatus, // "DRAFT" or "SAVE"
    } = req.body;

    // Validation for required fields
    if (
      !userId ||
      !categoryId ||
      !themeId ||
      !abstractTitle ||
      !abstractDetail ||
      !keywords ||
      !authorDetails ||
      !submissionStatus ||
      IsConflictofInterest === undefined
    ) {
      return res
        .status(400)
        .json({ status: false, message: "All fields are required." });
    }
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }
    // Abstract word count check
    const wordCount = abstractDetail.trim().split(/\s+/).length;
    if (wordCount > 300) {
      return res.status(400).json({
        status: false,
        message: "Abstract detail cannot exceed 300 words.",
      });
    }

    // Keywords validation (max 5)
    const keywordArray = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywordArray.length > 5) {
      return res
        .status(400)
        .json({ status: false, message: "Maximum of 5 keywords allowed." });
    }

    // Fetch category name
    const categoryNameObject = await prisma.absCategory.findUnique({
      where: { id: Number(categoryId) },
      select: { category: true },
    });
    const categoryName = categoryNameObject
      ? categoryNameObject.category
      : null;
    // Fetch theme name
    const themeNameObject = await prisma.absTheme.findUnique({
      where: { themeId: Number(themeId) },
      select: { themeName: true },
    });
    const themeName = themeNameObject ? themeNameObject.themeName : null;

    // Handle file path
    if (
      !req.files ||
      !req.files.abstractFile ||
      !req.files.abstractFile.length
    ) {
      return res.status(404).json({
        status: false,
        message: "File not found.",
      });
    }
    const absolutePath = req.files.abstractFile[0].path;
    const relativePath = absolutePath.split("uploads")[1].replace(/\\/g, "/");
    const abstractFileDB = `/uploads${relativePath}`;
    const abstractFilePath = `${BASE_URL_IMG}/uploads${relativePath}`;

    // Parse author details
    let parsedAuthors = [];
    try {
      parsedAuthors =
        typeof authorDetails === "string"
          ? JSON.parse(authorDetails)
          : authorDetails;
    } catch (e) {
      console.error("Failed to parse authorDetails:", e, authorDetails);
      return res.status(400).json({
        status: false,
        message: "Invalid authorDetails format",
      });
    }

    if (!Array.isArray(parsedAuthors) || parsedAuthors.length === 0) {
      return res.status(400).json({
        status: false,
        message: "At least one author is required.",
      });
    }

    let submission;

    if (submissionId) {
      // Existing submission (draft or draft->save)
      const existingSubmission = await prisma.absSubmission.findUnique({
        where: { userId: Number(userId), submissionId: Number(submissionId) },
      });

      if (!existingSubmission) {
        return res.status(404).json({
          status: false,
          message: "Submission not found.",
        });
      }

      // Generate abstractSubmissionId if not already set
      const abstractSubmissionId =
        existingSubmission.abstractSubmissionId ||
        (await generateAbstractSubmissionId());

      // Update submission
      submission = await prisma.$transaction(async (prisma) => {
        const updatedSub = await prisma.absSubmission.update({
          where: { submissionId: Number(submissionId) },
          data: {
            userId: Number(userId),
            categoryId: categoryName,
            subCategoryId,
            themeName,
            abstractSubmissionId,
            abstractTitle,
            abstractDetail,
            keywords: keywordArray.join(","),
            abstractFile: abstractFileDB,
            IsConflictofInterest: Number(IsConflictofInterest) || 0,
            message,
            submissionStatus,
            status: submissionStatus === "SAVE" ? 1 : 0,
            createdOn: new Date(),
          },
          include: {
            authors: true,
          },
        });

        // Delete old authors
        await prisma.absAuthor.deleteMany({
          where: { submissionId: updatedSub.submissionId },
        });

        // Insert authors
        await prisma.absAuthor.createMany({
          data: parsedAuthors.map((a) => ({
            submissionId: updatedSub.submissionId,
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

        return updatedSub;
      });
    } else {
      // New submission (either draft or save)
      const abstractSubmissionId = await generateAbstractSubmissionId();

      submission = await prisma.absSubmission.create({
        data: {
          userId: Number(userId),
          categoryId: categoryName,
          subCategoryId,
          themeName,
          abstractSubmissionId,
          abstractTitle,
          abstractDetail,
          keywords: keywordArray.join(","),
          abstractFile: abstractFileDB,
          IsConflictofInterest: Number(IsConflictofInterest) || 0,
          message,
          submissionStatus,
          status: submissionStatus === "SAVE" ? 1 : 0,
          createdOn: new Date(),
          authors: {
            create: parsedAuthors.map((a) => ({
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
          },
        },
        include: {
          authors: true, // <- this ensures the returned submission object includes all authors
        },
      });
    }
    const responseData = {
      ...submission,
      abstractFile: abstractFilePath,
    };
    return res.status(200).json({
      status: true,
      message:
        submissionStatus === "DRAFT"
          ? "Abstract saved as draft successfully."
          : "Abstract submitted successfully.",
      data: responseData,
    });
  } catch (err) {
    console.error("Abstract submission error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const fetchAbstractList = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId } = req.body;

    // 1. Validation
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }
    console.log("req.user.userId",req.body.userId)
    console.log("req.user.userId11",req.user.userId)
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }
    // 2. Fetch submission with authors + user info
    const submission = await prisma.absSubmission.findMany({
      where: {
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
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
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
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
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
  fetchAbstractList,
  fetchAbstractDetail,
  deleteAbstract,
};
