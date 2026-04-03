import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { prisma } from "../lib/prisma.js";
import {
  cacheDeleteByPattern,
  cacheGetJson,
  cacheSetJson,
} from "./cacheService.js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;
const DEFAULT_SOURCE_CATEGORY = "Personal";

let pineconeClient;
let pineconeIndex;
let openaiClient;

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

const getPineconeIndexName = () =>
  process.env.PINECONE_INDEX || "sunnatilla-memory";

const normalizeIndexList = (result) => {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.indexes)) {
    return result.indexes;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
};

const waitForIndexReady = async (client, name) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60_000) {
    const description = await client.describeIndex(name);
    if (description?.status?.ready || description?.ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw createHttpError(504, `Timed out waiting for Pinecone index "${name}" to be ready.`);
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
    if (Array.isArray(value.parts)) {
      return normalizeText(value.parts);
    }

    if (Array.isArray(value.content)) {
      return normalizeText(value.content);
    }

    if (value.text) {
      return normalizeText(value.text);
    }

    if (value.value) {
      return normalizeText(value.value);
    }
  }

  return "";
};

const safeDate = (value) => {
  if (!value) {
    return new Date();
  }

  if (typeof value === "number") {
    const timestamp = value > 10_000_000_000 ? value : value * 1_000;
    return new Date(timestamp);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const estimateTokenCount = (text = "") => {
  if (!text.trim()) {
    return 0;
  }

  return Math.ceil(text.trim().length / 4);
};

const splitLongText = (text, maxTokens = 400) => {
  const words = text.split(/\s+/).filter(Boolean);
  const maxWords = Math.max(150, Math.floor(maxTokens * 0.75));
  const chunks = [];

  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }

  return chunks;
};

const chunkTextBlocks = (blocks, maxTokens = 400) => {
  const chunks = [];
  let currentBlocks = [];
  let currentTokens = 0;
  let currentDate = new Date();

  const flush = () => {
    if (!currentBlocks.length) {
      return;
    }

    chunks.push({
      text: currentBlocks.join("\n\n").trim(),
      date: currentDate,
    });

    currentBlocks = [];
    currentTokens = 0;
  };

  for (const block of blocks) {
    const normalized = normalizeText(block.text);

    if (!normalized) {
      continue;
    }

    const tokens = estimateTokenCount(normalized);
    const blockDate = safeDate(block.date);

    if (tokens > maxTokens) {
      flush();

      for (const subChunk of splitLongText(normalized, maxTokens)) {
        chunks.push({
          text: subChunk,
          date: blockDate,
        });
      }

      continue;
    }

    if (currentTokens + tokens > maxTokens && currentBlocks.length) {
      flush();
    }

    currentBlocks.push(normalized);
    currentTokens += tokens;
    currentDate = blockDate;
  }

  flush();
  return chunks;
};

const buildConversationPairs = (messages) => {
  const orderedMessages = [...messages]
    .filter((message) => normalizeText(message.text))
    .sort((left, right) => safeDate(left.date) - safeDate(right.date));

  const pairs = [];
  let pendingUserMessage = null;

  for (const message of orderedMessages) {
    const role = String(message.role || "").toLowerCase();
    const text = normalizeText(message.text);
    const date = safeDate(message.date);

    if (!text) {
      continue;
    }

    if (role === "user" || role === "human") {
      pendingUserMessage = {
        text,
        date,
      };
      continue;
    }

    if (role === "assistant") {
      if (pendingUserMessage) {
        pairs.push({
          text: `User: ${pendingUserMessage.text}\nAssistant: ${text}`,
          date,
        });
        pendingUserMessage = null;
      } else {
        pairs.push({
          text: `Assistant: ${text}`,
          date,
        });
      }
    }
  }

  if (pendingUserMessage) {
    pairs.push({
      text: `User: ${pendingUserMessage.text}`,
      date: pendingUserMessage.date,
    });
  }

  return pairs;
};

const buildImportChunks = (items, source, category = DEFAULT_SOURCE_CATEGORY) =>
  chunkTextBlocks(items, 400).map((chunk) => ({
    source,
    category,
    text: chunk.text,
    date: chunk.date,
  }));

const invalidateMemoryCaches = async (userId) => {
  await cacheDeleteByPattern(`memory:${userId}:*`);
};

const deletePineconeVector = async (index, vectorId) => {
  if (!vectorId) {
    return;
  }

  try {
    await index.deleteOne(vectorId);
    return;
  } catch (_firstError) {
    try {
      await index.deleteMany([vectorId]);
      return;
    } catch (_secondError) {
      await index.delete({
        ids: [vectorId],
      });
    }
  }
};

export const initPinecone = async () => {
  if (!process.env.PINECONE_API_KEY) {
    throw createHttpError(500, "PINECONE_API_KEY is not configured.");
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  if (pineconeIndex) {
    return pineconeIndex;
  }

  const indexName = getPineconeIndexName();
  const existingIndexes = normalizeIndexList(await pineconeClient.listIndexes());
  const indexExists = existingIndexes.some((item) => item?.name === indexName || item === indexName);

  if (!indexExists) {
    await pineconeClient.createIndex({
      name: indexName,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: process.env.PINECONE_REGION || "us-east-1",
        },
      },
    });

    await waitForIndexReady(pineconeClient, indexName);
  }

  pineconeIndex = pineconeClient.index(indexName);
  return pineconeIndex;
};

