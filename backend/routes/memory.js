import express from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  deleteMemory,
  getMemoryStats,
  importChatGPTExport,
  importClaudeExport,
  importManualText,
  listMemories,
  searchMemories,
} from "../services/memoryService.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const getUserRecord = async (clerkId) =>
  prisma.user.findUnique({
    where: {
      clerkId,
    },
  });

router.use(requireAuth);

router.post("/import/chatgpt", upload.single("export"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Upload a ChatGPT export JSON file in the 'export' field.",
      });
    }

    const user = await getUserRecord(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const result = await importChatGPTExport(user.id, req.file.buffer.toString("utf8"));
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/import/claude", upload.single("export"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Upload a Claude export JSON file in the 'export' field.",
      });
    }

    const user = await getUserRecord(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const result = await importClaudeExport(user.id, req.file.buffer.toString("utf8"));
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/import/manual", async (req, res, next) => {
  try {
    const user = await getUserRecord(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    if (!req.body.text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Manual import text is required.",
      });
    }

    const memories = await importManualText(user.id, req.body.text, req.body.category);
    return res.json({
      success: true,
      memories,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/list", async (req, res, next) => {
  try {
    const user = await getUserRecord(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const result = await listMemories(user.id, req.query);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/search", async (req, res, next) => {
  try {
    const user = await getUserRecord(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const results = await searchMemories(user.id, req.body.query, req.body.topK || 8);
    return res.json({
      success: true,
      results,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const user = await getUserRecord(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const stats = await getMemoryStats(user.id);
    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const user = await getUserRecord(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    await deleteMemory(req.params.id, user.id);
    return res.json({
      success: true,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
