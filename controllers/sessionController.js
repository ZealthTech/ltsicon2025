require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const moment = require("moment/moment");
const prisma = new PrismaClient();

//all session fetch
const fetchSession = async (req, res) => {
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

    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    // Fetch all events with their sessions
    const events = await prisma.event.findMany({
      orderBy: [{ eventDate: "asc" }, { sequence: "asc" }],
      include: {
        eventDetail: true,
        sessions: {
          where: { userId: Number(userId) },
        },
      },
    });

    // Utility function to format a single name or comma-separated names
    const cleanName = (name) => {
      if (!name || typeof name !== "string") return "";
      return name
        .split(",") // split by comma
        .map(
          (n) =>
            n
              .trim() // remove extra spaces
              .replace(/^(Dr\.?|Prof\.?)\s+/i, "") // remove prefixes
              .replace(/\s+/g, " ") // collapse multiple spaces
              .replace(/\b\w/g, (char) => char.toUpperCase()) // capitalize words
        )
        .filter(Boolean) // remove empty strings
        .join(", "); // join back together
    };

    const formatted = events.map(
      ({ eventDetail, sessions, eventDate, ...rest }) => {
        const formattedEvent = {
          ...rest,
          chairperson: cleanName(rest.chairpersons),
          panelist: cleanName(rest.panelists),
          moderator: cleanName(rest.moderator),
          speaker: cleanName(rest.speakerName),
          eventDate: moment(eventDate).format("Do MMM, YYYY"),
          isJoined: sessions.length > 0 ? 1 : 0,
        };

        const formattedEventDetail = Array.isArray(eventDetail)
          ? eventDetail.map((detail) => ({
              id: detail.id,
              chairperson: cleanName(detail.chairpersons || detail.chairperson),
              panelist: cleanName(detail.panelists || detail.panelist),
              moderator: cleanName(detail.moderator),
              speaker: cleanName(detail.speakerName || detail.speaker),
            }))
          : eventDetail
          ? {
              id: eventDetail.id,
              chairperson: cleanName(
                eventDetail.chairpersons || eventDetail.chairperson
              ),
              panelist: cleanName(
                eventDetail.panelists || eventDetail.panelist
              ),
              moderator: cleanName(eventDetail.moderator),
              speaker: cleanName(
                eventDetail.speakerName || eventDetail.speaker
              ),
            }
          : null;

        return {
          ...formattedEvent,
          eventDetail: formattedEventDetail,
        };
      }
    );

    res.status(200).json({
      status: true,
      message: "Sessions fetched successfully!",
      data: formatted,
    });
  } catch (error) {
    console.error("Session fetch error:", error);
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

    const updatedJoinedSession = {
      ...joinedSession,
      status: 1,
    };
    res.status(200).json({
      status: true,
      message: "Session joined successfully!",
      data: updatedJoinedSession,
    });
  } catch (error) {
    console.error("Session join error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const mySession = async (req, res) => {
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

    // Find the user's session
    const userSessions = await prisma.chooseSession.findMany({
      where: {
        userId: Number(userId),
      },
      include: {
        event: true,
      },
    });

    if (!userSessions || userSessions.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No sessions found for this user.",
      });
    }

    console.log("userSession", userSessions);

    res.status(200).json({
      status: true,
      message: "Session retrieved successfully!",
      data: userSessions,
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const speciality = async (req, res) => {
  try {
    const categories = [
      "Surgery",
      "Hepatology",
      "Anesthesia & Critical Care",
      "Pediatric Hepatology",
      "Radiology/Interventional Radiology",
      "Miscellaneous",
      "Pathology",
    ];
    // Send response
    res.status(200).json({
      status: true,
      message: "Specialities fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Speciality fetch error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
const rooms = async (req, res) => {
  try {
    const roomlist = await prisma.rooms.findMany({});
    console.log("room", roomlist);
    res.status(200).json({
      status: true,
      message: "Rooms fetched successfully",
      data: roomlist,
    });
  } catch (error) {
    console.error("Rooms fetch error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
const days = async (req, res) => {
  try {
    const dayslist = await prisma.days.findMany();
    const formattedDays = dayslist.map((day) => ({
      ...day,
      formattedDate: moment(day.eventDate).format("Do MMM, YYYY"),
    }));

    res.status(200).json({
      status: true,
      message: "Days fetched successfully",
      data: formattedDays,
    });
  } catch (error) {
    console.error("Days fetch error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
const sessionList = async (req, res) => {
  try {
    console.log("kakakak");
    const categories = [
      "Oral Abstracts",
      "Meet the expert",
      "Vanguard sessions",
      "Joint sessions",
      "Plenary Session",
      "Workshops",
      "Debates",
      "Focussed group discussion",
      "State of Art  Lecture",
      "Panel Discussion",
      "Lecture",
    ];
    // Send response
    res.status(200).json({
      status: true,
      message: "Specialities fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Speciality fetch error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = {
  fetchSession,
  joinSession,
  mySession,
  speciality,
  sessionList,
  rooms,
  days,
};