export const generateEmbedding = async (text) => {
  const content = normalizeText(text);

  if (!content) {
    throw createHttpError(400, "Cannot generate an embedding for empty text.");
  }

  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: content,
  });

  return response.data?.[0]?.embedding || [];
};

export const storeMemory = async (userId, memoryData, options = {}) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw createHttpError(404, "User not found.");
  }

  const text = normalizeText(memoryData.text);
  const date = safeDate(memoryData.date);

  if (!text) {
    throw createHttpError(400, "Memory text is required.");
  }

  const [index, embedding] = await Promise.all([initPinecone(), generateEmbedding(text)]);
  const pineconeId = memoryData.pineconeId || randomUUID();

  await index.upsert([
    {
      id: pineconeId,
      values: embedding,
      metadata: {
        userId,
        source: memoryData.source,
        category: memoryData.category,
        date: date.toISOString(),
        text,
      },
    },
  ]);

  const memory = await prisma.memory.create({
    data: {
      userId,
      source: memoryData.source,
      category: memoryData.category,
      text,
      pineconeId,
      date,
    },
  });

  if (options.invalidateCache !== false) {
    await invalidateMemoryCaches(userId);
  }

  return memory;
};

export const updateMemory = async (memoryId, userId, memoryData, options = {}) => {
  const existingMemory = await prisma.memory.findFirst({
    where: {
      id: memoryId,
      userId,
    },
  });

  if (!existingMemory) {
    throw createHttpError(404, "Memory not found.");
  }

  const text = normalizeText(memoryData.text);
  const date = safeDate(memoryData.date || existingMemory.date);

  if (!text) {
    throw createHttpError(400, "Memory text is required.");
  }

  const [index, embedding] = await Promise.all([initPinecone(), generateEmbedding(text)]);
  const pineconeId = existingMemory.pineconeId || memoryData.pineconeId || randomUUID();

  await index.upsert([
    {
      id: pineconeId,
      values: embedding,
      metadata: {
        userId,
        source: memoryData.source || existingMemory.source,
        category: memoryData.category || existingMemory.category,
        date: date.toISOString(),
        text,
      },
    },
  ]);

  const memory = await prisma.memory.update({
    where: {
      id: memoryId,
    },
    data: {
      source: memoryData.source || existingMemory.source,
      category: memoryData.category || existingMemory.category,
      text,
      pineconeId,
      date,
    },
  });

  if (options.invalidateCache !== false) {
    await invalidateMemoryCaches(userId);
  }

  return memory;
};

