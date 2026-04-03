import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserByClerkIdOrThrow } from "../lib/currentUser.js";
import { createHttpError } from "../lib/http.js";
import { generateWeeklyStudySchedule } from "../services/aiService.js";

const router = express.Router();

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 22 * 60;
const AUTO_SCHEDULED_TAG = "[AUTO_SCHEDULED]";

const parseDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, "Invalid date.");
  }

  return date;
};

const normalizeDateString = (value) => parseDate(value).toISOString().slice(0, 10);

const parseTimeToMinutes = (value) => {
  const [hours, minutes] = String(value || "")
    .split(":")
    .map((part) => Number(part));

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw createHttpError(400, "Time must use HH:MM format.");
  }

  return hours * 60 + minutes;
};

const minutesToTime = (value) => {
  const safeValue = Math.max(0, Math.floor(value));
  const hours = Math.floor(safeValue / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(safeValue % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}`;
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const getWeekRange = (startDate) => {
  const weekStart = parseDate(startDate);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = addDays(weekStart, 7);
  return { weekStart, weekEnd };
};

const getDuration = (startTime, endTime) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    throw createHttpError(400, "End time must be after start time.");
  }

  return endMinutes - startMinutes;
};

const serializeBlock = (block) => ({
  ...block,
  goalTitle: block.goal?.title || null,
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

const getBlockOrThrow = async (blockId, userId) => {
  const block = await prisma.studyBlock.findFirst({
    where: {
      id: blockId,
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

  if (!block) {
    throw createHttpError(404, "Study block not found.");
  }

  return block;
};

const assertNoOverlap = async ({
  userId,
  date,
  startTime,
  endTime,
  excludeBlockId = null,
}) => {
  const blocks = await prisma.studyBlock.findMany({
    where: {
      userId,
      date: parseDate(date),
      ...(excludeBlockId
        ? {
            id: {
              not: excludeBlockId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
    },
  });

  const nextStart = parseTimeToMinutes(startTime);
  const nextEnd = parseTimeToMinutes(endTime);

  const overlapping = blocks.find((block) => {
    const blockStart = parseTimeToMinutes(block.startTime);
    const blockEnd = parseTimeToMinutes(block.endTime);
    return nextStart < blockEnd && nextEnd > blockStart;
  });

  if (overlapping) {
    throw createHttpError(
      409,
      `This block overlaps with "${overlapping.title}" (${overlapping.startTime}-${overlapping.endTime}).`,
    );
  }
};

const buildBusyIntervals = (blocks, calendarEvents = []) => {
  const intervals = [];

  for (const block of blocks) {
    intervals.push({
      start: parseTimeToMinutes(block.startTime),
      end: parseTimeToMinutes(block.endTime),
    });
  }

  for (const event of calendarEvents) {
    try {
      intervals.push({
        start: parseTimeToMinutes(event.startTime),
        end: parseTimeToMinutes(event.endTime),
      });
    } catch (_error) {
      // Ignore malformed external events until calendar integration is available.
    }
  }

  return intervals.sort((left, right) => left.start - right.start);
};

const calculateFreeSlots = (weekStartDate, blocks = [], calendarEvents = []) => {
  const slots = [];

  for (let index = 0; index < 7; index += 1) {
    const currentDate = normalizeDateString(addDays(weekStartDate, index));
    const dayBlocks = blocks.filter((block) => normalizeDateString(block.date) === currentDate);
    const dayEvents = calendarEvents.filter((event) => event.date === currentDate);
    const intervals = buildBusyIntervals(dayBlocks, dayEvents);

    let pointer = DAY_START_MINUTES;
    for (const interval of intervals) {
      const start = Math.max(DAY_START_MINUTES, interval.start);
      const end = Math.min(DAY_END_MINUTES, interval.end);

      if (start > pointer && start - pointer >= 45) {
        slots.push({
          date: currentDate,
          startTime: minutesToTime(pointer),
          endTime: minutesToTime(start),
          duration: start - pointer,
        });
      }

      pointer = Math.max(pointer, end);
    }

    if (DAY_END_MINUTES > pointer && DAY_END_MINUTES - pointer >= 45) {
      slots.push({
        date: currentDate,
        startTime: minutesToTime(pointer),
        endTime: minutesToTime(DAY_END_MINUTES),
        duration: DAY_END_MINUTES - pointer,
      });
    }
  }

  return slots;
};

const fitsFreeSlot = (block, freeSlots) => {
  const start = parseTimeToMinutes(block.startTime);
  const end = parseTimeToMinutes(block.endTime);

  return freeSlots.some((slot) => {
    if (slot.date !== normalizeDateString(block.date)) {
      return false;
    }

    const slotStart = parseTimeToMinutes(slot.startTime);
    const slotEnd = parseTimeToMinutes(slot.endTime);
    return start >= slotStart && end <= slotEnd;
  });
};

const normalizePreviewBlocks = (blocks, freeSlots) => {
  const accepted = [];
  const occupied = new Map();

  for (const block of blocks) {
    try {
      const date = normalizeDateString(block.date);
      const startTime = block.startTime;
      const endTime = block.endTime;
      const duration = getDuration(startTime, endTime);

      if (!fitsFreeSlot({ ...block, date, startTime, endTime }, freeSlots)) {
        continue;
      }

      const dayBlocks = occupied.get(date) || [];
      const nextStart = parseTimeToMinutes(startTime);
      const nextEnd = parseTimeToMinutes(endTime);
      const hasOverlap = dayBlocks.some(
        (item) => nextStart < item.endMinutes && nextEnd > item.startMinutes,
      );

      if (hasOverlap) {
        continue;
      }

      dayBlocks.push({
        startMinutes: nextStart,
        endMinutes: nextEnd,
      });
      occupied.set(date, dayBlocks);

      accepted.push({
        title: String(block.title || "").trim() || "Study block",
        subject: String(block.subject || "").trim() || "Focused study",
        date,
        startTime,
        endTime,
        duration,
        goalId: block.goalId || null,
        notes: `${AUTO_SCHEDULED_TAG} ${String(block.notes || "").trim()}`.trim(),
        color: String(block.color || "#7c6af7"),
      });
    } catch (_error) {
      // Drop malformed AI-generated blocks.
    }
  }

  return accepted;
};

router.use(requireAuth);

router.get("/week", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const { weekStart, weekEnd } = getWeekRange(req.query.startDate);

    const blocks = await prisma.studyBlock.findMany({
      where: {
        userId: user.id,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
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
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const grouped = {};
    for (let index = 0; index < 7; index += 1) {
      const key = normalizeDateString(addDays(weekStart, index));
      grouped[key] = [];
    }

    for (const block of blocks) {
      const key = normalizeDateString(block.date);
      grouped[key] = grouped[key] || [];
      grouped[key].push(serializeBlock(block));
    }

    return res.json({
      success: true,
      weekStart,
      weekEnd: addDays(weekEnd, -1),
      groupedBlocks: grouped,
      blocks: blocks.map((block) => serializeBlock(block)),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/block", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const title = String(req.body.title || "").trim();
    const subject = String(req.body.subject || "").trim();
    const date = normalizeDateString(req.body.date);
    const startTime = String(req.body.startTime || "").trim();
    const endTime = String(req.body.endTime || "").trim();

    if (!title || !subject) {
      throw createHttpError(400, "Title and subject are required.");
    }

    const duration = getDuration(startTime, endTime);
    const goal = await getGoalOrNull(req.body.goalId, user.id);
    await assertNoOverlap({
      userId: user.id,
      date,
      startTime,
      endTime,
    });

    const block = await prisma.studyBlock.create({
      data: {
        userId: user.id,
        goalId: goal?.id || null,
        title,
        subject,
        date: parseDate(date),
        startTime,
        endTime,
        duration,
        notes: String(req.body.notes || "").trim() || null,
        color: String(req.body.color || "#7c6af7"),
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
      block: serializeBlock(block),
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/block/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const existingBlock = await getBlockOrThrow(req.params.id, user.id);
    const goal =
      req.body.goalId !== undefined ? await getGoalOrNull(req.body.goalId, user.id) : existingBlock.goal;

    const title =
      req.body.title !== undefined ? String(req.body.title || "").trim() : existingBlock.title;
    const subject =
      req.body.subject !== undefined ? String(req.body.subject || "").trim() : existingBlock.subject;
    const date =
      req.body.date !== undefined ? normalizeDateString(req.body.date) : normalizeDateString(existingBlock.date);
    const startTime =
      req.body.startTime !== undefined ? String(req.body.startTime || "").trim() : existingBlock.startTime;
    const endTime =
      req.body.endTime !== undefined ? String(req.body.endTime || "").trim() : existingBlock.endTime;

    if (!title || !subject) {
      throw createHttpError(400, "Title and subject are required.");
    }

    const duration = getDuration(startTime, endTime);
    await assertNoOverlap({
      userId: user.id,
      date,
      startTime,
      endTime,
      excludeBlockId: existingBlock.id,
    });

    const block = await prisma.studyBlock.update({
      where: {
        id: existingBlock.id,
      },
      data: {
        title,
        subject,
        date: parseDate(date),
        startTime,
        endTime,
        duration,
        goalId: goal?.id || null,
        notes:
          req.body.notes !== undefined
            ? String(req.body.notes || "").trim() || null
            : existingBlock.notes,
        color:
          req.body.color !== undefined ? String(req.body.color || "#7c6af7") : existingBlock.color,
        status:
          req.body.status !== undefined ? String(req.body.status || "scheduled") : existingBlock.status,
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
      block: serializeBlock(block),
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/block/:id/status", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const block = await getBlockOrThrow(req.params.id, user.id);
    const status = String(req.body.status || "").trim();

    if (!["done", "skipped", "scheduled"].includes(status)) {
      throw createHttpError(400, "Invalid block status.");
    }

    const updatedBlock = await prisma.studyBlock.update({
      where: {
        id: block.id,
      },
      data: {
        status,
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

    const progressSuggestion =
      status === "done" && updatedBlock.goalId
        ? {
            goalId: updatedBlock.goalId,
            suggestedIncrement: Math.max(5, Math.min(20, Math.round(updatedBlock.duration / 15))),
            message: `You finished ${updatedBlock.duration} minutes for "${updatedBlock.goal?.title}". Consider updating goal progress.`,
          }
        : null;

    return res.json({
      success: true,
      block: serializeBlock(updatedBlock),
      progressSuggestion,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/block/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const block = await getBlockOrThrow(req.params.id, user.id);

    await prisma.studyBlock.delete({
      where: {
        id: block.id,
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/auto-schedule", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const weekStartDate = normalizeDateString(req.body.weekStartDate);
    const confirm = Boolean(req.body.confirm);
    const { weekStart, weekEnd } = getWeekRange(weekStartDate);

    if (confirm) {
      const previewBlocks = Array.isArray(req.body.blocks) ? req.body.blocks : [];

      if (!previewBlocks.length) {
        throw createHttpError(400, "No preview blocks were provided to confirm.");
      }

      await prisma.studyBlock.deleteMany({
        where: {
          userId: user.id,
          status: "scheduled",
          date: {
            gte: weekStart,
            lt: weekEnd,
          },
          notes: {
            contains: AUTO_SCHEDULED_TAG,
          },
        },
      });

      const createdBlocks = [];
      for (const previewBlock of previewBlocks) {
        const goal = await getGoalOrNull(previewBlock.goalId, user.id);
        const date = normalizeDateString(previewBlock.date);
        const startTime = String(previewBlock.startTime || "").trim();
        const endTime = String(previewBlock.endTime || "").trim();
        const duration = getDuration(startTime, endTime);

        await assertNoOverlap({
          userId: user.id,
          date,
          startTime,
          endTime,
        });

        const created = await prisma.studyBlock.create({
          data: {
            userId: user.id,
            goalId: goal?.id || null,
            title: String(previewBlock.title || "").trim() || "Study block",
            subject: String(previewBlock.subject || "").trim() || "Focused study",
            date: parseDate(date),
            startTime,
            endTime,
            duration,
            notes: `${AUTO_SCHEDULED_TAG} ${String(previewBlock.notes || "")
              .replace(AUTO_SCHEDULED_TAG, "")
              .trim()}`.trim(),
            color: String(previewBlock.color || "#7c6af7"),
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

        createdBlocks.push(serializeBlock(created));
      }

      return res.json({
        success: true,
        blocks: createdBlocks,
      });
    }

    const [userProfile, activeGoals, existingBlocks] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: user.id,
        },
      }),
      prisma.goal.findMany({
        where: {
          userId: user.id,
          status: {
            not: "completed",
          },
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.studyBlock.findMany({
        where: {
          userId: user.id,
          date: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
      }),
    ]);

    const calendarEvents = [];
    const freeSlots = calculateFreeSlots(weekStart, existingBlocks, calendarEvents);

    const preview = await generateWeeklyStudySchedule({
      userId: user.id,
      weekStartDate,
      activeGoals,
      calendarEvents,
      freeSlots,
      userProfile,
    });

    const previewBlocks = normalizePreviewBlocks(preview, freeSlots);

    return res.json({
      success: true,
      previewBlocks,
      freeSlots,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const startDate = req.query.startDate ? parseDate(req.query.startDate) : addDays(new Date(), -30);
    const endDate = req.query.endDate ? addDays(parseDate(req.query.endDate), 1) : addDays(new Date(), 1);

    const blocks = await prisma.studyBlock.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        goal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const totalScheduledMinutes = blocks.reduce((sum, block) => sum + block.duration, 0);
    const totalCompletedMinutes = blocks
      .filter((block) => block.status === "done")
      .reduce((sum, block) => sum + block.duration, 0);
    const completionRate = totalScheduledMinutes
      ? Math.round((totalCompletedMinutes / totalScheduledMinutes) * 100)
      : 0;

    const hoursPerGoalMap = new Map();
    const dayMap = new Map();

    for (const block of blocks) {
      const goalKey = block.goalId || "unlinked";
      const previousGoalStats = hoursPerGoalMap.get(goalKey) || {
        goalId: block.goalId,
        title: block.goal?.title || "Unlinked",
        scheduledHours: 0,
        completedHours: 0,
      };

      previousGoalStats.scheduledHours += block.duration / 60;
      if (block.status === "done") {
        previousGoalStats.completedHours += block.duration / 60;
      }
      hoursPerGoalMap.set(goalKey, previousGoalStats);

      const dayKey = normalizeDateString(block.date);
      const previousDay = dayMap.get(dayKey) || {
        date: dayKey,
        plannedHours: 0,
        doneHours: 0,
      };

      previousDay.plannedHours += block.duration / 60;
      if (block.status === "done") {
        previousDay.doneHours += block.duration / 60;
      }
      dayMap.set(dayKey, previousDay);
    }

    const chartData = [...dayMap.values()].sort((left, right) => left.date.localeCompare(right.date));
    const bestStudyDay =
      chartData.reduce(
        (best, day) => (day.doneHours > (best?.doneHours || 0) ? day : best),
        null,
      ) || null;

    return res.json({
      success: true,
      totalHoursScheduled: Number((totalScheduledMinutes / 60).toFixed(1)),
      totalHoursCompleted: Number((totalCompletedMinutes / 60).toFixed(1)),
      completionRate,
      hoursPerGoal: [...hoursPerGoalMap.values()]
        .map((item) => ({
          ...item,
          scheduledHours: Number(item.scheduledHours.toFixed(1)),
          completedHours: Number(item.completedHours.toFixed(1)),
        }))
        .sort((left, right) => right.completedHours - left.completedHours),
      bestStudyDay,
      chartData,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
