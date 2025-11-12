require("dotenv").config();
const prisma = require('../prisma');
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
      city,
      address,
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
      !city ||
      !address ||
      !medicalCouncilNumber ||
      !isLTSI
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }
    // Perform UPSERT
    const updatedUser = await prisma.user.upsert({
      where: { email },
      update: {
        role: Number(roleId),
        firstName,
        lastName,
        email,
        phone,
        gender,
        country,
        city,
        address,
        medicalCouncilNumber,
        isLTSI,
        LTSINumber,
        status: 1,
        createdOn: new Date(),
      },
      create: {
        userId: Number(userId),
        role: Number(roleId),
        firstName,
        lastName,
        email,
        phone,
        gender,
        country,
        city,
        address,
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

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
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

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
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
          bookingFrom: 1,
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
          bookingFrom: 1,
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
const workshopInfoo = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId, bookingId, workshops = [] } = req.body;

    // 1️⃣ Validation
    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "userId is required" });
    }

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    // 2️⃣ User check
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });

    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "User not found" });
    }

    // 3️⃣ Check if user already has a booking
    let booking = await prisma.booking.findFirst({
      where:
        Number(bookingId) === 0
          ? { userId: Number(userId) }
          : { userId: Number(userId), bookingId: Number(bookingId) },
    });

    // 4️⃣ Fetch all workshops (for reference)
    const workshopList = await prisma.workShop.findMany();

    const bookingNumber = await generateBookingNumber();
    let insertedWorkshops = [];
    let totalWorkshopFee = 0;

    // 5️⃣ CASE 1: User already has a booking
    if (bookingId && bookingId > 0) {
      if (!booking) {
        return res.status(404).json({
          status: false,
          message: "Booking not found for provided bookingId.",
        });
      }

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

        totalWorkshopFee = workshops.reduce(
          (sum, { fee }) => sum + Number(fee || 0),
          0
        );
      }
    } else {
      //  CASE 2: No booking yet — new registration flow
      if (workshops.length > 0) {
        // Extract selected workshop names (normalize)
        const selectedWorkshopNames = workshops.map((w) =>
          String(w.name ?? w.workShop ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
        );
        console.log("selectedWorkshopNames:", selectedWorkshopNames);

        // Define restricted workshops by name (normalize same way)
        const restrictedWorkshops = [
          "Point of care Ultrasound (POCUS ) in liver ICU",
        ];
        console.log("restrictedWorkshops:", restrictedWorkshops);

        // Check if any selected workshop matches restricted ones
        const selectedRestricted = selectedWorkshopNames.filter((name) =>
          restrictedWorkshops.includes(name)
        );
        console.log("selectedRestricted:", selectedRestricted);

        if (selectedRestricted.length > 0) {
          // Fetch readable names from DB for message clarity
          const restrictedNames = workshopList
            .filter((w) =>
              selectedRestricted.includes(
                w.workShop.trim().toLowerCase().replace(/\s+/g, " ")
              )
            )
            .map((w) => w.workShop)
            .join(", ");

          return res.status(200).json({
            status: false,
            message: `Please ensure that you have completed registration before selecting the following workshop(s): ${restrictedNames
              }.`,
          });
        }

        // ✅ Otherwise, safe to create booking
        booking = await prisma.booking.create({
          data: {
            userId: Number(userId),
            bookingNumber,
            bookingFrom: 1,
            createdOn: new Date(),
          },
        });

        // Insert booking details
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

        // Calculate total fee
        totalWorkshopFee = workshops.reduce(
          (sum, { fee }) => sum + Number(fee || 0),
          0
        );

        // Update totalPayment in booking
        await prisma.booking.update({
          where: { bookingId: booking.bookingId },
          data: {
            totalPayment: Number(totalWorkshopFee),
          },
        });
      }
    }

    // ✅ Final Response
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
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
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
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    // 2. User check
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });
    if (!user)
      return res.status(401).json({ status: false, message: "User not found" });

    // 3. Booking check
    let booking = await prisma.booking.findFirst({
      where:
        Number(bookingId) === 0
          ? { userId: Number(userId) }
          : { userId: Number(userId), bookingId: Number(bookingId) },
    });

    const workshopList = await prisma.workShop.findMany();
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
        const selectedWorkshopNames = workshops.map((w) =>
          String(w.name ?? w.workShop ?? "")
            
        );
        console.log("selectedWorkshopNames:", selectedWorkshopNames);

        // Define restricted workshops by name (normalize same way)
        const restrictedWorkshops = [
          "Point of care Ultrasound (POCUS ) in liver ICU",
        ];
        console.log("restrictedWorkshops:", restrictedWorkshops);

        // Check if any selected workshop matches restricted ones
        const selectedRestricted = selectedWorkshopNames.filter((name) =>
          restrictedWorkshops.includes(name)
        );
        console.log("selectedRestricted:", selectedRestricted);

        if (selectedRestricted.length > 0) {
          // Fetch readable names from DB for message clarity
          const restrictedNames = workshopList
            .filter((w) =>
              selectedRestricted.includes(
                w.workShop.trim().toLowerCase().replace(/\s+/g, " ")
              )
            )
            .map((w) => w.workShop)
            .join(", ");

          return res.status(200).json({
            status: false,
            message: `Please ensure that you have completed registration before selecting the following workshop(s): ${restrictedNames
              }.`,
          });
        }

        booking = await prisma.booking.create({
          data: {
            userId: Number(userId),
            bookingNumber,
            bookingFrom: Number(1),
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
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
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
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
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
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
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
        status: 0, // 0 for pending, 1 for approval, 2 for rejected
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
  console.log("userrr");
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "userId is required" });
    }
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }
    // Fetch user and filter bookings by bookingId
    const userData = await prisma.user.findFirst({
      where: {
        userId: Number(userId),
        status: 1, // active users only
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
    console.log("userr", userData);
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

const workshopList = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId } = req.body; // workshops = array of { name, fee }

    // 1. Validation
    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "userId is required" });
    }
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    // 2. User check
    const user = await prisma.user.findUnique({
      where: { userId: Number(userId) },
    });
    if (!user)
      return res.status(401).json({ status: false, message: "User not found" });

    // 3. Booking check
    const booking = await prisma.booking.findMany({
      where: { userId: Number(userId), status: 1 },
      select: {
        bookingId: true,
        bookingNumber: true,
        memberType: true,
        memberTypeFee: true,
        bookingDetails: true,
      },
    });
    if (!booking) {
      return res
        .status(400)
        .json({ status: false, message: "No booking found for this user" });
    }
    // 7. Response
    return res.status(200).json({
      status: true,
      message: "workshop list",
      data: booking,
    });
  } catch (err) {
    console.error("Workshop info error:", err.message || err);
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
  workshopList,
};