export const searchMemories = async (userId, queryText, topK = 8) => {
  const normalizedQuery = normalizeText(queryText);

  if (!normalizedQuery) {
    return [];
  }

  const cacheKey = `memory:${userId}:search:${normalizedQuery}:${topK}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return cached;
  }

  const [index, embedding] = await Promise.all([
    initPinecone(),
    generateEmbedding(normalizedQuery),
  ]);

  const queryResponse = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: {
      userId: {
        $eq: userId,
      },
    },
  });

  const matches = queryResponse.matches || [];
  const pineconeIds = matches.map((match) => match.id).filter(Boolean);

  const memories = await prisma.memory.findMany({
    where: {
      userId,
      pineconeId: {
        in: pineconeIds,
      },
    },
  });

  const memoryMap = new Map(memories.map((memory) => [memory.pineconeId, memory]));
  const results = matches.map((match) => {
    const memory = memoryMap.get(match.id);
    const metadata = match.metadata || {};

    return {
      id: memory?.id || match.id,
      pineconeId: match.id,
      score: Number(match.score || 0),
      text: memory?.text || metadata.text || "",
      source: memory?.source || metadata.source || "manual",
      category: memory?.category || metadata.category || DEFAULT_SOURCE_CATEGORY,
      date: memory?.date || safeDate(metadata.date),
      createdAt: memory?.createdAt || safeDate(metadata.date),
    };
  });

  await cacheSetJson(cacheKey, results, 180);
  return results;
};

export const deleteMemory = async (memoryId, userId) => {
  const memory = await prisma.memory.findFirst({
    where: {
      id: memoryId,
      userId,
    },
  });

  if (!memory) {
    throw createHttpError(404, "Memory not found.");
  }

  await prisma.memory.delete({
    where: {
      id: memoryId,
    },
  });

  if (memory.pineconeId) {
    const index = await initPinecone();
    await deletePineconeVector(index, memory.pineconeId);
  }

  await invalidateMemoryCaches(userId);

  return {
    success: true,
  };
};

export const listMemories = async (userId, filters = {}) => {
  const page = Math.max(Number(filters.page || 1), 1);
  const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
  const source = filters.source || "";
  const category = filters.category || "";
  const dateFrom = filters.dateFrom || "";
  const dateTo = filters.dateTo || "";

  const cacheKey = `memory:${userId}:list:${page}:${limit}:${source}:${category}:${dateFrom}:${dateTo}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return cached;
  }

  const where = {
    userId,
    ...(source ? { source } : {}),
    ...(category ? { category } : {}),
  };

  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: safeDate(dateFrom) } : {}),
      ...(dateTo ? { lte: safeDate(dateTo) } : {}),
    };
  }

  const [memories, total] = await prisma.$transaction([
    prisma.memory.findMany({
      where,
      orderBy: {
        date: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.memory.count({ where }),
  ]);

  const payload = {
    memories,
    total,
    page,
    limit,
  };

  await cacheSetJson(cacheKey, payload, 120);
  return payload;
};

const parseJsonContent = (fileContent) => {
  if (typeof fileContent === "string") {
    return JSON.parse(fileContent);
  }

  return fileContent;
};

const extractChatGptPairs = (conversation) => {
  const messages = Object.values(conversation?.mapping || {})
    .map((item) => item?.message)
    .filter(Boolean)
    .map((message) => ({
      role: message.author?.role,
      text: normalizeText(message.content),
      date: message.create_time || conversation?.create_time,
    }));

  return buildConversationPairs(messages);
};

export const importChatGPTExport = async (userId, fileContent) => {
  const data = parseJsonContent(fileContent);
  const conversations = Array.isArray(data) ? data : data?.conversations || [];
  const chunks = conversations.flatMap((conversation) =>
    buildImportChunks(extractChatGptPairs(conversation), "chatgpt"),
  );

  let imported = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      await storeMemory(userId, chunk, {
        invalidateCache: false,
      });
      imported += 1;
    } catch (error) {
      console.warn("Failed to import ChatGPT chunk:", error.message);
      failed += 1;
    }
  }

  await invalidateMemoryCaches(userId);

  return {
    imported,
    failed,
  };
};

