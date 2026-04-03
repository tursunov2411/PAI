import { prisma } from "./prisma.js";
import { createHttpError } from "./http.js";

export const getUserByClerkId = async (clerkId) =>
  prisma.user.findUnique({
    where: {
      clerkId,
    },
  });

export const getUserByClerkIdOrThrow = async (clerkId) => {
  const user = await getUserByClerkId(clerkId);

  if (!user) {
    throw createHttpError(404, "User profile not found.");
  }

  return user;
};
