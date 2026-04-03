import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getOrCreateSingleUser } from "../lib/currentUser.js";

const router = express.Router();

const buildCreateInput = (clerkId, body) => ({
  clerkId,
  email: body.email,
  name: body.name || "New User",
  aboutMe: body.aboutMe || null,
  tonePreference: body.tonePreference || "balanced",
  assistantName: body.assistantName || "Sunnatilla AI",
  language: body.language || "en",
});

router.post("/sync", requireAuth, async (req, res, next) => {
  try {
    if (!process.env.CLERK_SECRET_KEY) {
      const singleUser = await getOrCreateSingleUser();
      const user = await prisma.user.update({
        where: {
          id: singleUser.id,
        },
        data: {
          ...(req.body.name ? { name: req.body.name } : {}),
          ...(req.body.email ? { email: req.body.email } : {}),
          ...(req.body.aboutMe !== undefined ? { aboutMe: req.body.aboutMe } : {}),
          ...(req.body.tonePreference ? { tonePreference: req.body.tonePreference } : {}),
          ...(req.body.assistantName ? { assistantName: req.body.assistantName } : {}),
          ...(req.body.language ? { language: req.body.language } : {}),
        },
      });

      return res.json({
        success: true,
        user,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        clerkId: req.userId,
      },
    });

    if (!existingUser && !req.body.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to create a new user profile.",
      });
    }

    const user = existingUser
      ? await prisma.user.update({
          where: {
            clerkId: req.userId,
          },
          data: {
            ...(req.body.name ? { name: req.body.name } : {}),
            ...(req.body.email ? { email: req.body.email } : {}),
            ...(req.body.aboutMe !== undefined ? { aboutMe: req.body.aboutMe } : {}),
            ...(req.body.tonePreference ? { tonePreference: req.body.tonePreference } : {}),
            ...(req.body.assistantName ? { assistantName: req.body.assistantName } : {}),
            ...(req.body.language ? { language: req.body.language } : {}),
          },
        })
      : await prisma.user.create({
          data: buildCreateInput(req.userId, req.body),
        });

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
