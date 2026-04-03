import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserByClerkIdOrThrow } from "../lib/currentUser.js";
import { createHttpError } from "../lib/http.js";
import {
  deleteMemory,
  searchMemories,
  storeMemory,
  updateMemory,
} from "../services/memoryService.js";
import { applyNoteAiAction } from "../services/aiService.js";

const router = express.Router();

const DEFAULT_NOTE_SOURCE = "manual";
const DEFAULT_NOTE_CATEGORY = "Ideas";

const toBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes"].includes(value.toLowerCase());
  }

  return false;
};

const sanitizeTags = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((tag) => String(tag || "").trim()).filter(Boolean))];
};

const normalizePlainText = (value, fallbackTitle) => {
  const text = String(value || "").trim();
  return text || String(fallbackTitle || "Untitled").trim();
};

const buildNoteMemoryPayload = (noteInput, goal) => ({
  source: "manual",
  category: goal?.category || DEFAULT_NOTE_CATEGORY,
  text: normalizePlainText(noteInput.plainText, noteInput.title),
  date: new Date(),
});

const serializeNote = (note, semanticScore = null) => ({
  ...note,
  goalTitle: note.goal?.title || null,
  semanticScore,
});

const getGoalOrNull = async (goalId, userId) => {
  if (!goalId) {
    return null;
  }

  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
  });

  if (!goal) {
    throw createHttpError(404, "Linked goal not found.");
  }

  return goal;
};

const getNoteOrThrow = async (noteId, userId) => {
  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
      userId,
    },
    include: {
      goal: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
    },
  });

  if (!note) {
    throw createHttpError(404, "Note not found.");
  }

  return note;
};

