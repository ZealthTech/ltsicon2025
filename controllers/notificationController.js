require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;
var admin = require("firebase-admin");
var serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const messaging = admin.messaging();
const schedule = require("node-schedule");
const dtt = require("date-and-time");

//ADMIN SEND NOTIFICATION

const adminSendNotification = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, roleId, title, desc, fcmUser } = req.body;

    // 🧩 Validate incoming data
    if (!userId || !roleId || !Array.isArray(fcmUser) || fcmUser.length === 0) {
      return res.status(400).json({
        status: false,
        message: "userId, roleId and fcmUser array are required",
      });
    }

    console.log("📦 Payload received:", { userId, roleId, title, desc, fcmUser });

    // 🧠 Fetch users’ FCM tokens from DB
    const users = await prisma.user.findMany({
      where: {
        userId: { in: fcmUser },
        status: 1, // only active users
      },
      select: {
        userId: true,
        firstName: true,
        fcmAndToken: true,
        fcmIosToken: true,
        andLogin: true,
        iosLogin: true,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No valid users found for given IDs",
      });
    }

    // 🧩 Collect valid tokens
    let tokens = [];

    users.forEach((user) => {
      if (user.fcmAndToken && user.andLogin === 1) {
        tokens.push(user.fcmAndToken);
      }
      if (user.fcmIosToken && user.iosLogin === 1) {
        tokens.push(user.fcmIosToken);
      }
    });

    if (tokens.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No valid FCM tokens to send notifications.",
      });
    }

    console.log(`🚀 Sending notification to ${tokens.length} devices...`);

    // 🧾 Push message template
    const pushMessage = {
      notification: {
        title: title,
        body: desc,
      },
      data: {
        userId: String(userId),
        type: "General",
      },
    };

    const maxRetries = 3;

    // 🧨 Send notification with retry logic
    for (const token of tokens) {
      let attempts = 0;
      let sentSuccessfully = false;

      while (attempts < maxRetries && !sentSuccessfully) {
        attempts++;
        console.log(`📤 Attempt ${attempts} — Sending to token: ${token}`);

        try {
          await messaging.send({
            token,
            ...pushMessage,
          });

          console.log(`✅ Successfully sent to token: ${token}`);
          sentSuccessfully = true;
        } catch (error) {
          console.error(`❌ Error sending to ${token} (Attempt ${attempts}):`, error.message);
          if (attempts < maxRetries) console.log("🔁 Retrying...");
        }
      }

      if (!sentSuccessfully) {
        console.log(`⚠️ Failed to send notification after ${maxRetries} attempts for ${token}`);
      }
    }
    const notificationsToCreate = users.map((user) => ({
      senderId: userId,         // Admin who sent it
      toId: user.userId,      // Target user
      title,
      message: desc,
      htmlMessage: `<p>${desc}</p>`,
      type: "General",
      typeId: "0",
      image: null,
      totalCount: 1,
      status: true,
    }));

    await prisma.notification.createMany({
      data: notificationsToCreate,
      skipDuplicates: true, // avoids duplicates on accidental re-run
    });
    return res.status(200).json({
      status: true,
      message: `Notifications processed for ${tokens.length} tokens.`,
      data: users
    });
  } catch (error) {
    console.error("🔥 Error in adminSendNotification:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const userNotificationList = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        userId: Number(userId),
        role: Number(roleId),
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        toId: Number(existingUser.userId), 
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (notifications.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No notifications found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Notification list fetched successfully",
      data: notifications,
    });
  } catch (error) {
    console.error("🔥 Error in userNotificationList:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


module.exports = { adminSendNotification, userNotificationList };
