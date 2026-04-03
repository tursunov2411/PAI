import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/profile", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        clerkId: req.userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

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
    const user = await prisma.user.findUnique({
      where: {
        clerkId: req.userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        clerkId: req.userId,
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

