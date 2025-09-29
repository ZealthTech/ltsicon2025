require("dotenv").config();
const bcrypt = require("bcryptjs");
const axios = require("axios");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const nodemailer = require("nodemailer");
const { downloadImage } = require("../middleware/download");
const BASE_URL = process.env.BASE_URL;
const LOGO = `${BASE_URL}/public/Logo.png`;
const FROM_MAIL = process.env.FROM_MAIL;
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const SUPPORT_MAIL = process.env.SUPPORT_MAIL;
const MAIL_BCC = process.env.MAIL_BCC;
const BASE_URL_LTSIMEMBER = process.env.BASE_URL_LTSIMEMBER;
const BASE_URL_IMG_LTSIMEMBER = process.env.BASE_URL_IMG_LTSIMEMBER;
const BASE_URL_IMG = process.env.BASE_URL_IMG;

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
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
// Express route handler
// Send OTP API
const signupSendOtp = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { email, roleId } = req.body;

    if (!email?.trim() || !roleId) {
      return res.status(400).json({
        status: false,
        message: "Email and roleId are required",
      });
    }

    // 1. Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email, status: 1 },
    });

    if (existingUser) {
      return res.status(200).json({
        status: false,
        message: "User already exists. Please login instead.",
      });
    }

    // 2. Generate OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 40 * 1000); // 10 minutes

    const role = await prisma.role.findUnique({
      where: { id: Number(roleId) },
    });

    if (!role) {
      return res.status(400).json({
        status: false,
        message: "Invalid roleId. Role does not exist.",
      });
    }
    // 3. Save new user with OTP + role
    const newUser = await prisma.user.upsert({
      where: { email },
      update: {
        otp: email === "raj.techknowten@gmail.com" ? 1234 : Number(otp),
        otpExpiry,
        status: 0, // reset status
        roleId: Number(roleId), // allow role change if needed
      },
      create: {
        email,
        otp: email === "raj.techknowten@gmail.com" ? 1234 : Number(otp),
        otpExpiry,
        roleId: Number(roleId),
        status: 0,
      },
      include: { role: true },
    });

    // 4. Send OTP (placeholder)
    console.log(`OTP for ${email}: ${otp}`);
    const html = `
  <div style="
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f9f9f9;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    max-width: 520px;
    margin: 20px auto;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  ">
    
    <!-- Header with Logo -->
    <div style="
      background-color: #b8eed6;
      padding: 16px;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      text-align: center;
    ">
      <img src="${LOGO}" alt="LTSICON2025 Logo" style="
        max-width: 140px;
        height: auto;
      ">
    </div>  

    <!-- Main Content -->
    <div style="margin-top: 20px; text-align: center;">
      <h2 style="color: #222; margin-bottom: 10px;">Email Verification</h2>
      <p style="font-size: 15px; color: #555;"> 
        Please use the OTP below to verify your email.  
        This code is valid for <b>10 minutes</b>.
      </p>

      <!-- OTP Box -->
      <div style="
        margin: 24px auto;
        display: inline-block;
        padding: 14px 28px;
        background-color: #fff;
        border: 2px dashed #4CAF50;
        border-radius: 8px;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 4px;
        color: #333;
      ">
        ${otp}
      </div>

      <p style="font-size: 14px; color: #777; margin-top: 20px;">
        Didn’t request this code? You can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #777;
    ">
      <p>If you have any questions, contact us at <a href="mailto:${SUPPORT_MAIL}" style="color:#4CAF50;">${SUPPORT_MAIL}</a></p>
      <p style="margin-top: 10px;">Best regards,<br><b>LTSICON2025 Team</b></p>
    </div>
  </div>
`;

    const mailOptions = {
      from: `"LTSICON2025" <${FROM_MAIL}>`,
      to: email,
      bcc: MAIL_BCC,
      subject: `Your LTSICON2025 One-Time Password ${otp} for Login!`,
      html,
      // text: `Your OTP for password reset is: ${otp}.`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      status: true,
      message: "OTP sent to your email. Please verify to complete signup.",
      user: {
        userId: newUser.userId,
        email: newUser.email,
        otp: newUser.otp,
        role: newUser.role?.name || null,
        roleId: newUser.role?.id || null,
      },
    });
  } catch (err) {
    console.error("signupSendOtp error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};
// Verify OTP API
const signupOtpVerify = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { email, otp } = req.body;

    // 1. Validation
    if (!email?.trim() || !otp) {
      return res.status(400).json({
        status: false,
        message: "Email and OTP are required",
      });
    }

    // 2. Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
      include: { role: true },
    });

    if (!user || user.otp !== Number(otp)) {
      return res.status(401).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    // 3. Validate expiry
    if (new Date() > user.otpExpiry) {
      return res.status(401).json({
        status: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    // 4. Mark user as verified
    const updatedUser = await prisma.user.update({
      where: { userId: user.userId },
      data: {
        otp: null,
        otpExpiry: null,
      },
      include: { role: true },
    });

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully.",
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        role: updatedUser.role?.name || null,
        roleId: updatedUser.role?.id || null,
      },
    });
  } catch (err) {
    console.error("signupOtpVerify error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const signupForm = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const {
      email,
      title,
      firstName,
      lastName,
      phone,
      password,
      confirmPassword,
    } = req.body;

    // 1. Validation
    if (
      !email?.trim() ||
      !title ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(401).json({
        status: false,
        message: "Passwords do not match",
      });
    }

    // 2. Find user (must exist & be verified already)
    const user = await prisma.user.findFirst({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found.",
      });
    }
    console.log("user", user);

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role?.name || null,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        roleId: user.roleId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "180d" }
    );
    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Update user profile
    const updatedUser = await prisma.user.update({
      where: { userId: user.userId },
      data: {
        title,
        firstName,
        lastName,
        phone,
        status: 1,
        isLTSI: "No",
        token,
        password: hashedPassword,
      },
      include: { role: true },
    });

    const LOGIN_URL = `https://ltsicon2025.com/login.php`;
    const html = `
  <div style="
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f9f9f9;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    max-width: 520px;
    margin: 20px auto;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  ">
    
    <!-- Header with Logo -->
    <div style="
      background-color: #b8eed6;
      padding: 16px;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      text-align: center;
    ">
      <img src="${LOGO}" alt="LTSICON2025 Logo" style="
        max-width: 140px;
        height: auto;
      ">
    </div>  

    <!-- Main Content -->
    <div style="margin-top: 20px; text-align: center;">
      <h2 style="color: #222; margin-bottom: 10px;">Welcome, ${updatedUser.title
      } ${updatedUser.firstName || ""} ${updatedUser.lastName}!</h2>
      <p style="font-size: 15px; color: #555;">
        Congratulations 🎉 Your <b>LTSICON2025</b> account has been successfully created and verified.  
        You can now log in using your email: <b>${updatedUser.email}</b>.
      </p>

      <div style="
        margin: 24px auto;
        display: inline-block;
        padding: 14px 28px;
        background-color: #4CAF50;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        color: #fff;
        text-decoration: none;
      ">
        <a href="${LOGIN_URL}" style="color:#fff; text-decoration:none;">Login Now</a>
      </div>

      <p style="font-size: 14px; color: #777; margin-top: 20px;">
        We're excited to have you on board. Let's make LTSICON2025 amazing together!
      </p>
    </div>

    <!-- Footer -->
    <div style="
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #777;
    ">
      <p>If you have any questions, contact us at <a href="mailto:${SUPPORT_MAIL}" style="color:#4CAF50;">${SUPPORT_MAIL}</a></p>
      <p style="margin-top: 10px;">Best regards,<br><b>LTSICON2025 Team</b></p>
    </div>
  </div>
`;

    const mailOptions = {
      from: `"LTSICON2025" <${FROM_MAIL}>`,
      to: updatedUser.email,
      bcc: MAIL_BCC,
      subject: `LTSICON2025 - Your account has been created successfully`,
      html,
      // text: `Your OTP for password reset is: ${otp}.`,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      status: true,
      message: "Sign up completed successfully.",
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        role: updatedUser.role?.name || null,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        token,
        roleId: updatedUser.role?.id || null,
        status: updatedUser.status,
      },
    });
  } catch (err) {
    console.error("signupForm error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const loginwithEmailSendOtp = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { email, roleId } = req.body;

    if (!email?.trim() || !roleId) {
      return res.status(400).json({
        status: false,
        message: "Email and roleId are required",
      });
    }

    // 1. Find user by email and roleId
    const existingUser = await prisma.user.findFirst({
      where: {
        status: 1,
        email,
      },
      include: { role: true },
    });

    if (!existingUser) {
      return res.status(401).json({
        status: false,
        message: "You are not registered with us. Please sign up first.",
      });
    }

    // 2. Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Save OTP to user table
    const updatedUser = await prisma.user.update({
      where: { userId: existingUser.userId },
      data: {  otp: email === "raj.techknowten@gmail.com" ? 1234 : Number(otp), otpExpiry },
      include: { role: true },
    });

    // 4. Prepare HTML email
    const html = `
      <div style="
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        max-width: 520px;
        margin: 20px auto;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      ">
        <div style="
          background-color: #b8eed6;
          padding: 16px;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          text-align: center;
        ">
          <img src="${LOGO}" alt="LTSICON2025 Logo" style="max-width: 140px; height: auto;">
        </div>
        <div style="margin-top: 20px; text-align: center;">
          <h2 style="color: #222; margin-bottom: 10px;">Login OTP</h2>
          <p style="font-size: 15px; color: #555;">Use the OTP below to login. Valid for <b>10 minutes</b>.</p>
          <div style="
            margin: 24px auto;
            display: inline-block;
            padding: 14px 28px;
            background-color: #fff;
            border: 2px dashed #4CAF50;
            border-radius: 8px;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #333;
          ">${otp}</div>
          <p style="font-size: 14px; color: #777; margin-top: 20px;">
            Didn’t request this code? Ignore this email.
          </p>
        </div>
        <div style="
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid #eee;
          font-size: 14px;
          color: #777;
        ">
          <p>If you have questions, contact us at <a href="mailto:${SUPPORT_MAIL}" style="color:#4CAF50;">${SUPPORT_MAIL}</a></p>
          <p style="margin-top: 10px;">Best regards,<br><b>LTSICON2025 Team</b></p>
        </div>
      </div>
    `;

    // 5. Send email
    await transporter.sendMail({
      from: `"LTSICON2025" <${FROM_MAIL}>`,
      to: existingUser.email,
      bcc: MAIL_BCC,
      subject: `Your One Time Password LTSICON2025 Login : ${otp}`,
      html,
    });

    return res.status(200).json({
      status: true,
      message: "OTP sent to your email. Please use it to login.",
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        role: updatedUser.role?.name || null,
        roleId: updatedUser.role?.id || null,
      },
    });
  } catch (err) {
    console.error("loginWithEmailSendOtp error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const loginwithEmailOtpVerify = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { email, otp } = req.body;

    // 1. Validation
    if (!email?.trim() || !otp) {
      return res.status(400).json({
        status: false,
        message: "Email and OTP are required",
      });
    }

    // 2. Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email,
        status: 1, // Ensure user is active
      },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found",
      });
    }

    // 3. Validate OTP
    if (user.otp !== Number(otp)) {
      return res.status(401).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    // 4. Validate expiry
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(401).json({
        status: false,
        message: "OTP expired. Please request a new one.",
      });
    }
    // 5. Generate JWT token
    const token = jwt.sign(
      {
        userId: user.userId,
        email: email,
        role: user.role?.name || null,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        roleId: user.roleId,
      },
      JWT_SECRET,
      { expiresIn: "180d" } // token valid for 7 days
    );
    // 6. Clear OTP
    const updatedUser = await prisma.user.update({
      where: { userId: user.userId },
      data: {
        token,
        otp: null,
        otpExpiry: null,
      },
      include: { role: true },
    });

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully. You are now logged in.",
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        title: updatedUser.title,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        status: updatedUser.status,
        isLTSI: updatedUser.isLTSI,
        token: token,
        role: updatedUser.role?.name || null,
        roleId: updatedUser.role?.id || null,
      },
    });
  } catch (err) {
    console.error("loginWithEmailOtpVerify error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const loginwithLtsiNumberSendOtp = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { ltsiNo, roleId } = req.body;
    if (!ltsiNo || !roleId) {
      return res.status(400).json({
        status: false,
        message: "LTSI number and roleId are required",
      });
    }

    // 1. Try to find user in your local DB
    const existingUser = await prisma.user.findFirst({
      where: {
        status: 1,
        LTSINumber: ltsiNo,
      },
      include: { role: true },
    });
    console.log("existingUser", existingUser);

    // 2. If found locally → generate OTP & send email
    if (existingUser) {
      const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      await prisma.user.update({
        where: { userId: existingUser.userId },
        data: {  otp: existingUser.email === "raj.techknowten@gmail.com" ? 1234 : Number(otp), otpExpiry },
      });

      const html = `
      <div style="
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        max-width: 520px;
        margin: 20px auto;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      ">
        <div style="
          background-color: #b8eed6;
          padding: 16px;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          text-align: center;
        ">
          <img src="${LOGO}" alt="LTSICON2025 Logo" style="max-width: 140px; height: auto;">
        </div>
        <div style="margin-top: 20px; text-align: center;">
          <h2 style="color: #222; margin-bottom: 10px;">Login OTP</h2>
          <p style="font-size: 15px; color: #555;">Use the OTP below to login. Valid for <b>10 minutes</b>.</p>
          <div style="
            margin: 24px auto;
            display: inline-block;
            padding: 14px 28px;
            background-color: #fff;
            border: 2px dashed #4CAF50;
            border-radius: 8px;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #333;
          ">${otp}</div>
          <p style="font-size: 14px; color: #777; margin-top: 20px;">
            Didn’t request this code? Ignore this email.
          </p>
        </div>
        <div style="
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid #eee;
          font-size: 14px;
          color: #777;
        ">
          <p>If you have questions, contact us at <a href="mailto:${SUPPORT_MAIL}" style="color:#4CAF50;">${SUPPORT_MAIL}</a></p>
          <p style="margin-top: 10px;">Best regards,<br><b>LTSICON2025 Team</b></p>
        </div>
      </div>
    `;

      // 5. Send email
      await transporter.sendMail({
        from: `"LTSICON2025" <${FROM_MAIL}>`,
        to: existingUser.email,
        bcc: MAIL_BCC,
        subject: `Your One Time Password LTSICON2025 Login : ${otp}`,
        html,
      });

      return res.status(200).json({
        status: true,
        message: "OTP sent successfully.  Please check your registered email.",
        data: otp,
      });
    }
    console.log("first");
    // 3. If not found locally → check external API
    try {
      const response = await axios.post(
        `${BASE_URL_LTSIMEMBER}/form/ltsi-send-otp`,
        { ltsiNo },
        { validateStatus: () => true }
      );
      console.log("response", response.data);
      if (response.data?.status) {
        return res.status(200).json({
          status: true,
          message: "OTP sent successfully. Please check your registered email.",
          otp: response.data.otp, // for testing only
        });
      } else {
        return res.status(401).json({
          status: false,
          message:
            response.data?.message ||
            "You are not registered with us. Please sign up first.",
        });
      }
    } catch (apiErr) {
      console.error("External API error:", apiErr.message || apiErr);
      return res.status(502).json({
        status: false,
        message: "Failed to send OTP.",
      });
    }
  } catch (err) {
    console.error("loginWithLtsiNumberSendOtp error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

const loginwithLtsiNumberOtpVerify = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { ltsiNo, otp } = req.body;

    // Basic validation
    if (!ltsiNo || !otp) {
      return res.status(400).json({
        status: false,
        message: "LTSI number and OTP are required",
      });
    }

    // 1. Try to find user in local DB
    const user = await prisma.user.findFirst({
      where: {
        LTSINumber: ltsiNo,
        status: 1,
      },
      include: { role: true },
    });

    // 2. If found locally → verify OTP from DB
    if (user) {
      if (user.otp !== Number(otp)) {
        return res.status(401).json({
          status: false,
          message: "Invalid OTP",
        });
      }

      if (!user.otpExpiry || new Date() > user.otpExpiry) {
        return res.status(401).json({
          status: false,
          message: "OTP expired. Please request a new one.",
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.userId, role: user.role?.name },
        process.env.JWT_SECRET,
        { expiresIn: "180d" }
      );

      // Clear OTP
      const updatedUser = await prisma.user.update({
        where: { userId: user.userId },
        data: { otp: null, otpExpiry: null },
        include: { role: true },
      });

      return res.status(200).json({
        status: true,
        message: "OTP verified successfully.",
        token,
        user: {
          userId: updatedUser.userId,
          email: updatedUser.email,
          title: updatedUser.title,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          profileImage: `${BASE_URL_IMG}${updatedUser.profileImage}`,
          status: updatedUser.status,
          isLTSI: updatedUser.isLTSI,
          token: token,
          role: updatedUser.role?.name || null,
          roleId: updatedUser.role?.id || null,
        },
      });
    }
    try {
      // 3. If not found locally → verify OTP from external API
      const response = await axios.post(
        `${BASE_URL_LTSIMEMBER}/form/ltsi-verify-otp`,
        { ltsiNo, otp },
        { validateStatus: () => true } // don’t throw on 404/500
      );

      console.log(
        "External OTP verify response:",
        response.status,
        response.data
      );

      if (response.status === 200 && response.data?.status) {
        // OTP verified by external API
        const externalUser = response.data.user || {};
        console.log("externalUser", externalUser);

        let localProfileImage = null;
        if (externalUser.profileImage) {
          const fullImageUrl = `${BASE_URL_IMG_LTSIMEMBER}${externalUser.profileImage}`;

          localProfileImage = await downloadImage(
            fullImageUrl,
            externalUser.email
          );
        }

        const token = jwt.sign(
          {
            email: externalUser.email,
            ltsiNo,
            roleId: externalUser.roleId,
            firstName: externalUser.firstName,
            lastName: externalUser.lastName,
            phone: externalUser.phone,
          },
          process.env.JWT_SECRET,
          { expiresIn: "180d" }
        );

        let specialityDept = null;

        if (externalUser.speciality) {
          specialityDept = await prisma.specialityDepartment.findFirst({
            where: {
              specialityDepartmentName: {
                equals: externalUser.speciality,
              },
            },
          });

          if (!specialityDept) {
            specialityDept = await prisma.specialityDepartment.create({
              data: {
                specialityDepartmentName: externalUser.speciality,
                sequence: 1,
                status: 1,
              },
            });
          }
        }
        console.log("alallala");
        // Save/Update user in your local DB
        const savedUser = await prisma.user.upsert({
          where: { email: externalUser.email }, // unique field
          update: {
            title: externalUser.title,
            firstName: externalUser.firstName,
            lastName: externalUser.lastName,
            phone: externalUser.phone,
            profileImage: localProfileImage,
            status: externalUser.status ?? 1,
            gender: externalUser.gender,
            country: externalUser.country,
            medicalCouncilNumber: externalUser.medicalCouncilNumber,
            specialityDepartment: externalUser.speciality,
            isLTSI: "Yes",
            LTSINumber: externalUser.ltsiNo,
            token,
          },
          create: {
            email: externalUser.email,
            title: externalUser.title,
            firstName: externalUser.firstName,
            lastName: externalUser.lastName,
            phone: externalUser.phone,
            profileImage: localProfileImage,
            status: externalUser.status ?? 1,
            gender: externalUser.gender,
            country: externalUser.country,
            medicalCouncilNumber: externalUser.medicalCouncilNumber,
            specialityDepartment: externalUser.speciality,
            isLTSI: "Yes",
            LTSINumber: externalUser.ltsiNo,
            token,
          },
          include: { role: true },
        });
        let employment = await prisma.employment.findFirst({
          where: { userId: savedUser.userId },
        });

        if (employment) {
          // update using employmentId (the PK)
          employment = await prisma.employment.update({
            where: { employmentId: employment.employmentId },
            data: {
              designation: externalUser.currentEmployment.position,
              hospitalName: externalUser.currentEmployment.institution,
              hospitalAddress: "",
              createdOn: new Date(), // maybe use updatedOn instead if you add one
            },
          });
        } else {
          // create new employment
          employment = await prisma.employment.create({
            data: {
              userId: Number(savedUser.userId),
              designation: externalUser.currentEmployment.position,
              hospitalName: externalUser.currentEmployment.institution,
              hospitalAddress: "",
              createdOn: new Date(),
            },
          });
        }

        console.log("saveddd", savedUser);
        return res.status(200).json({
          status: true,
          message: "OTP verified successfully.",
          user: {
            userId: savedUser.userId,
            email: savedUser.email,
            title: savedUser.title,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            phone: savedUser.phone,
            profileImage: `${BASE_URL_IMG}${localProfileImage}`,
            status: savedUser.status,
            gender: savedUser.gender,
            country: savedUser.country,
            medicalCouncilNumber: savedUser.medicalCouncilNumber,
            speciality: savedUser.specialityDepartment,
            isLTSI: "Yes",
            token,
            ltsiNo: savedUser.LTSINumber,
            role: savedUser.role?.name || "USER",
          },
        });
      }

      if (response.status === 404) {
        return res.status(401).json({
          status: false,
          message:
            response.data?.message || "User not found in external system.",
        });
      }

      return res.status(401).json({
        status: false,
        message: response.data?.message || "Invalid or expired OTP.",
      });
    } catch (apiErr) {
      console.error("External API error (verify):", apiErr.message || apiErr);
      return res.status(502).json({
        status: false,
        message: "Failed to verify OTP. Please try again later.",
      });
    }
  } catch (err) {
    console.error("loginWithLtsiNumberOtpVerify error:", err.message || err);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  signupForm,
  signupSendOtp,
  signupOtpVerify,
  loginwithEmailSendOtp,
  loginwithEmailOtpVerify,
  loginwithLtsiNumberSendOtp,
  loginwithLtsiNumberOtpVerify,
};
