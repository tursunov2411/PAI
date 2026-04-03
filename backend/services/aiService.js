import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { prisma } from "../lib/prisma.js";
import { createHttpError } from "../lib/http.js";
import { searchMemories } from "./memoryService.js";

const MODEL_CONFIG = {
  "gpt-4o": {
    provider: "openai",
    providerModel: "gpt-4o",
    envKey: "OPENAI_API_KEY",
    label: "GPT-4o",
  },
  "claude-sonnet": {
    provider: "anthropic",
    providerModel: "claude-sonnet-4-20250514",
    envKey: "ANTHROPIC_API_KEY",
    label: "Claude Sonnet",
  },
  "gemini-pro": {
    provider: "gemini",
    providerModel: "gemini-1.5-pro",
    envKey: "GOOGLE_GEMINI_API_KEY",
    label: "Gemini Pro",
  },
};

const GOAL_PRIORITIES = {
  high: 0,
  medium: 1,
  low: 2,
};

let openaiClient;
let anthropicClient;
let geminiClient;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const FULL_WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const GOAL_CATEGORY_COLORS = {
  Academic: "#7c6af7",
  Career: "#10a37f",
  Personal: "#f59e0b",
  Financial: "#38bdf8",
  Health: "#ef4444",
};

const normalizeText = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).join("\n");
  }

  if (typeof value === "object") {
    if (value.text) {
      return normalizeText(value.text);
    }

    if (Array.isArray(value.parts)) {
      return normalizeText(value.parts);
    }

    if (Array.isArray(value.content)) {
      return normalizeText(value.content);
    }
  }

  return "";
};

const escapeJsonBlock = (text) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const safeDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const formatDate = (value) => {
  const date = safeDate(value);

  if (!date) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const truncate = (text, maxLength = 180) => {
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const estimateTokens = (text = "") => Math.ceil(text.trim().length / 4);

const escapeHtml = (text = "") =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToHtml = (text = "") =>
  normalizeText(text)
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");

const parseTimeToMinutes = (value = "00:00") => {
  const [hours, minutes] = String(value)
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
    return null;
  }

  return hours * 60 + minutes;
};

const minutesToTime = (value) => {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatIsoDate = (value) => {
  const date = safeDate(value);
  return date.toISOString().slice(0, 10);
};

const hasConfiguredModel = (model) => Boolean(process.env[MODEL_CONFIG[model]?.envKey]);

const getFirstAvailableModel = (preferredModel = "gpt-4o") => {
  if (preferredModel && hasConfiguredModel(preferredModel)) {
    return preferredModel;
  }

  return Object.keys(MODEL_CONFIG).find((model) => hasConfiguredModel(model)) || null;
};

export const resolvePreferredModelForUser = async (userId, preferredModel = null) => {
  const recentConversation = await prisma.conversation.findFirst({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      model: true,
    },
  });

  return (
    getFirstAvailableModel(preferredModel || recentConversation?.model || "claude-sonnet") ||
    preferredModel ||
    recentConversation?.model ||
    "claude-sonnet"
  );
};

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw createHttpError(500, "OPENAI_API_KEY is not configured.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
};

const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw createHttpError(500, "ANTHROPIC_API_KEY is not configured.");
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return anthropicClient;
};

const getGeminiClient = () => {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw createHttpError(500, "GOOGLE_GEMINI_API_KEY is not configured.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  }

  return geminiClient;
};

const normalizeChatMessages = (messages = []) =>
  messages
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: normalizeText(message.content),
    }))
    .filter((message) => message.content);

const toAnthropicMessages = (messages = []) =>
  normalizeChatMessages(messages).map((message) => ({
    role: message.role,
    content: message.content,
  }));

const toGeminiContents = (messages = []) =>
  normalizeChatMessages(messages).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

