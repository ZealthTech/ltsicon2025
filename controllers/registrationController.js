require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;

const generateBookingNumber = async () => {
  let number;
  let exists = true;

  while (exists) {
    number = Math.floor(1000 + Math.random() * 9000); // 1000–9999
    // check if already exists
    exists = await prisma.booking.findFirst({
      where: { bookingNumber: number.toString() },
    });
  }

  return number.toString();
};
//step 1
const personalInfo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const {
      userId,
      roleId,
      firstName,
      lastName,
      email,
      phone,
      gender,
      country,
      medicalCouncilNumber,
      isLTSI,
      LTSINumber,
    } = req.body;

    if (
      !userId ||
      !roleId ||
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !gender ||
      !country ||
      !medicalCouncilNumber ||
      !isLTSI
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }

    // Perform UPSERT
    const updatedUser = await prisma.user.upsert({
      where: { email },
      update: {
        roleId,
        firstName,
        lastName,
        email,
        phone,
        gender,
        country,
        medicalCouncilNumber,
        isLTSI,
        LTSINumber,
        status: 1,
        createdOn: new Date(),
      },
      create: {
        userId: Number(userId),
        roleId,
        firstName,
        lastName,
        email,
        phone,
        gender,
        country,
        medicalCouncilNumber,
        isLTSI,
        LTSINumber,
        status: 1,
        createdOn: new Date(),
      },
    });

    return res.status(200).json({
      status: true,
      message: "Personal Info saved successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("personal info error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

//step 2
const professionalInfo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId, speciality, designation, hospitalName, hospitalAddress } =
      req.body;

    // 1. Validation
    if (
      !userId ||
      !speciality ||
      !designation ||
      !hospitalName ||
      !hospitalAddress
    ) {
      return res.status(400).json({
        status: false,
        message:
          "userId, speciality, designation, hospitalName and hospitalAddress are required",
      });
    }

    // 2. Ensure user exists
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });
    if (!user) {
      return res.status(401).json({ status: false, message: "User not found" });
    }
    console.log("user", user);
    // 3. Update user's speciality
    const updatedUser = await prisma.user.update({
      where: { userId: Number(userId) },
      data: { specialityDepartment: speciality },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        specialityDepartment: true,
        country: true,
        gender: true,
        medicalCouncilNumber: true,
        isLTSI: true,
        LTSINumber: true,
      },
    });
    console.log("updatedUser", updatedUser);
    // 4. Upsert employment record
    // 3. Check if employment record exists for user
    let employment = await prisma.employment.findFirst({
      where: { userId: Number(userId) },
    });

    if (employment) {
      // update using employmentId (the PK)
      employment = await prisma.employment.update({
        where: { employmentId: employment.employmentId },
        data: {
          designation,
          hospitalName,
          hospitalAddress,
          createdOn: new Date(), // maybe use updatedOn instead if you add one
        },
      });
    } else {
      // create new employment
      employment = await prisma.employment.create({
        data: {
          userId: Number(userId),
          designation,
          hospitalName,
          hospitalAddress,
          createdOn: new Date(),
        },
      });
    }

    // 5. Return response
    return res.status(200).json({
      status: true,
      message: "Professional Info updated successfully.",
      data: { user: updatedUser, employment },
    });
  } catch (err) {
    console.error("Professional info error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

//step 3
const conferenceInfo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const {
      userId,
      memberType,
      memberTypeFee,
      accompanyingPersonName,
      accompanyingPersonfee,
    } = req.body;

    // 1. Validation
    if (!userId || !memberType || !memberTypeFee) {
      return res.status(400).json({
        status: false,
        message: "userId, memberType, memberTypeFee are required",
      });
    }

    // 2. Check if user exists
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found",
      });
    }
    const bookingNumber = await generateBookingNumber();
    // 3. Check if booking already exists for this user
    let booking = await prisma.booking.findFirst({
      where: { userId: Number(userId) },
    });

    if (booking) {
      // Update existing booking
      booking = await prisma.booking.update({
        where: { bookingId: booking.bookingId },
        data: {
          memberType,
          memberTypeFee,
          accompanyingPersonName,
          accompanyingPersonfee,
          updatedOn: new Date(),
        },
      });
    } else {
      // Create new booking
      booking = await prisma.booking.create({
        data: {
          userId: Number(userId),
          bookingNumber: bookingNumber, // unique booking number
          memberType,
          memberTypeFee,
          accompanyingPersonName,
          accompanyingPersonfee,
          createdOn: new Date(),
        },
      });
    }

    // 4. Return response
    return res.status(200).json({
      status: true,
      message: "Conference Info saved successfully.",
      data: booking,
    });
  } catch (err) {
    console.error("Conference info error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

//step 4
const workshopInfo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId, bookingId, workshops = [] } = req.body; // workshops = array of { name, fee }

    // 1. Validation
    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "userId is required" });
    }

    // 2. User check
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });
    if (!user)
      return res.status(401).json({ status: false, message: "User not found" });

    // 3. Booking check
    let booking = await prisma.booking.findFirst({
      where: { userId: Number(userId), bookingId: Number(bookingId) },
    });
    if (!booking)
      return res
        .status(400)
        .json({ status: false, message: "No booking found for this user" });

    // 4. Payment check
    if (
      !booking.memberType ||
      !booking.memberTypeFee ||
      booking.memberTypeFee === "0"
    ) {
      return res.status(400).json({
        status: false,
        message: "Pay conference fee first to choose workshop",
      });
    }

    // 5. Insert workshops
    const bookingNumber = await generateBookingNumber();
    let insertedWorkshops = [];
    let totalWorkshopFee = 0;

    if (bookingId && bookingId > 0) {
      // Existing bookingId provided
      if (workshops.length > 0) {
        insertedWorkshops = await Promise.all(
          workshops.map(({ name, fee }) =>
            prisma.bookingDetail.create({
              data: {
                user: { connect: { userId: booking.userId } },
                booking: { connect: { bookingId: Number(bookingId) } },
                workshop: name,
                workshopFee: Number(fee),
              },
            })
          )
        );
      }
    } else {
      // No bookingId -> create new booking first
      if (workshops.length > 0) {
        booking = await prisma.booking.create({
          data: {
            userId: Number(userId),
            bookingNumber,
            createdOn: new Date(),
          },
        });

        insertedWorkshops = await Promise.all(
          workshops.map(({ name, fee }) =>
            prisma.bookingDetail.create({
              data: {
                user: { connect: { userId: booking.userId } },
                booking: { connect: { bookingId: booking.bookingId } },
                workshop: name,
                workshopFee: Number(fee),
              },
            })
          )
        );

        // 6. Calculate total workshop fee
        totalWorkshopFee = workshops.reduce(
          (sum, { fee }) => sum + Number(fee || 0),
          0
        );

        // 7. Update booking table with totalPayment
        booking = await prisma.booking.update({
          where: { bookingId: booking.bookingId },
          data: {
            totalPayment: Number(totalWorkshopFee), // assuming `totalPayment` column exists
          },
        });
      }
    }

    // 7. Response
    return res.status(200).json({
      status: true,
      message:
        insertedWorkshops.length > 0
          ? "Workshop(s) added successfully"
          : "No workshops provided",
      data: { insertedWorkshops, totalWorkshopFee },
    });
  } catch (err) {
    console.error("Workshop info error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

//step 5
const accomodationInfo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const {
      userId,
      bookingId,
      accommodation,
      accommodationFee,
      checkin,
      checkout,
      nights,
      totalPayment,
    } = req.body;

    // 1. Validation
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    // 2. Check if user exists
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // 3. If bookingId is 0 or not provided → create new accommodation
    if (!bookingId || bookingId === 0) {
      const bookingNumber = await generateBookingNumber();

      const newBooking = await prisma.booking.create({
        data: {
          userId: Number(userId),
          accommodation,
          accommodationFee,
          bookingNumber,
          checkin,
          checkout,
          nights,
          totalPayment: Number(totalPayment),
          createdOn: new Date(),
        },
      });

      return res.status(200).json({
        status: true,
        message: "Accommodation added successfully",
        data: newBooking,
      });
    }

    // 4. If bookingId exists → update existing accommodation
    const existingBooking = await prisma.booking.findUnique({
      where: { bookingId: Number(bookingId) },
    });

    if (!existingBooking) {
      return res.status(404).json({
        status: false,
        message: "Booking not found for this bookingId",
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { bookingId: Number(bookingId) },
      data: {
        accommodation,
        accommodationFee,
        checkin,
        checkout,
        nights,
        totalPayment: Number(totalPayment),
        createdOn: new Date(),
      },
    });

    return res.status(200).json({
      status: true,
      message: "Accommodation updated successfully",
      data: updatedBooking,
    });
  } catch (err) {
    console.error("Accommodation info error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

//step 6
const allInfo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId, bookingId } = req.body;

    if (!userId || !bookingId) {
      return res
        .status(400)
        .json({ status: false, message: "userId and bookingId are required" });
    }

    // Fetch user and filter bookings by bookingId
    const userData = await prisma.user.findUnique({
      where: { userId: Number(userId) },
      include: {
        bookings: {
          where: { bookingId: Number(bookingId) }, // filter here
          include: {
            bookingDetails: true, // workshops
          },
        },
        employments: true, // professional info
      },
    });

    if (!userData) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Optional: If user exists but bookingId doesn't exist
    if (userData.bookings.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found for this user" });
    }

    return res.status(200).json({
      status: true,
      message: "All user data fetched successfully",
      data: userData,
    });
  } catch (err) {
    console.error("AllInfo API error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

//step 7
const submitForm = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, bookingId } = req.body;

    if (!userId || !bookingId) {
      return res.status(400).json({
        status: false,
        message: "userId and bookingId are required",
      });
    }

    if (
      !req.files ||
      !req.files.screenShot ||
      req.files.screenShot.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "No screenShot uploaded!",
      });
    }

    // Step 1: Check if user exists
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found",
      });
    }

    // Step 2: Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { userId: Number(userId), bookingId: Number(bookingId) },
    });

    if (!booking) {
      return res.status(404).json({
        status: false,
        message: "Booking not found for this User.",
      });
    }

    // Step 3: Handle file path
    const absolutePath = req.files.screenShot[0].path;
    const relativePath = absolutePath.split("uploads")[1].replace(/\\/g, "/");
    const screenShotDB = `/uploads${relativePath}`;
    const screenShotPath = `${BASE_URL_IMG}/uploads${relativePath}`;
    console.log("screenShotPath", screenShotPath);

    // Step 4: Update booking with screenShot
    const updatedBooking = await prisma.booking.update({
      where: { bookingId: Number(bookingId) },
      data: {
        screenShot: screenShotDB,
        status: 4,
        updatedOn: new Date(),
      },
    });

    // Step 5: Send response
    const responseData = {
      ...updatedBooking,
      screenShot: screenShotPath, // return full URL
    };

    return res.status(200).json({
      status: true,
      message: "Form submitted successfully!",
      data: responseData,
    });
  } catch (err) {
    console.error("SubmitForm API error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const conferenceRegistrationInfo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId, bookingId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "userId is required" });
    }

    // Fetch user and filter bookings by bookingId
    const userData = await prisma.user.findFirst({
      where: {
        userId: Number(userId),
        status: 1,
      },
      include: {
        bookings: {
          where: { status: 1 },
          include: {
            bookingDetails: true, // workshops
          },
        },
        employments: true, // professional info
      },
    });

    if (!userData) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Optional: If user exists but bookingId doesn't exist
    if (userData.bookings.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found for this user" });
    }

    return res.status(200).json({
      status: true,
      message: "All user data fetched successfully",
      data: userData,
    });
  } catch (err) {
    console.error("AllInfo API error:", err.message || err);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};
module.exports = {
  personalInfo,
  professionalInfo,
  conferenceInfo,
  workshopInfo,
  accomodationInfo,
  allInfo,
  conferenceRegistrationInfo,
  submitForm,
};
