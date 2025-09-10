require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;
const fs = require("fs");
const path = require("path");

const fetchSession = async (req, res) => {
  console.log("first");
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
        message: "User ID and roleId are required",
      });
    }
    console.log("req.body", req.body);
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    const sessions = await prisma.event.findMany({
      include: {
        sessions: true,
      },
    });
    console.log("sessions", sessions);
    res.status(200).json({
      status: true,
      message: "Session updated successfully!",
      data: sessions,
    });
  } catch (error) {
    console.error("Session upload error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};
const joinSession = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { userId, roleId, eventId } = req.body;

    if (!userId || !roleId || !eventId) {
      return res.status(400).json({
        status: false,
        message: "UserId, EventId and roleId are required",
      });
    }

    console.log("req.body", req.body);

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    // Check if the event/session exists
    const sessionFound = await prisma.event.findUnique({
      where: {
        eventId: Number(eventId),
      },
      select: {
        eventId: true,
      },
    });

    if (!sessionFound) {
      return res.status(404).json({
        status: false,
        message: "Session does not exist",
      });
    }

    console.log("session found", sessionFound);

    // Check if user already joined this session
    const isSessionExist = await prisma.chooseSession.findFirst({
      where: {
        userId: Number(userId),
        eventId: Number(eventId),
      },
    });

    if (isSessionExist) {
      return res.status(200).json({
        status: false,
        message: "You have already joined this session.",
      });
    }

    // Create the join record
    const joinedSession = await prisma.chooseSession.create({
      data: {
        userId: Number(userId),
        eventId: sessionFound.eventId,
      },
    });

    res.status(200).json({
      status: true,
      message: "Session joined successfully!",
      data: joinedSession,
    });
  } catch (error) {
    console.error("Session join error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = { fetchSession, joinSession };
