import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getOrCreateSingleUser } from "../lib/currentUser.js";

const router = express.Router();

router.post("/sync", requireAuth, async (req, res, next) => {
  try {
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
  } catch (error) {
    return next(error);
  }
});

export default router;
