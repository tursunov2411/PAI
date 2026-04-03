import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserByClerkIdOrThrow } from "../lib/currentUser.js";
import { createHttpError } from "../lib/http.js";
import {
  estimateChatCost,
  generateSmartSuggestions,
  getPersonalizedContext,
  streamChatResponse,
} from "../services/aiService.js";
import { searchMemories } from "../services/memoryService.js";

const router = express.Router();

const deriveConversationTitle = (content = "") => {
  const clean = content.trim().replace(/\s+/g, " ");
  return clean.length > 50 ? `${clean.slice(0, 50).trim()}...` : clean || "New conversation";
};

const writeSseEvent = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const getConversationOrThrow = async (conversationId, userId) => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!conversation) {
    throw createHttpError(404, "Conversation not found.");
  }

  return conversation;
};

const getRecentConversationMessages = async (conversationId) => {
  const recentMessages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return recentMessages.reverse();
};

router.use(requireAuth);

router.post("/message", async (req, res, next) => {
  let assistantText = "";

  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const { message, conversationId, model = "claude-sonnet", goalId = null } = req.body;

    if (!message?.trim()) {
      throw createHttpError(400, "Message text is required.");
    }

    let pinnedGoal = null;
    if (goalId) {
      pinnedGoal = await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId: user.id,
        },
      });
    }

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id,
        },
      });

      if (!conversation) {
        throw createHttpError(404, "Conversation not found.");
      }

      if (conversation.model !== model) {
        conversation = await prisma.conversation.update({
          where: {
            id: conversation.id,
          },
          data: {
            model,
          },
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: deriveConversationTitle(message),
          model,
        },
      });
    }

    const savedUserMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message.trim(),
        model,
      },
    });

    await prisma.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    const history = await getRecentConversationMessages(conversation.id);
    const personalizedContext = await getPersonalizedContext(user.id, message);

    let systemPrompt = personalizedContext.prompt;
    if (pinnedGoal) {
      systemPrompt = `${systemPrompt}

PINNED GOAL FOR THIS CONVERSATION:
- ${pinnedGoal.title}
- category: ${pinnedGoal.category}
- description: ${pinnedGoal.description || "No description provided"}
- deadline: ${pinnedGoal.deadline ? new Date(pinnedGoal.deadline).toISOString() : "No deadline"}
- progress: ${pinnedGoal.progress}%`;
    }

    const costEstimate = estimateChatCost(history, model);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    writeSseEvent(res, {
      type: "conversation",
      conversationId: conversation.id,
      title: conversation.title,
      model,
      messageId: savedUserMessage.id,
      pinnedGoal,
    });
    writeSseEvent(res, {
      type: "context",
      memories: personalizedContext.relevantMemories,
      goals: personalizedContext.activeGoals,
      costEstimate,
    });

    for await (const token of streamChatResponse({
      userId: user.id,
      messages: history,
      model,
      systemPrompt,
    })) {
      assistantText += token;
      writeSseEvent(res, {
        type: "token",
        token,
      });
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantText.trim(),
        model,
      },
    });

    const refreshedConversation = await prisma.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        title: conversation.title || deriveConversationTitle(message),
        updatedAt: new Date(),
      },
    });

    writeSseEvent(res, {
      type: "done",
      conversationId: refreshedConversation.id,
      title: refreshedConversation.title,
      assistantMessage,
    });
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      return next(error);
    }

    writeSseEvent(res, {
      type: "error",
      message: error.message || "Streaming failed.",
    });

    if (assistantText.trim()) {
      console.warn("Partial assistant output discarded after streaming error.");
    }

    res.end();
  }
});

router.get("/conversations", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: "asc",
          },
          select: {
            content: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return res.json({
      success: true,
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title:
          conversation.title ||
          deriveConversationTitle(conversation.messages[0]?.content || "New conversation"),
        model: conversation.model,
        messageCount: conversation._count.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/suggestions", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const [userProfile, activeGoals, recentMessages] = await Promise.all([
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
        orderBy: {
          updatedAt: "desc",
        },
        take: 8,
      }),
      prisma.message.findMany({
        where: {
          conversation: {
            userId: user.id,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    const memoryQuery = [
      ...activeGoals.slice(0, 4).map((goal) => goal.title),
      ...recentMessages.slice(0, 4).map((message) => message.content),
    ]
      .filter(Boolean)
      .join("\n");

    let recentMemories = [];
    if (memoryQuery.trim()) {
      try {
        recentMemories = await searchMemories(user.id, memoryQuery, 6);
      } catch (error) {
        console.warn("Suggestions memory lookup skipped:", error.message);
      }
    }

    const suggestions = await generateSmartSuggestions({
      userProfile,
      activeGoals,
      recentMessages,
      recentMemories,
    });

    return res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:conversationId", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    const conversation = await getConversationOrThrow(req.params.conversationId, user.id);

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title || deriveConversationTitle(conversation.messages[0]?.content),
        model: conversation.model,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          model: message.model,
          createdAt: message.createdAt,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:conversationId/title", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    await getConversationOrThrow(req.params.conversationId, user.id);

    if (!req.body.title?.trim()) {
      throw createHttpError(400, "Conversation title is required.");
    }

    const conversation = await prisma.conversation.update({
      where: {
        id: req.params.conversationId,
      },
      data: {
        title: req.body.title.trim(),
      },
    });

    return res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:conversationId", async (req, res, next) => {
  try {
    const user = await getUserByClerkIdOrThrow(req.userId);
    await getConversationOrThrow(req.params.conversationId, user.id);

    await prisma.conversation.delete({
      where: {
        id: req.params.conversationId,
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
