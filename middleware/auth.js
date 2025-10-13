require("dotenv").config();
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = "1d"; // Short-lived, safer
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived

// --- Token Generators ---
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// --- Verify Access Token Middleware ---
const verifyToken = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      if (!JWT_SECRET) {
        console.error("JWT_SECRET is not defined");
        return res.status(500).json({ error: "Internal server error" });
      }

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Access token expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
      }
      console.log("decoded", token)
      console.log("decoded", decoded)
      // Fetch user from DB based on decoded userId
      const user = await prisma.user.findUnique({
        where: { userId: Number(decoded.userId) },
        select: {
          userId: true,
          email: true,
          roleId: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Role check
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.roleId)) {
        return res
          .status(403)
          .json({ message: "Forbidden - insufficient permissions" });
      }

      // Attach safe user info to request
      req.user = user;

      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

// --- Refresh Access Token ---
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ error: "No refresh token, please log in again" });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Extra security: check refresh token against DB/session store if stored
    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      roleId: decoded.roleId,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      phone: decoded.phone,
    });

    res.setHeader("Authorization", `Bearer ${newAccessToken}`);
    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    return res
      .status(401)
      .json({ error: "Invalid refresh token, please log in again" });
  }
};

// --- Route Permission Middleware for Subadmins ---
const checkRoutePermission = () => {
  return async (req, res, next) => {
    try {
      const { routeKey } = req.body;

      if (!routeKey) {
        return res.status(400).json({
          status: false,
          message: "routeKey is required.",
        });
      }

      // Use user info from verified JWT, NOT body
      const { userId, roleId } = req.user;

      const subadmin = await prisma.subadmin.findFirst({
        where: { userId: Number(userId) },
        include: { user: true },
      });

      if (!subadmin) {
        return res.status(404).json({
          status: false,
          message: "Subadmin not found.",
        });
      }

      if (subadmin.user.roleId !== Number(roleId)) {
        return res.status(403).json({
          status: false,
          message: "Role mismatch for the given user.",
        });
      }

      const permissions = subadmin.permissions; // JSON column in DB
      if (!permissions || permissions[routeKey] !== 1) {
        return res.status(403).json({
          status: false,
          message: `Access denied to route: ${routeKey}`,
        });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error during permission check.",
      });
    }
  };
};

module.exports = {
  verifyToken,
  refreshAccessToken,
  generateAccessToken,
  generateRefreshToken,
  checkRoutePermission,
};
