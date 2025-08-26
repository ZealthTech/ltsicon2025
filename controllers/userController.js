require("dotenv").config();
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const nodemailer = require("nodemailer");
const moment = require("moment");
const BASE_URL = process.env.BASE_URL;
const LOGO = `${BASE_URL}/public/Logo.png`;
const FROM_MAIL = process.env.FROM_MAIL;
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const SUPPORT_MAIL = process.env.SUPPORT_MAIL;
const MAIL_BCC = process.env.MAIL_BCC;
const BASE_URL_LTSIMEMBER = process.env.BASE_URL_LTSIMEMBER;

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
      return res.status(400).json({
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
        otp: Number(otp),
        otpExpiry,
        status: 0, // optional reset
        roleId: Number(roleId), // if you want to allow role change
      },
      create: {
        email,
        otp: Number(otp),
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
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    // 3. Validate expiry
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({
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
        id: updatedUser.userId,
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
      return res.status(400).json({
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
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

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
      <h2 style="color: #222; margin-bottom: 10px;">Welcome, ${
        updatedUser.title
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
      subject: `LTSICON2025 - Your Account Has Been Created successfully`,
      html,
      // text: `Your OTP for password reset is: ${otp}.`,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      status: true,
      message: "Sign up completed successfully.",
      user: {
        id: updatedUser.userId,
        email: updatedUser.email,
        role: updatedUser.role?.name || null,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
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
        roleId: Number(roleId),
        email,
      },
      include: { role: true },
    });

    if (!existingUser) {
      return res.status(404).json({
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
      data: { otp, otpExpiry },
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
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 3. Validate OTP
    if (user.otp !== Number(otp)) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    // 4. Validate expiry
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({
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
      },
      JWT_SECRET,
      { expiresIn: "7d" } // token valid for 7 days
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
        id: updatedUser.userId,
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
        roleId: Number(roleId),
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
        data: { otp, otpExpiry },
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
          message:
            "OTP sent successfully (from external DB). Please check your registered email.",
        });
      } else {
        return res.status(404).json({
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

    const { email, ltsiNo, otp, roleId } = req.body;

    // Basic validation
    if (!email || !ltsiNo || !otp || !roleId) {
      return res.status(400).json({
        status: false,
        message: "Email, LTSI number, OTP and roleId are required",
      });
    }

    // 1. Try to find user in local DB
    const user = await prisma.user.findFirst({
      where: {
        email,
        LTSINumber: ltsiNo,
        roleId: Number(roleId),
        status: 1,
      },
      include: { role: true },
    });

    // 2. If found locally → verify OTP from DB
    if (user) {
      if (user.otp !== Number(otp)) {
        return res.status(400).json({
          status: false,
          message: "Invalid OTP",
        });
      }

      if (!user.otpExpiry || new Date() > user.otpExpiry) {
        return res.status(400).json({
          status: false,
          message: "OTP expired. Please request a new one.",
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.userId, role: user.role?.name },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
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
          id: updatedUser.userId,
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
    }
    try {
      // 3. If not found locally → verify OTP from external API
      const response = await axios.post(
        `${BASE_URL_LTSIMEMBER}/form/ltsi-verify-otp`,
        { ltsiNo, otp },
        { validateStatus: () => true } //  don't throw on 404/500
      );

      console.log(
        "External OTP verify response:",
        response.status,
        response.data
      );

      if (response.status === 200 && response.data?.status) {
        // ✅ OTP verified by external API
        const externalUser = response.data.user || {};

        const token = jwt.sign(
          { email: externalUser.email, ltsiNo },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.status(200).json({
          status: true,
          message: "OTP verified successfully.",
          token,
          user: {
            email: externalUser.email,
            firstName: externalUser.firstName,
            lastName: externalUser.lastName,
            ltsiNo,
            roleId,
          },
        });
      }

      if (response.status === 404) {
        return res.status(404).json({
          status: false,
          message:
            response.data?.message || "User not found in external system.",
        });
      }

      return res.status(400).json({
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
