import { prisma } from "./prisma.js";
import { createHttpError } from "./http.js";

const DEFAULT_SINGLE_USER_CLERK_ID = process.env.SINGLE_USER_CLERK_ID || "single-user";

const buildSingleUserDefaults = () => ({
  clerkId: DEFAULT_SINGLE_USER_CLERK_ID,
  email: process.env.SINGLE_USER_EMAIL || "owner@pai.local",
  name: process.env.SINGLE_USER_NAME || "Rayyan",
  aboutMe:
    process.env.SINGLE_USER_ABOUT ||
    "Owner of this personal AI workspace. Use a practical, supportive tone and optimize for fast progress.",
  tonePreference: process.env.SINGLE_USER_TONE || "balanced",
  assistantName: process.env.SINGLE_USER_ASSISTANT_NAME || "Sunnatilla AI",
  language: process.env.SINGLE_USER_LANGUAGE || "en",
});

export const getUserByClerkId = async (clerkId) =>
  prisma.user.findUnique({
    where: {
      clerkId,
    },
  });

export const getOrCreateSingleUser = async () => {
  const defaults = buildSingleUserDefaults();

  const existingByClerkId = await prisma.user.findUnique({
    where: {
      clerkId: defaults.clerkId,
    },
  });

  if (existingByClerkId) {
    return existingByClerkId;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: {
      email: defaults.email,
    },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: {
        id: existingByEmail.id,
      },
      data: {
        clerkId: defaults.clerkId,
      },
    });
  }

  return prisma.user.create({
    data: defaults,
  });
};

export const getUserByClerkIdOrThrow = async (clerkId) => {
  const user = await getUserByClerkId(clerkId);

  if (!user) {
    if (!process.env.CLERK_SECRET_KEY || clerkId === DEFAULT_SINGLE_USER_CLERK_ID) {
      return getOrCreateSingleUser();
    }

    throw createHttpError(404, "User profile not found.");
  }

  return user;
};
