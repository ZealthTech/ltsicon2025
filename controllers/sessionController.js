require("dotenv").config();
const prisma = require('../prisma'); 
const moment = require("moment/moment");
const he = require("iconv-lite");

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
    const skipPrefix = (name) => {
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
    function repairEncoding(str = "") {
      return he.decode(Buffer.from(str, "binary"), "utf8");
    }
    const formatted = events.map(
      ({ eventDetail, sessions, eventDate, ...rest }) => {
        console.log("HEH", repairEncoding(rest.title));
        const formattedEvent = {
          ...rest,
          title: repairEncoding(rest.title),
          chairperson: skipPrefix(rest.chairpersons),
          panelist: skipPrefix(rest.panelists),
          moderator: skipPrefix(rest.moderator),
          speaker: skipPrefix(rest.speakerName),
          eventDate: moment(eventDate).format("Do MMM, YYYY"),
          isJoined: sessions.length > 0 ? 1 : 0,
        };

        const formattedEventDetail = Array.isArray(eventDetail)
          ? eventDetail.map((detail) => ({
            id: detail.eventDetailId,
            eventId: detail.eventId,
            startTime: detail.startTime,
            endTime: detail.endTime,
            genre: detail.genre,
            topic: detail.topic,
            panelist: skipPrefix(detail.panelists),
            moderator: skipPrefix(detail.moderator),
            speaker: skipPrefix(detail.speaker),
          }))
          : eventDetail
            ? {
              id: eventDetail.eventDetailId,
              eventId: eventDetail.eventId,
              startTime: eventDetail.startTime,
              endTime: eventDetail.endTime,
              genre: eventDetail.genre,
              topic: eventDetail.topic,
              panelist: skipPrefix(eventDetail.panelists),
              moderator: skipPrefix(eventDetail.moderator),
              speaker: skipPrefix(eventDetail.speaker),
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
const deleteSession = async (req, res) => {
  console.log("ajjjja")
  try {
    if (req.method !== "DELETE") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
      return res.status(400).json({
        status: false,
        message: "User ID and event ID are required",
      });
    }
console.log("req.body",req.body)
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }

    const existingSession = await prisma.chooseSession.findFirst({
      where: {
        userId: Number(userId),
        eventId: Number(eventId),
      },
    });

    if (!existingSession) {
      return res.status(404).json({
        status: false,
        message: "Session not found or already deleted.",
      });
    }
console.log("existing",existingSession)
    await prisma.chooseSession.delete({
      where: {
        id: existingSession.id, // Assuming `id` is the primary key
      },
    });

    console.log("Deleted session:", existingSession.id);

    return res.status(200).json({
      status: true,
      message: "Session deleted successfully!",
    });
  } catch (error) {
    console.error("Session delete error:", error);
    return res.status(500).json({
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
  deleteSession,
  speciality,
  sessionList,
  rooms,
  days,
};