router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const title = String(req.body.title || "").trim() || "Untitled";
    const content = String(req.body.content || "").trim() || "<p></p>";
    const plainText = normalizePlainText(req.body.plainText, title);
    const tags = sanitizeTags(req.body.tags);
    const source = String(req.body.source || DEFAULT_NOTE_SOURCE).trim() || DEFAULT_NOTE_SOURCE;
    const goal = await getGoalOrNull(req.body.goalId, user.id);

    let memory = null;
    let syncWarning = null;

    try {
      memory = await storeMemory(user.id, buildNoteMemoryPayload({ title, plainText }, goal));
    } catch (error) {
      syncWarning = error.message;
    }

    const note = await prisma.note.create({
      data: {
        userId: user.id,
        goalId: goal?.id || null,
        memoryId: memory?.id || null,
        title,
        content,
        plainText,
        tags,
        source,
      },
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      note: serializeNote(note),
      ...(syncWarning ? { warning: `Note saved, but memory sync failed: ${syncWarning}` } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const search = String(req.query.search || "").trim();
    const baseWhere = {
      userId: user.id,
      ...(req.query.goalId ? { goalId: String(req.query.goalId) } : {}),
      ...(req.query.tag ? { tags: { has: String(req.query.tag) } } : {}),
      ...(req.query.isPinned !== undefined ? { isPinned: toBoolean(req.query.isPinned) } : {}),
    };

    let semanticScoreMap = new Map();
    if (search) {
      try {
        const matches = await searchMemories(user.id, search, 20);
        semanticScoreMap = new Map(
          matches.map((match) => [match.id, Number(match.score || 0)]),
        );
      } catch (error) {
        console.warn("Notes semantic search fallback to text search:", error.message);
      }
    }

    if (search) {
      const notes = await prisma.note.findMany({
        where: {
          ...baseWhere,
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              plainText: {
                contains: search,
                mode: "insensitive",
              },
            },
            ...(semanticScoreMap.size
              ? [
                  {
                    memoryId: {
                      in: [...semanticScoreMap.keys()],
                    },
                  },
                ]
              : []),
          ],
        },
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
      });

      const sortedNotes = notes
        .map((note) => serializeNote(note, semanticScoreMap.get(note.memoryId) || null))
        .sort((left, right) => {
          const leftScore = left.semanticScore || 0;
          const rightScore = right.semanticScore || 0;

          if (leftScore !== rightScore) {
            return rightScore - leftScore;
          }

          if (left.isPinned !== right.isPinned) {
            return Number(right.isPinned) - Number(left.isPinned);
          }

          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        });

      const paginated = sortedNotes.slice((page - 1) * limit, page * limit);

      return res.json({
        success: true,
        notes: paginated,
        total: sortedNotes.length,
        page,
        limit,
      });
    }

    const [notes, total] = await prisma.$transaction([
      prisma.note.findMany({
        where: baseWhere,
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.note.count({
        where: baseWhere,
      }),
    ]);

    return res.json({
      success: true,
      notes: notes.map((note) => serializeNote(note)),
      total,
      page,
      limit,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/tags", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const notes = await prisma.note.findMany({
      where: {
        userId: user.id,
      },
      select: {
        tags: true,
      },
    });

    const counts = new Map();
    for (const note of notes) {
      for (const tag of note.tags || []) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    const tags = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));

    return res.json({
      success: true,
      tags,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const note = await getNoteOrThrow(req.params.id, user.id);

    return res.json({
      success: true,
      note: serializeNote(note),
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const existingNote = await getNoteOrThrow(req.params.id, user.id);

    const title =
      req.body.title !== undefined
        ? String(req.body.title || "").trim() || "Untitled"
        : existingNote.title;
    const content =
      req.body.content !== undefined
        ? String(req.body.content || "").trim() || "<p></p>"
        : existingNote.content;
    const plainText =
      req.body.plainText !== undefined
        ? normalizePlainText(req.body.plainText, title)
        : existingNote.plainText;
    const tags = req.body.tags !== undefined ? sanitizeTags(req.body.tags) : existingNote.tags;
    const source =
      req.body.source !== undefined
        ? String(req.body.source || DEFAULT_NOTE_SOURCE).trim() || DEFAULT_NOTE_SOURCE
        : existingNote.source;
    const goal =
      req.body.goalId !== undefined ? await getGoalOrNull(req.body.goalId, user.id) : existingNote.goal;

    let memoryId = existingNote.memoryId;
    let syncWarning = null;
    const shouldSyncMemory =
      req.body.title !== undefined ||
      req.body.plainText !== undefined ||
      req.body.goalId !== undefined ||
      (!existingNote.memoryId && plainText);

    if (shouldSyncMemory && plainText) {
      try {
        const memoryPayload = buildNoteMemoryPayload({ title, plainText }, goal);
        if (existingNote.memoryId) {
          const updatedMemory = await updateMemory(existingNote.memoryId, user.id, memoryPayload);
          memoryId = updatedMemory.id;
        } else {
          const createdMemory = await storeMemory(user.id, memoryPayload);
          memoryId = createdMemory.id;
        }
      } catch (error) {
        syncWarning = error.message;
      }
    }

    const note = await prisma.note.update({
      where: {
        id: existingNote.id,
      },
      data: {
        title,
        content,
        plainText,
        tags,
        source,
        goalId: goal?.id || null,
        memoryId,
      },
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      note: serializeNote(note),
      ...(syncWarning ? { warning: `Note updated, but memory sync failed: ${syncWarning}` } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const note = await getNoteOrThrow(req.params.id, user.id);

    await prisma.note.delete({
      where: {
        id: note.id,
      },
    });

    let syncWarning = null;
    if (note.memoryId) {
      try {
        await deleteMemory(note.memoryId, user.id);
      } catch (error) {
        syncWarning = error.message;
      }
    }

    return res.json({
      success: true,
      ...(syncWarning ? { warning: `Note deleted, but memory cleanup failed: ${syncWarning}` } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/pin", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const note = await getNoteOrThrow(req.params.id, user.id);

    const updatedNote = await prisma.note.update({
      where: {
        id: note.id,
      },
      data: {
        isPinned: !note.isPinned,
      },
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      note: serializeNote(updatedNote),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/ai", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const note = await getNoteOrThrow(req.params.id, user.id);
    const action = String(req.body.action || "").trim();

    if (!["summarize", "expand", "flashcards", "improve"].includes(action)) {
      throw createHttpError(400, "Invalid AI note action.");
    }

    const result = await applyNoteAiAction({
      userId: user.id,
      note,
      action,
      model: req.body.model,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