const getActiveGoals = async (userId) => {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: {
        not: "completed",
      },
    },
  });

  return goals.sort((left, right) => {
    const leftPriority = GOAL_PRIORITIES[left.priority] ?? 10;
    const rightPriority = GOAL_PRIORITIES[right.priority] ?? 10;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDeadline = safeDate(left.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDeadline = safeDate(right.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  });
};

export const getPersonalizedContext = async (userId, userQuery) => {
  const userProfile = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!userProfile) {
    throw createHttpError(404, "User profile not found.");
  }

  const activeGoals = await getActiveGoals(userId);

  let relevantMemories = [];
  try {
    relevantMemories = await searchMemories(userId, userQuery, 8);
  } catch (error) {
    console.warn("Memory lookup skipped while building prompt:", error.message);
  }

  const goalsSection = activeGoals.length
    ? activeGoals
        .map(
          (goal) =>
            `- ${goal.title} | status: ${goal.status} | priority: ${goal.priority} | deadline: ${formatDate(goal.deadline)}`,
        )
        .join("\n")
    : "- No active goals yet.";

  const memoriesSection = relevantMemories.length
    ? relevantMemories
        .map(
          (memory, index) =>
            `${index + 1}. [${memory.source} | ${formatDate(memory.date)}] ${truncate(memory.text, 220)}`,
        )
        .join("\n")
    : "No relevant memories were retrieved.";

  const aboutMe = userProfile.aboutMe?.trim() || "No additional profile context provided yet.";
  const prompt = `You are ${userProfile.assistantName}, the personal AI assistant of ${userProfile.name}.

ABOUT ${userProfile.name}:
${aboutMe}

ACTIVE GOALS:
${goalsSection}

RELEVANT MEMORIES FROM PAST CONVERSATIONS:
${memoriesSection}

INSTRUCTIONS:
- Reference past conversations and goals naturally
- Proactively suggest next actions tied to active goals
- If a goal deadline is close, mention it
- Tone: ${userProfile.tonePreference}
- Language: ${userProfile.language}
- End every response with: 'Suggested next action: [one concrete task]'`;

  return {
    prompt,
    userProfile,
    activeGoals,
    relevantMemories,
  };
};

export const buildPersonalizedSystemPrompt = async (userId, userQuery) => {
  const context = await getPersonalizedContext(userId, userQuery);
  return context.prompt;
};

async function* streamOpenAIResponse(messages, systemPrompt) {
  const client = getOpenAIClient();
  const stream = await client.chat.completions.create({
    model: MODEL_CONFIG["gpt-4o"].providerModel,
    stream: true,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...normalizeChatMessages(messages),
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) {
      yield delta;
    }
  }
}

async function* streamAnthropicResponse(messages, systemPrompt) {
  const client = getAnthropicClient();
  const stream = await client.messages.create({
    model: MODEL_CONFIG["claude-sonnet"].providerModel,
    system: systemPrompt,
    max_tokens: 1400,
    temperature: 0.7,
    stream: true,
    messages: toAnthropicMessages(messages),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      const delta = event.delta.text;
      if (delta) {
        yield delta;
      }
    }
  }
}

async function* streamGeminiResponse(messages, systemPrompt) {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: MODEL_CONFIG["gemini-pro"].providerModel,
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContentStream({
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1400,
    },
  });

  let emittedText = "";

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (!text) {
      continue;
    }

    const delta = text.startsWith(emittedText) ? text.slice(emittedText.length) : text;
    emittedText = text;

    if (delta) {
      yield delta;
    }
  }
}

export async function* streamChatResponse({
  userId: _userId,
  messages,
  model,
  systemPrompt,
}) {
  if (!MODEL_CONFIG[model]) {
    throw createHttpError(400, `Unsupported model "${model}".`);
  }

  if (!hasConfiguredModel(model)) {
    throw createHttpError(500, `${MODEL_CONFIG[model].label} is not configured on the server.`);
  }

  switch (model) {
    case "gpt-4o":
      yield* streamOpenAIResponse(messages, systemPrompt);
      break;
    case "claude-sonnet":
      yield* streamAnthropicResponse(messages, systemPrompt);
      break;
    case "gemini-pro":
      yield* streamGeminiResponse(messages, systemPrompt);
      break;
    default:
      throw createHttpError(400, `Unsupported model "${model}".`);
  }
}

