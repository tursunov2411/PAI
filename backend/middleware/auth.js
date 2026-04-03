import dotenv from "dotenv";

dotenv.config();

const SINGLE_USER_CLERK_ID = process.env.SINGLE_USER_CLERK_ID || "single-user";

export const requireAuth = async (req, res, next) => {
  req.userId = SINGLE_USER_CLERK_ID;
  req.auth = {
    mode: "single-user",
  };
  next();
};
