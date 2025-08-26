require("dotenv").config();
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
// const cookieParser = require("cookie-parser");

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = "180d";
const REFRESH_TOKEN_EXPIRY = "7d";

function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

const verifyToken= (allowedRoles) => (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Access denied, token missing" });
  }
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
    return res.status(500).json({ error: "Internal server error" });
  }
  const decoded = jwt.verify(token, JWT_SECRET);
  try {
    req.user = decoded;
    if (!allowedRoles.includes(req.user.roleId)) {
      return res.status(403).json({ message: 'Forbidden - permission denied' });
    }
    next();
  } catch (error) {
    console.log("Token verification error:", error.message);

    if (error.name === "TokenExpiredError") {
      console.log("Access token expired, attempting to refresh...");

      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res
          .status(401)
          .json({ error: "Session expired, please log in again" });
      }

      try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        req.user = decoded;

        const newAccessToken = generateAccessToken({
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          phone: decoded.phone,
        });

        res.setHeader("Authorization", `Bearer ${newAccessToken}`);
        res.json({ accessToken: newAccessToken }); // Return in response
        next();
      } catch (refreshError) {
        console.error("Refresh token error:", refreshError.message);
        return res
          .status(401)
          .json({ error: "Invalid refresh token, please log in again" });
      }
    } else {
      console.error("Invalid token:", error.message);
      return res.status(401).json({ error: "Invalid token" });
    }
  }
}

const checkRoutePermission = () => {
  return async (req, res, next) => {
    const { userId, roleId, routeKey } = req.body;

    // Validate inputs
    if (!userId || !roleId || !routeKey) {
      return res.status(400).json({
        status: false,
        message: "userId, roleId, and routeKey are required.",
      });
    }

    try {
      const subadmin = await prisma.subadmin.findFirst({
        where: {
          userId: Number(userId),
        },
        include: {
          user: true,
        },
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

      const permissions = subadmin.permissions; // assuming this is a JSON object

      if (!permissions || permissions[routeKey] !== 1) {
        return res.status(403).json({
          status: false,
          message: `Access denied to route: ${routeKey}`,
        });
      }

      next(); // All checks passed
    } catch (error) {
      console.error("Permission middleware error:", error);
      res.status(500).json({
        status: false,
        message: "Internal server error during permission check.",
      });
    }
  };
};


module.exports = {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  checkRoutePermission
};
