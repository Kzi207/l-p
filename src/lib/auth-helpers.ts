import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSessionUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function getCurrentUserRecord() {
  const sessionUser = await requireSessionUser();

  return prisma.user.findUnique({
    where: { id: sessionUser.id },
  });
}

export async function requireCurrentUserRecord() {
  const user = await getCurrentUserRecord();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function getCurrentCouple() {
  const user = await requireCurrentUserRecord();

  if (!user.coupleId) {
    return null;
  }

  return prisma.couple.findUnique({
    where: { id: user.coupleId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });
}

export async function requireCurrentCouple() {
  const couple = await getCurrentCouple();

  if (!couple) {
    throw new Error("COUPLE_REQUIRED");
  }

  return couple;
}
