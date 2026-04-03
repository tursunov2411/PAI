import dotenv from "dotenv";
import { verifyToken } from "@clerk/clerk-sdk-node";

dotenv.config();

const extractBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const requireAuth = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Missing authorization token.",
    });
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    req.userId = payload.sub;
    req.auth = payload;
    next();
  } catch (error) {
    console.error("Clerk token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

