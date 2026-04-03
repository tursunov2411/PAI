import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserByClerkIdOrThrow } from "../lib/currentUser.js";
import { createHttpError } from "../lib/http.js";
import {
  generateGoalStudyPlan,
  getPersonalizedContext,
} from "../services/aiService.js";

const router = express.Router();

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};

const sortGoals = (goals = []) =>
  [...goals].sort((left, right) => {
    const leftPriority = PRIORITY_ORDER[left.priority] ?? 10;
    const rightPriority = PRIORITY_ORDER[right.priority] ?? 10;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftDeadline !== rightDeadline) {
      return leftDeadline - rightDeadline;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

const getGoalOrThrow = async (goalId, userId) => {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
  });

  if (!goal) {
    throw createHttpError(404, "Goal not found.");
  }

  return goal;
};

router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);

    if (!req.body.title?.trim()) {
      throw createHttpError(400, "Goal title is required.");
    }

    if (!req.body.category?.trim()) {
      throw createHttpError(400, "Goal category is required.");
    }

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: req.body.title.trim(),
        category: req.body.category.trim(),
        description: req.body.description?.trim() || null,
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        priority: req.body.priority || "medium",
        status: req.body.status || "not_started",
      },
    });

    return res.status(201).json({
      success: true,
      goal,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);

    const goals = await prisma.goal.findMany({
      where: {
        userId: user.id,
        ...(req.query.status ? { status: String(req.query.status) } : {}),
        ...(req.query.category ? { category: String(req.query.category) } : {}),
        ...(req.query.priority ? { priority: String(req.query.priority) } : {}),
      },
    });

    return res.json({
      success: true,
      goals: sortGoals(goals),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const goal = await getGoalOrThrow(req.params.id, user.id);

    return res.json({
      success: true,
      goal,
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    await getGoalOrThrow(req.params.id, user.id);

    const goal = await prisma.goal.update({
      where: {
        id: req.params.id,
      },
      data: {
        ...(req.body.title !== undefined ? { title: req.body.title?.trim() } : {}),
        ...(req.body.category !== undefined ? { category: req.body.category?.trim() } : {}),
        ...(req.body.description !== undefined
          ? { description: req.body.description?.trim() || null }
          : {}),
        ...(req.body.deadline !== undefined
          ? { deadline: req.body.deadline ? new Date(req.body.deadline) : null }
          : {}),
        ...(req.body.priority !== undefined ? { priority: req.body.priority } : {}),
        ...(req.body.status !== undefined ? { status: req.body.status } : {}),
        ...(req.body.progress !== undefined
          ? { progress: Math.max(0, Math.min(100, Number(req.body.progress))) }
          : {}),
      },
    });

    return res.json({
      success: true,
      goal,
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/progress", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    await getGoalOrThrow(req.params.id, user.id);

    const progress = Math.max(0, Math.min(100, Number(req.body.progress)));

    if (Number.isNaN(progress)) {
      throw createHttpError(400, "Progress must be a number between 0 and 100.");
    }

    const goal = await prisma.goal.update({
      where: {
        id: req.params.id,
      },
      data: {
        progress,
        status: progress === 100 ? "completed" : req.body.status || undefined,
      },
    });

    return res.json({
      success: true,
      goal,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    await getGoalOrThrow(req.params.id, user.id);

    await prisma.goal.delete({
      where: {
        id: req.params.id,
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/generate-plan", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const goal = await getGoalOrThrow(req.params.id, user.id);
    const context = await getPersonalizedContext(
      user.id,
      `${goal.title}\n${goal.description || ""}`,
    );

    const studyPlan = await generateGoalStudyPlan(goal, context);

    const updatedGoal = await prisma.goal.update({
      where: {
        id: goal.id,
      },
      data: {
        studyPlan,
      },
    });

    return res.json({
      success: true,
      goal: updatedGoal,
      studyPlan,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

