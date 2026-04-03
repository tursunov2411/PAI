import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import memoryRoutes from "./routes/memory.js";
import chatRoutes from "./routes/chat.js";
import goalsRoutes from "./routes/goals.js";
import notesRoutes from "./routes/notes.js";
import plannerRoutes from "./routes/planner.js";
import { prisma } from "./lib/prisma.js";
import { getRedisClient } from "./lib/redis.js";
import { initPinecone } from "./services/memoryService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim()),
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

export const app = express();

let initPromise;

export const initializeRuntime = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await getRedisClient();
      } catch (error) {
        console.warn("Redis unavailable during startup:", error.message);
      }

      try {
        await initPinecone();
      } catch (error) {
        console.warn("Pinecone unavailable during startup:", error.message);
      }
    })();
  }

  return initPromise;
};

export const shutdownRuntime = async () => {
  await prisma.$disconnect();

  const redis = await getRedisClient();
  if (redis?.isOpen) {
    await redis.quit();
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", async (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/planner", plannerRoutes);

if (fs.existsSync(frontendDistPath) && fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
});
