require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;
const nodemailer = require("nodemailer");
const FROM_MAIL = process.env.FROM_MAIL;
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const SUPPORT_MAIL = process.env.SUPPORT_MAIL;
const MAIL_BCC = process.env.MAIL_BCC;
const MAIL_TO = process.env.MAIL_TO;
const BASE_URL_LTSIMEMBER = process.env.BASE_URL_LTSIMEMBER;
const BASE_URL_IMG_LTSIMEMBER = process.env.BASE_URL_IMG_LTSIMEMBER;

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

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // Use 587 instead of 465
  secure: false, // Use STARTTLS instead of SSL
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Prevent TLS issues
  },
});
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

    // return res.status(200).json({
    //   status: true,
    //   message: "Personal Info saved successfully.",
    //   user: updatedUser,
    // });
    return res.status(200).json({
      status: false,
      message: "Registration Closed.",
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
          "Point of care Ultrasound (POCUS ) in liver ICUeee",
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
            message: `Please ensure that you have completed registration before selecting the following workshop(s): ${restrictedNames}.`,
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
      return res
        .status(405)
        .json({ status: false, message: "Method Not Allowed" });
    }

    const { userId, bookingId } = req.body;

    // Basic validations
    if (!userId || !bookingId) {
      return res.status(400).json({
        status: false,
        message: "userId and bookingId are required",
      });
    }

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({ status: false, message: "Invalid Token" });
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

    // Fetch booking + user + workshops in ONE QUERY
    const booking = await prisma.booking.findUnique({
      where: { bookingId: Number(bookingId) }, // bookingId IS unique
      include: {
        user: true, // user details
        bookingDetails: true, // workshop details
      },
    });

    if (!booking || booking.userId !== Number(userId)) {
      return res.status(404).json({
        status: false,
        message: "Booking not found for this User.",
      });
    }
    console.log("bookai", booking);
    const user = booking.user;

    // Handle screenshot file
    const absolutePath = req.files.screenShot[0].path;
    const relativePath = absolutePath.split("uploads")[1].replace(/\\/g, "/");
    const screenShotDB = `/uploads${relativePath}`;
    const screenShotPath = `${BASE_URL_IMG}/uploads${relativePath}`;

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { bookingId: Number(bookingId) },
      data: {
        screenShot: screenShotDB,
        status: 0, // pending
        updatedOn: new Date(),
      },
    });

    const responseData = {
      ...updatedBooking,
      screenShot: screenShotPath,
    };

    // Extract dynamic values
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const userEmail = user.email;
    const userPhone = user.phone;

    const bookingNumber = booking.bookingNumber;

    const memberType = booking.memberType;
    const memberFee = booking.memberTypeFee;
    const accName = booking.accompanyingPersonName;
    const accFee = booking.accompanyingPersonfee;

    const accommodation = booking.accommodation;
    const accommodationFee = booking.accommodationFee;
    const checkIn = booking.checkin;
    const checkOut = booking.checkout;

    const workshops = booking.bookingDetails;
    const total = booking.totalPayment;

    // Helper for optional rows
    const show = (label, value) =>
      value && value !== "0"
        ? `<tr>
             <td style="padding:10px 25px; font-weight:bold;">${label}</td>
             <td style="padding:10px 25px; text-align:right;">${value}</td>
           </tr>`
        : "";

    // Workshop rows
    const workshopRows = workshops
      .map(
        (w) => `
        <tr>
          <td style="padding:10px 25px;">${w.workshop}</td>
          <td style="padding:10px 25px; text-align:right;">INR ${w.workshopFee}</td>
        </tr>
      `
      )
      .join("");

    // User email HTML
    const html = `
<table width="100%" cellpadding="0" cellspacing="0"
style="max-width:700px;margin:30px auto;background:#fff;border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,0.07);">

<tr>
  <td colspan="2"><img src="https://ltsicon2025.com/images/Header_LTSICON.png" style="width:100%;"/></td>
</tr>

<tr>
  <td colspan="2" style="padding:20px;">
    <p>
      Dear ${fullName},<br><br>
      Greetings from LTSICON 2025 Team.<br>
      We have successfully received your booking request <b>${bookingNumber}</b>.<br>
      Your request is under review.<br><br>
      Visit: <a href="https://www.ltsicon2025.com">www.ltsicon2025.com</a>
    </p>
  </td>
</tr>

${show("Name", fullName)}
${show("Phone", userPhone)}
${show("Email", userEmail)}

<tr>
					
					<td colspan="2" style="text-align: center; font-size: 23px; font-weight: bold; color: #003f5c; padding-bottom: 10px;">
						SUMMARY
					</td>
				</tr>

<tr>
					<td style="padding: 20px 25px 10px; font-weight: bold; font-size: 16px; color: #003f5c;">
						Conference Fees <span style="font-weight: bold; font-size: 14px; color: #777;">(Non-Residential)</span>
					</td>
					<td style="padding: 10px 25px;text-align: right;"><b>  AMOUNT<b></td>
					</tr>

${show("Member Type", memberType)}
${show("Member Fee", `INR ${memberFee}`)}
${show("Accompanying Person", accName)}
${show("Accompanying Fee", `INR ${accFee}`)}

<tr>
						<td colspan="2" style="padding: 20px 25px 10px; font-weight: bold; font-size: 16px; color: #003f5c;">
							Workshop Registration
						</td>
					</tr>
${workshopRows}

<tr>
						<td colspan="2" style="padding: 20px 25px 10px; font-weight: bold; font-size: 16px; color: #003f5c;">
							Accommodation Charges
						</td>
					</tr>

${show("Accommodation", accommodation)}
${show("Check-in / Check-out", `${checkIn} → ${checkOut}`)}
${show("Accommodation Fee", `INR ${accommodationFee}`)}

<tr>
  <td colspan="2" style="padding:20px 25px;background:#003f5c;color:#fff;text-align:right;font-size:18px;font-weight:bold;">
    TOTAL: INR ${total}
  </td>
</tr>

<tr>
  <td colspan="2"><img src="https://ltsicon2025.com/images/Footer_LTSICON.png" style="width:100%;"/></td>
</tr>

</table>
`;
    const html1 = `
<table width="100%" cellpadding="0" cellspacing="0"
style="max-width:700px;margin:30px auto;background:#fff;border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,0.07);">

<tr>
  <td colspan="2"><img src="https://ltsicon2025.com/images/Header_LTSICON.png" style="width:100%;"/></td>
</tr>

<p>Dear LTSI Team,<br>
						A new booking <b>${bookingNumber}</b> request has been submitted on the LTSICON 2025 website <a href="www.ltsicon2025.com" style="text-decoration: none;" target="_blank">www.ltsicon2025.com</p>

${show("Name", fullName)}
${show("Phone", userPhone)}
${show("Email", userEmail)}

<tr>
					
					<td colspan="2" style="text-align: center; font-size: 23px; font-weight: bold; color: #003f5c; padding-bottom: 10px;">
						SUMMARY
					</td>
				</tr>

<tr>
					<td style="padding: 20px 25px 10px; font-weight: bold; font-size: 16px; color: #003f5c;">
						Conference Fees <span style="font-weight: bold; font-size: 14px; color: #777;">(Non-Residential)</span>
					</td>
					<td style="padding: 10px 25px;text-align: right;"><b>  AMOUNT<b></td>
					</tr>

${show("Member Type", memberType)}
${show("Member Fee", `INR ${memberFee}`)}
${show("Accompanying Person", accName)}
${show("Accompanying Fee", `INR ${accFee}`)}

<tr>
						<td colspan="2" style="padding: 20px 25px 10px; font-weight: bold; font-size: 16px; color: #003f5c;">
							Workshop Registration
						</td>
					</tr>
${workshopRows}

<tr>
						<td colspan="2" style="padding: 20px 25px 10px; font-weight: bold; font-size: 16px; color: #003f5c;">
							Accommodation Charges
						</td>
					</tr>

${show("Accommodation", accommodation)}
${show("Check-in / Check-out", `${checkIn} → ${checkOut}`)}
${show("Accommodation Fee", `INR ${accommodationFee}`)}

<tr>
  <td colspan="2" style="padding:20px 25px;background:#003f5c;color:#fff;text-align:right;font-size:18px;font-weight:bold;">
    TOTAL: INR ${total}
  </td>
</tr>

<tr>
  <td colspan="2"><img src="https://ltsicon2025.com/images/Footer_LTSICON.png" style="width:100%;"/></td>
</tr>

</table>
`;

    // Email to user
    const mailOptions = {
      from: `"LTSICON2025" <${FROM_MAIL}>`,
      to: userEmail,
      bcc: MAIL_BCC,
      subject: `LTSICON 2025 – Booking under review (Payment Reference Number: ${bookingNumber}), Registration No.:${user.userId}`,
      html,
      attachments: [
        {
          filename: "payment_screenshot.jpg",
          path: absolutePath,
        },
      ],
    };

    // ADMIN email (keep your existing template)
    const mailOptions1 = {
      from: `"LTSICON2025" <${FROM_MAIL}>`,
      to: MAIL_TO,
      bcc: MAIL_BCC,
      subject: `New Booking Under Review – Payment Reference Number: ${bookingNumber} | Registration No: ${user.userId} – LTSICON 2025`,
      html: html1, // (use same or replace with admin template)
      attachments: [
        {
          filename: "payment_screenshot.jpg",
          path: absolutePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    await transporter.sendMail(mailOptions1);

    return res.status(200).json({
      status: true,
      message: "Form submitted successfully!",
      data: responseData,
    });
  } catch (err) {
    console.error("SubmitForm API error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// const conferenceRegistrationInfo = async (req, res) => {
//   console.log("userrr");
//   try {
//     if (req.method !== "POST") {
//       return res
//         .status(405)
//         .json({ status: false, message: "Method Not Allowed" });
//     }

//     const { userId } = req.body;

//     if (!userId) {
//       return res
//         .status(400)
//         .json({ status: false, message: "userId is required" });
//     }
//     if (Number(userId) !== req.user.userId) {
//       return res.status(403).json({
//         status: false,
//         message: "Invalid Token",
//       });
//     }
//     // Fetch user and filter bookings by bookingId
//     const userData = await prisma.user.findFirst({
//       where: {
//         userId: Number(userId),
//         status: 1, // active users only
//       },
//       include: {
//         bookings: {
//           where: { status: 1 },
//           include: {
//             bookingDetails: true, // workshops
//           },
//         },
//         employments: true, // professional info
//       },
//     });

//     if (!userData) {
//       return res.status(404).json({ status: false, message: "User not found" });
//     }
//     console.log("userr", userData);
//     // Optional: If user exists but bookingId doesn't exist
//     if (userData.bookings.length === 0) {
//       return res
//         .status(404)
//         .json({ status: false, message: "Booking not found for this user" });
//     }

//     return res.status(200).json({
//       status: true,
//       message: "All user data fetched successfully",
//       data: userData,
//     });
//   } catch (err) {
//     console.error("AllInfo API error:", err.message || err);
//     return res
//       .status(500)
//       .json({ status: false, message: "Internal Server Error" });
//   }
// };

const conferenceRegistrationInfo = async (req, res) => {
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
      return res.status(403).json({ status: false, message: "Invalid Token" });
    }

    // Fetch complete user profile + bookings
    const userData = await prisma.user.findFirst({
      where: { userId: Number(userId), status: 1 },
      include: {
        bookings: {
          where: { status: 1 },
          include: { bookingDetails: true },
        },
        employments: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (userData.bookings.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found for this user",
      });
    }

    // -------------------------------------
    // 1️⃣ USER DATA (clean)
    // -------------------------------------
    const userInfo = {
      userId: userData.userId,
      name: `${userData.title}${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      phone: userData.phone,
      isLTSI: userData.isLTSI,
      LTSINumber: userData.isLTSI && userData.LTSINumber,
      medicalCouncilNumber: userData.medicalCouncilNumber,
      specialityDepartment: userData.specialityDepartment,
      gender: userData.gender,
      address: userData.address,
      city: userData.city,
      country: userData.country,
      profileImage: `${BASE_URL_IMG}${userData.profileImage}`,
      status: userData.status,
      employments: userData.employments || [],
    };

    // -------------------------------------
    // 2️⃣ CONFERENCE (member + accompanying) — TAKE MOST RECENT BOOKING
    // -------------------------------------
    const latestBooking = userData.bookings[0]; // because status=1 filtered, order doesn't matter

    const conference = {
      bookingId: latestBooking.bookingId,
      bookingNumber: latestBooking.bookingNumber,
      memberType: latestBooking.memberType,
      memberTypeFee: latestBooking.memberTypeFee,
      accompanyingPersonName: latestBooking.accompanyingPersonName,
      accompanyingPersonFee: latestBooking.accompanyingPersonfee,
    };

    // -------------------------------------
    // 3️⃣ ACCOMMODATION (multiple possible)
    // -------------------------------------
    const isValid = (v) =>
      v !== null && v !== undefined && v !== "" && v !== "0" && v !== 0;

    const accommodation = userData.bookings
      .filter(
        (b) =>
          isValid(b.accommodation) ||
          isValid(b.accommodationFee) ||
          isValid(b.checkin) ||
          isValid(b.checkout) ||
          isValid(b.nights)
      )
      .map((b) => ({
        bookingId: b.bookingId,
        accommodation: b.accommodation,
        accommodationFee: b.accommodationFee,
        checkin: b.checkin,
        checkout: b.checkout,
        nights: b.nights,
        paymentScreenshot: b.screenShot
          ? `${BASE_URL_IMG}${b.screenShot}`
          : null,
        status: b.status,
      }));

    // -------------------------------------
    // 4️⃣ WORKSHOPS (multiple bookings → multiple details)
    // -------------------------------------
    const workshops = userData.bookings.flatMap((b) =>
      b.bookingDetails.map((d) => ({
        workshop: d.workshop,
        workshopFee: d.workshopFee,
        status: b.status,
      }))
    );

    // -------------------------------------
    // 5️⃣ RESPONSE FORMAT
    // -------------------------------------
    return res.status(200).json({
      status: true,
      message: "User registration info fetched successfully",
      data: {
        user: userInfo,
        conference,
        accommodation,
        workshops,
      },
    });
  } catch (err) {
    console.error("conferenceRegistrationInfo API error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
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