const extractClaudeConversations = (fileContent) => {
  const data = parseJsonContent(fileContent);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.conversations)) {
    return data.conversations;
  }

  if (Array.isArray(data?.chats)) {
    return data.chats;
  }

  return [];
};

const extractClaudePairs = (conversation) => {
  const messages = (conversation?.chat_messages || conversation?.messages || [])
    .map((message) => ({
      role:
        message.role ||
        message.sender ||
        message.author?.role ||
        message.speaker,
      text:
        normalizeText(message.text) ||
        normalizeText(message.content) ||
        normalizeText(message.completion),
      date:
        message.created_at ||
        message.createdAt ||
        message.timestamp ||
        conversation?.created_at,
    }))
    .filter((message) => normalizeText(message.text));

  return buildConversationPairs(messages);
};

export const importClaudeExport = async (userId, fileContent) => {
  const conversations = extractClaudeConversations(fileContent);
  const chunks = conversations.flatMap((conversation) =>
    buildImportChunks(extractClaudePairs(conversation), "claude"),
  );

  let imported = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      await storeMemory(userId, chunk, {
        invalidateCache: false,
      });
      imported += 1;
    } catch (error) {
      console.warn("Failed to import Claude chunk:", error.message);
      failed += 1;
    }
  }

  await invalidateMemoryCaches(userId);

  return {
    imported,
    failed,
  };
};

export const importManualText = async (userId, text, category) => {
  const paragraphs = normalizeText(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      text: paragraph,
      date: new Date(),
    }));

  const chunks = buildImportChunks(paragraphs, "manual", category || DEFAULT_SOURCE_CATEGORY);
  const savedMemories = [];

  for (const chunk of chunks) {
    const savedMemory = await storeMemory(userId, chunk, {
      invalidateCache: false,
    });
    savedMemories.push(savedMemory);
  }

  await invalidateMemoryCaches(userId);
  return savedMemories;
};

export const getMemoryStats = async (userId) => {
  const cacheKey = `memory:${userId}:stats`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return cached;
  }

  const [sourceCounts, categoryCounts, aggregate, memoryRows] = await Promise.all([
    prisma.memory.groupBy({
      by: ["source"],
      where: {
        userId,
      },
      _count: {
        source: true,
      },
    }),
    prisma.memory.groupBy({
      by: ["category"],
      where: {
        userId,
      },
      _count: {
        category: true,
      },
    }),
    prisma.memory.aggregate({
      where: {
        userId,
      },
      _count: {
        id: true,
      },
      _min: {
        date: true,
      },
      _max: {
        date: true,
      },
    }),
    prisma.memory.findMany({
      where: {
        userId,
      },
      select: {
        date: true,
        text: true,
      },
      orderBy: {
        date: "asc",
      },
    }),
  ]);

  const totalTokens = memoryRows.reduce(
    (sum, memory) => sum + estimateTokenCount(memory.text),
    0,
  );

  const monthlyMap = new Map();
  for (const row of memoryRows) {
    const key = new Date(row.date).toISOString().slice(0, 7);
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
  }

  const monthlyCounts = [...monthlyMap.entries()].map(([month, count]) => ({
    month,
    count,
  }));

  const payload = {
    totalMemories: aggregate._count.id,
    bySource: {
      chatgpt: 0,
      claude: 0,
      gemini: 0,
      manual: 0,
      ...Object.fromEntries(
        sourceCounts.map((row) => [row.source, row._count.source]),
      ),
    },
    byCategory: Object.fromEntries(
      categoryCounts.map((row) => [row.category, row._count.category]),
    ),
    dateRange: {
      oldest: aggregate._min.date,
      newest: aggregate._max.date,
    },
    totalTokenEstimate: totalTokens,
    monthlyCounts,
  };

  await cacheSetJson(cacheKey, payload, 300);
  return payload;
};
