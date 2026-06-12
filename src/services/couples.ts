import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateCoupleCode, parseDateInput } from "@/lib/utils";

const coupleWithUsersInclude = {
  users: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
} satisfies Prisma.CoupleInclude;

async function generateUniqueCoupleCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateCoupleCode();
    const existing = await tx.couple.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("COUPLE_CODE_GENERATION_FAILED");
}

export async function createCoupleForUser(userId: string, startDate?: string) {
  return prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: userId },
      select: { coupleId: true },
    });

    if (!currentUser) {
      throw new Error("UNAUTHORIZED");
    }

    if (currentUser.coupleId) {
      throw new Error("COUPLE_EXISTS");
    }

    const code = await generateUniqueCoupleCode(tx);
    const created = await tx.couple.create({
      data: {
        code,
        startDate: startDate ? parseDateInput(startDate) : null,
        createdById: userId,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { coupleId: created.id },
    });

    return tx.couple.findUniqueOrThrow({
      where: { id: created.id },
      include: coupleWithUsersInclude,
    });
  });
}

export async function joinCoupleByCode(userId: string, rawCode: string) {
  return prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: userId },
      select: { coupleId: true },
    });

    if (!currentUser) {
      throw new Error("UNAUTHORIZED");
    }

    if (currentUser.coupleId) {
      throw new Error("COUPLE_EXISTS");
    }

    const code = rawCode.toUpperCase();
    const target = await tx.couple.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!target) {
      throw new Error("COUPLE_NOT_FOUND");
    }

    await tx.$queryRaw`SELECT "id" FROM "Couple" WHERE "id" = ${target.id} FOR UPDATE`;

    const memberCount = await tx.user.count({
      where: { coupleId: target.id },
    });

    if (memberCount >= 2) {
      throw new Error("COUPLE_FULL");
    }

    await tx.user.update({
      where: { id: userId },
      data: { coupleId: target.id },
    });

    return tx.couple.findUniqueOrThrow({
      where: { id: target.id },
      include: coupleWithUsersInclude,
    });
  });
}
