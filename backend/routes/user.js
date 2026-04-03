import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserByClerkIdOrThrow } from "../lib/currentUser.js";

const router = express.Router();

router.use(requireAuth);

router.get("/profile", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/profile", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
        ...(req.body.aboutMe !== undefined ? { aboutMe: req.body.aboutMe } : {}),
        ...(req.body.tonePreference !== undefined
          ? { tonePreference: req.body.tonePreference }
          : {}),
        ...(req.body.assistantName !== undefined
          ? { assistantName: req.body.assistantName }
          : {}),
        ...(req.body.language !== undefined ? { language: req.body.language } : {}),
      },
    });

    return res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