const extractOpenAIText = (response) =>
  normalizeText(response?.choices?.[0]?.message?.content);

const extractAnthropicText = (response) =>
  (response?.content || [])
    .map((item) => (item.type === "text" ? item.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

const extractGeminiText = (response) => response?.response?.text?.() || "";

const generateTextWithModel = async ({
  model,
  systemPrompt,
  messages,
  jsonMode = false,
  temperature = 0.5,
  maxTokens = 1600,
}) => {
  if (!MODEL_CONFIG[model]) {
    throw createHttpError(400, `Unsupported model "${model}".`);
  }

  if (!hasConfiguredModel(model)) {
    throw createHttpError(500, `${MODEL_CONFIG[model].label} is not configured on the server.`);
  }

  if (model === "gpt-4o") {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: MODEL_CONFIG[model].providerModel,
      temperature,
      max_tokens: maxTokens,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...normalizeChatMessages(messages),
      ],
    });

    return extractOpenAIText(response);
  }

  if (model === "claude-sonnet") {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODEL_CONFIG[model].providerModel,
      system: systemPrompt,
      max_tokens: maxTokens,
      temperature,
      messages: toAnthropicMessages(messages),
    });

    return extractAnthropicText(response);
  }

  const client = getGeminiClient();
  const geminiModel = client.getGenerativeModel({
    model: MODEL_CONFIG[model].providerModel,
    systemInstruction: systemPrompt,
  });

  const response = await geminiModel.generateContent({
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  return extractGeminiText(response);
};

const generateText = async (options) => {
  const selectedModel = getFirstAvailableModel(options.model);

  if (!selectedModel) {
    throw createHttpError(500, "No AI provider is configured. Add an OpenAI, Anthropic, or Gemini API key.");
  }

  return generateTextWithModel({
    ...options,
    model: selectedModel,
  });
};

const parseJsonResponse = (text) => {
  try {
    return JSON.parse(escapeJsonBlock(text));
  } catch (error) {
    throw createHttpError(500, `Failed to parse AI JSON response: ${error.message}`);
  }
};

const sanitizeResources = (resources = []) =>
  resources
    .filter(Boolean)
    .map((resource) => ({
      title: normalizeText(resource.title) || "Recommended resource",
      type: normalizeText(resource.type) || "article",
      ...(resource.url ? { url: normalizeText(resource.url) } : {}),
      why: normalizeText(resource.why) || "Supports the current learning goal.",
    }));

const buildFallbackStudyPlan = (goal, userContext) => {
  const weeksUntilDeadline = goal.deadline
    ? Math.max(
        4,
        Math.min(
          8,
          Math.ceil(
            (safeDate(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7),
          ),
        ),
      )
    : 4;

  const weeklyPlan = Array.from({ length: weeksUntilDeadline }, (_, index) => ({
    week: index + 1,
    theme:
      index === 0
        ? `Foundations for ${goal.title}`
        : index === weeksUntilDeadline - 1
          ? `Consolidation and output for ${goal.title}`
          : `Focused practice for ${goal.title}`,
    dailyTasks: DAY_NAMES.map((day, dayIndex) => ({
      day,
      task:
        dayIndex === 0
          ? `Review the main concept behind "${goal.title}" and define what success looks like.`
          : dayIndex === 4
            ? `Reflect on the week's progress for "${goal.title}" and log the next improvement step.`
            : `Complete one focused session that moves "${goal.title}" forward with practical work.`,
      duration: dayIndex === 2 ? "60-75 min" : "45-60 min",
      resources: [
        `${goal.title} notes`,
        `${userContext?.userProfile?.assistantName || "Your assistant"} check-in`,
      ],
    })),
  }));

  const milestones = weeklyPlan.map((week) => ({
    week: week.week,
    milestone:
      week.week === 1
        ? `Set your baseline and environment for ${goal.title}`
        : week.week === weeklyPlan.length
          ? `Ship or demonstrate a meaningful outcome for ${goal.title}`
          : `Reach a measurable improvement checkpoint for ${goal.title}`,
  }));

  return {
    goalId: goal.id,
    weeklyPlan,
    milestones,
    recommendedResources: [
      {
        title: `${goal.title} roadmap`,
        type: "guide",
        why: "Provides a clear progression path for the goal.",
      },
      {
        title: "Focused practice log",
        type: "template",
        why: "Helps track consistency and surface weak points quickly.",
      },
    ],
  };
};

const coerceStudyPlan = (goal, plan) => ({
  goalId: goal.id,
  weeklyPlan: Array.isArray(plan?.weeklyPlan)
    ? plan.weeklyPlan.map((week, index) => ({
        week: Number(week?.week) || index + 1,
        theme: normalizeText(week?.theme) || `Week ${index + 1}`,
        dailyTasks: Array.isArray(week?.dailyTasks)
          ? week.dailyTasks.map((task, taskIndex) => ({
              day: normalizeText(task?.day) || DAY_NAMES[taskIndex % DAY_NAMES.length],
              task: normalizeText(task?.task) || "Focused study session",
              duration: normalizeText(task?.duration) || "45-60 min",
              resources: Array.isArray(task?.resources)
                ? task.resources.map((resource) => normalizeText(resource)).filter(Boolean)
                : [],
            }))
          : [],
      }))
    : [],
  milestones: Array.isArray(plan?.milestones)
    ? plan.milestones.map((milestone, index) => ({
        week: Number(milestone?.week) || index + 1,
        milestone: normalizeText(milestone?.milestone) || `Week ${index + 1} checkpoint`,
      }))
    : [],
  recommendedResources: sanitizeResources(plan?.recommendedResources || []),
});

export const generateGoalStudyPlan = async (goal, userContext = {}) => {
  const fallbackPlan = buildFallbackStudyPlan(goal, userContext);

  try {
    const memoriesSection = (userContext.relevantMemories || [])
      .map(
        (memory, index) =>
          `${index + 1}. [${memory.source} | ${formatDate(memory.date)}] ${truncate(memory.text, 180)}`,
      )
      .join("\n");

    const activeGoalsSection = (userContext.activeGoals || [])
      .filter((item) => item.id !== goal.id)
      .slice(0, 5)
      .map((item) => `- ${item.title} (${item.status}, deadline: ${formatDate(item.deadline)})`)
      .join("\n");

    const systemPrompt = `You create practical, ambitious study plans for personal AI operating systems.
Return only valid JSON with this exact top-level shape:
{
  "goalId": "string",
  "weeklyPlan": [
    {
      "week": 1,
      "theme": "string",
      "dailyTasks": [
        {
          "day": "Monday",
          "task": "string",
          "duration": "string",
          "resources": ["string"]
        }
      ]
    }
  ],
  "milestones": [
    {
      "week": 1,
      "milestone": "string"
    }
  ],
  "recommendedResources": [
    {
      "title": "string",
      "type": "string",
      "url": "string",
      "why": "string"
    }
  ]
}`;

    const userPrompt = `Build a study plan for this goal.

GOAL:
- id: ${goal.id}
- title: ${goal.title}
- category: ${goal.category}
- description: ${goal.description || "No description provided"}
- deadline: ${formatDate(goal.deadline)}
- priority: ${goal.priority}
- progress: ${goal.progress}%

USER CONTEXT:
- name: ${userContext.userProfile?.name || "User"}
- about: ${userContext.userProfile?.aboutMe || "No about me provided"}
- tone: ${userContext.userProfile?.tonePreference || "balanced"}
- language: ${userContext.userProfile?.language || "en"}

OTHER ACTIVE GOALS:
${activeGoalsSection || "- None"}

RELEVANT MEMORIES:
${memoriesSection || "- None"}

Make the plan concrete, realistic, and outcome-oriented.`;

    const responseText = await generateText({
      model: "gpt-4o",
      systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 2200,
    });

    const parsed = parseJsonResponse(responseText);
    return coerceStudyPlan(goal, parsed);
  } catch (error) {
    console.warn("Falling back to deterministic study plan:", error.message);
    return fallbackPlan;
  }
};

const fallbackSummary = (text, style) => {
  const sentences = normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 6);

  if (style === "bullet") {
    return sentences.map((sentence) => `- ${sentence}`).join("\n");
  }

  if (style === "flashcards") {
    return sentences
      .slice(0, 4)
      .map((sentence, index) => `Q${index + 1}: What is a key point?\nA${index + 1}: ${sentence}`)
      .join("\n\n");
  }

  return sentences.join(" ");
};

export const summarizeText = async (text, style = "bullet", options = {}) => {
  if (!normalizeText(text)) {
    return "";
  }

  try {
    return await generateText({
      model: options.model || "gpt-4o",
      systemPrompt:
        "You create concise, high-signal summaries. Follow the requested format exactly and do not add extra framing.",
      messages: [
        {
          role: "user",
          content: `Summarize the following text in ${style} style:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 1200,
    });
  } catch (error) {
    console.warn("Falling back to local summarizer:", error.message);
    return fallbackSummary(text, style);
  }
};

const stripCodeFences = (text = "") =>
  normalizeText(text)
    .replace(/^```(?:html|markdown|md|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const buildFallbackFlashcards = (text = "") =>
  normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((sentence, index) => ({
      front: `Key idea ${index + 1}`,
      back: sentence,
    }));

const fallbackNoteHtml = (note, action) => {
  const paragraphs = normalizeText(note.plainText || note.title);
  const baseHtml = note.content?.trim() || textToHtml(paragraphs);

  if (action === "expand") {
    return `${baseHtml}<p>${escapeHtml(
      `Add one worked example, one practical application, and one follow-up question for "${note.title}".`,
    )}</p>`;
  }

  return textToHtml(paragraphs);
};

export const applyNoteAiAction = async ({ userId, note, action, model }) => {
  const selectedModel = await resolvePreferredModelForUser(userId, model);
  const noteText = normalizeText(note.plainText || note.title);

  if (!noteText) {
    return action === "flashcards" ? [] : "";
  }

  if (action === "summarize") {
    const result = await summarizeText(
      `Create exactly 3 bullets for this note:\n\nTitle: ${note.title}\n\n${noteText}`,
      "bullet",
      { model: selectedModel },
    );

    return result
      .split("\n")
      .filter(Boolean)
      .slice(0, 3)
      .join("\n");
  }

  if (action === "flashcards") {
    try {
      const responseText = await generateText({
        model: selectedModel,
        systemPrompt: `You convert notes into active-recall flashcards.
Return only valid JSON in this exact shape:
{
  "flashcards": [
    {
      "front": "string",
      "back": "string"
    }
  ]
}`,
        messages: [
          {
            role: "user",
            content: `Create 6 to 12 concise flashcards from this note.\n\nTitle: ${note.title}\n\n${noteText}`,
          },
        ],
        jsonMode: true,
        temperature: 0.4,
        maxTokens: 1600,
      });

      const parsed = parseJsonResponse(responseText);
      const flashcards = Array.isArray(parsed?.flashcards) ? parsed.flashcards : [];

      if (!flashcards.length) {
        return buildFallbackFlashcards(noteText);
      }

      return flashcards.map((card, index) => ({
        front: normalizeText(card.front) || `Key idea ${index + 1}`,
        back: normalizeText(card.back) || "Review the original note for more detail.",
      }));
    } catch (error) {
      console.warn("Falling back to local flashcard generation:", error.message);
      return buildFallbackFlashcards(noteText);
    }
  }

  if (action === "expand" || action === "improve") {
    try {
      const responseText = await generateText({
        model: selectedModel,
        systemPrompt: `You edit notes and return only clean semantic HTML.
Allowed tags: p, h2, h3, ul, ol, li, blockquote, pre, code, strong, em, mark, a.
Do not wrap the response in markdown fences.
Do not add commentary before or after the HTML.`,
        messages: [
          {
            role: "user",
            content:
              action === "expand"
                ? `Expand this note with more depth, examples, and structure while staying faithful to the topic.\n\nTitle: ${note.title}\n\nCurrent note HTML:\n${note.content || textToHtml(noteText)}\n\nPlain text:\n${noteText}`
                : `Improve this note by fixing grammar, tightening structure, and improving clarity without changing the meaning.\n\nTitle: ${note.title}\n\nCurrent note HTML:\n${note.content || textToHtml(noteText)}\n\nPlain text:\n${noteText}`,
          },
        ],
        temperature: action === "expand" ? 0.6 : 0.3,
        maxTokens: 2200,
      });

      return stripCodeFences(responseText) || fallbackNoteHtml(note, action);
    } catch (error) {
      console.warn(`Falling back to local ${action} note transform:`, error.message);
      return fallbackNoteHtml(note, action);
    }
  }

  throw createHttpError(400, `Unsupported note AI action "${action}".`);
};

const buildFallbackWeeklySchedule = ({ weekStartDate, activeGoals = [], freeSlots = [] }) => {
  if (!freeSlots.length || !activeGoals.length) {
    return [];
  }

  const sortedGoals = [...activeGoals].sort((left, right) => {
    const leftPriority = GOAL_PRIORITIES[left.priority] ?? 10;
    const rightPriority = GOAL_PRIORITIES[right.priority] ?? 10;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftDeadline = safeDate(left.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDeadline = safeDate(right.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  });

  const sessions = [];
  const remainingByGoal = new Map(
    sortedGoals.map((goal) => {
      const deadlineDays = goal.deadline
        ? Math.ceil((safeDate(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 999;
      const baseCount = goal.priority === "high" ? 3 : goal.priority === "medium" ? 2 : 1;
      const urgencyBonus = deadlineDays <= 10 ? 1 : 0;
      return [goal.id, Math.min(4, baseCount + urgencyBonus)];
    }),
  );

  for (const slot of freeSlots) {
    const goal = sortedGoals.find((item) => (remainingByGoal.get(item.id) || 0) > 0);

    if (!goal) {
      break;
    }

    const slotStart = parseTimeToMinutes(slot.startTime);
    const slotEnd = parseTimeToMinutes(slot.endTime);

    if (slotStart === null || slotEnd === null || slotEnd - slotStart < 45) {
      continue;
    }

    const duration = Math.max(45, Math.min(90, slotEnd - slotStart >= 75 ? 75 : slotEnd - slotStart));
    sessions.push({
      title: `${goal.title} focus session`,
      subject: goal.category,
      date: slot.date || formatIsoDate(weekStartDate),
      startTime: slot.startTime,
      endTime: minutesToTime(slotStart + duration),
      duration,
      goalId: goal.id,
      notes: `Auto-generated study block for ${goal.title}.`,
      color: GOAL_CATEGORY_COLORS[goal.category] || "#7c6af7",
    });

    remainingByGoal.set(goal.id, (remainingByGoal.get(goal.id) || 1) - 1);
  }

  return sessions;
};

const coerceScheduleBlocks = (blocks = [], weekStartDate, activeGoals = []) => {
  const validGoalIds = new Set(activeGoals.map((goal) => goal.id));

  return blocks
    .map((block, index) => {
      const startTime = normalizeText(block.startTime) || "09:00";
      const endTime = normalizeText(block.endTime) || "10:00";
      const startMinutes = parseTimeToMinutes(startTime) ?? 540;
      const endMinutes = parseTimeToMinutes(endTime) ?? startMinutes + 60;
      const duration = Math.max(30, Number(block.duration) || endMinutes - startMinutes || 60);

      return {
        title: normalizeText(block.title) || `Study block ${index + 1}`,
        subject: normalizeText(block.subject) || "Focused study",
        date: normalizeText(block.date) || formatIsoDate(addDays(safeDate(weekStartDate), index % 7)),
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(Math.max(startMinutes + 30, parseTimeToMinutes(endTime) ?? startMinutes + duration)),
        duration,
        goalId: validGoalIds.has(block.goalId) ? block.goalId : null,
        notes: normalizeText(block.notes) || null,
        color: normalizeText(block.color) || "#7c6af7",
      };
    })
    .filter((block) => block.title && block.subject);
};

export const generateWeeklyStudySchedule = async ({
  userId,
  weekStartDate,
  activeGoals = [],
  calendarEvents = [],
  freeSlots = [],
  userProfile,
}) => {
  const fallback = buildFallbackWeeklySchedule({
    weekStartDate,
    activeGoals,
    freeSlots,
  });

  if (!activeGoals.length || !freeSlots.length) {
    return fallback;
  }

  try {
    const model = await resolvePreferredModelForUser(userId);
    const prompt = `User's active goals:
${activeGoals
  .map(
    (goal) =>
      `- ${goal.id} | ${goal.title} | ${goal.category} | priority: ${goal.priority} | deadline: ${formatDate(goal.deadline)} | progress: ${goal.progress}%`,
  )
  .join("\n")}

Calendar events (blocked time):
${calendarEvents.length ? calendarEvents.map((event) => `- ${event}`).join("\n") : "- None connected"}

Free slots available:
${freeSlots
  .map((slot) => `- ${slot.date} | ${slot.startTime}-${slot.endTime}`)
  .join("\n")}

Build a weekly study schedule for ${userProfile?.name || "the user"}.
Prioritize high-priority goals and nearest deadlines.
Use 45-90 minute blocks.
Return only valid JSON in this exact shape:
{
  "blocks": [
    {
      "title": "string",
      "subject": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "duration": 60,
      "goalId": "string",
      "notes": "string",
      "color": "#7c6af7"
    }
  ]
}`;

    const responseText = await generateText({
      model,
      systemPrompt:
        "You are a study-planning assistant that outputs only valid JSON and makes realistic, balanced weekly schedules.",
      messages: [{ role: "user", content: prompt }],
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 2200,
    });

    const parsed = parseJsonResponse(responseText);
    const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
    const coercedBlocks = coerceScheduleBlocks(blocks, weekStartDate, activeGoals);
    return coercedBlocks.length ? coercedBlocks : fallback;
  } catch (error) {
    console.warn("Falling back to deterministic weekly schedule:", error.message);
    return fallback;
  }
};

const buildFallbackSuggestions = ({ activeGoals = [], recentMessages = [] }) => {
  const suggestions = [];

  const nearDeadlineGoal = activeGoals
    .filter((goal) => safeDate(goal.deadline))
    .sort((left, right) => safeDate(left.deadline) - safeDate(right.deadline))[0];

  if (nearDeadlineGoal) {
    const daysLeft = Math.max(
      0,
      Math.ceil((safeDate(nearDeadlineGoal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );

    suggestions.push({
      title: `${nearDeadlineGoal.title} is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      reason: "The nearest deadline deserves a concrete next step today.",
      prefill: `Help me make progress on "${nearDeadlineGoal.title}" before the deadline.`,
    });
  }

  const inProgressGoal = activeGoals.find((goal) => goal.status === "in_progress");
  if (inProgressGoal) {
    suggestions.push({
      title: `Push ${inProgressGoal.title} forward`,
      reason: "Consistent progress compounds fastest on goals already underway.",
      prefill: `What should I work on next for "${inProgressGoal.title}"?`,
    });
  }

  const lastUserMessage = [...recentMessages].reverse().find((message) => message.role === "user");
  if (lastUserMessage) {
    suggestions.push({
      title: "Continue the last thread",
      reason: "Your most recent question likely has a clear follow-up task.",
      prefill: `Continue from this idea: ${truncate(lastUserMessage.content, 120)}`,
    });
  }

  while (suggestions.length < 3) {
    suggestions.push({
      title: "Review your priorities",
      reason: "A short planning check keeps the system aligned with what matters most.",
      prefill: "Help me choose the most important task to focus on next.",
    });
  }

  return suggestions.slice(0, 3);
};

export const generateSmartSuggestions = async ({
  userProfile,
  activeGoals,
  recentMessages,
  recentMemories,
}) => {
  const fallback = buildFallbackSuggestions({
    activeGoals,
    recentMessages,
  });

  try {
    const systemPrompt = `You create proactive, specific personal productivity suggestions.
Return only valid JSON in this exact shape:
{
  "suggestions": [
    {
      "title": "string",
      "reason": "string",
      "prefill": "string"
    }
  ]
}`;

    const messagesSummary = recentMessages
      .slice(-8)
      .map((message) => `${message.role}: ${truncate(message.content, 160)}`)
      .join("\n");

    const memorySummary = recentMemories
      .slice(0, 6)
      .map((memory) => `- ${memory.source} | ${formatDate(memory.date)} | ${truncate(memory.text, 120)}`)
      .join("\n");

    const goalsSummary = activeGoals
      .slice(0, 8)
      .map((goal) => `- ${goal.title} | ${goal.status} | ${goal.priority} | deadline: ${formatDate(goal.deadline)}`)
      .join("\n");

    const prompt = `Create 3 proactive action suggestions for ${userProfile.name}.

USER PROFILE:
- name: ${userProfile.name}
- about: ${userProfile.aboutMe || "No extra profile context"}
- assistant: ${userProfile.assistantName}
- tone: ${userProfile.tonePreference}

ACTIVE GOALS:
${goalsSummary || "- None"}

RECENT MESSAGES:
${messagesSummary || "- None"}

RECENT MEMORIES:
${memorySummary || "- None"}

Make each suggestion specific, actionable, and different from the others.`;

    const responseText = await generateText({
      model: "gpt-4o",
      systemPrompt,
      messages: [{ role: "user", content: prompt }],
      jsonMode: true,
      temperature: 0.5,
      maxTokens: 1200,
    });

    const parsed = parseJsonResponse(responseText);
    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

    if (!suggestions.length) {
      return fallback;
    }

    return suggestions.slice(0, 3).map((suggestion, index) => ({
      title: normalizeText(suggestion.title) || fallback[index]?.title || "Suggested next move",
      reason: normalizeText(suggestion.reason) || fallback[index]?.reason || "Useful next step.",
      prefill: normalizeText(suggestion.prefill) || fallback[index]?.prefill || "Help me decide what to do next.",
    }));
  } catch (error) {
    console.warn("Falling back to heuristic suggestions:", error.message);
    return fallback;
  }
};

export const estimateChatCost = (messages, model) => {
  const tokenCount = normalizeChatMessages(messages).reduce(
    (sum, message) => sum + estimateTokens(message.content),
    0,
  );

  const modelMultiplier = {
    "gpt-4o": 0.00001,
    "claude-sonnet": 0.000008,
    "gemini-pro": 0.000006,
  };

  return {
    estimatedTokens: tokenCount,
    estimatedCost: Number(((modelMultiplier[model] || 0.000008) * tokenCount).toFixed(4)),
  };
};
