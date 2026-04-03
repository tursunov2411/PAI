import { createClient } from "redis";

let redisClient;
let connectPromise;
let redisUnavailable = false;
let hasLoggedRedisError = false;

export const getRedisClient = async () => {
  if (!process.env.REDIS_URL || redisUnavailable) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: () => false,
      },
    });

    redisClient.on("error", (error) => {
      if (!hasLoggedRedisError) {
        console.warn("Redis unavailable:", error.message || "Connection failed.");
        hasLoggedRedisError = true;
      }
    });
  }

  if (!redisClient.isOpen && !connectPromise) {
    connectPromise = redisClient
      .connect()
      .catch(() => {
        redisUnavailable = true;
        redisClient = null;
        return null;
      })
      .finally(() => {
        connectPromise = null;
      });
  }

  if (!redisClient.isOpen && connectPromise) {
    await connectPromise;

    if (!redisClient) {
      return null;
    }
  }

  return redisClient;
};
