import { getRedisClient } from "../lib/redis.js";

export const cacheGetJson = async (key) => {
  const client = await getRedisClient();

  if (!client) {
    return null;
  }

  const raw = await client.get(key);
  return raw ? JSON.parse(raw) : null;
};

export const cacheSetJson = async (key, value, ttlSeconds = 300) => {
  const client = await getRedisClient();

  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });
};

export const cacheDeleteByPattern = async (pattern) => {
  const client = await getRedisClient();

  if (!client) {
    return;
  }

  let cursor = 0;

  do {
    const result = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });

    cursor = Number(result.cursor);

    if (result.keys.length) {
      await client.del(result.keys);
    }
  } while (cursor !== 0);
};

