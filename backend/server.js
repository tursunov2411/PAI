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

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

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

app.use((error, _req, res, _next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
});

const shutdown = async () => {
  await prisma.$disconnect();

  const redis = await getRedisClient();
  if (redis?.isOpen) {
    await redis.quit();
  }

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen(port, async () => {
  console.log(`Backend listening on http://localhost:${port}`);

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
});
