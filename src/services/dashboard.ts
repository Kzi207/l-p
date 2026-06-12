import { prisma } from "@/lib/prisma";
import {
  emptyDashboard,
  serializeJournal,
  serializeMemory,
  serializeNote,
} from "@/lib/serializers";
import { calculateLoveDays } from "@/lib/utils";

export async function getDashboardSummary(coupleId: string, startDate: Date | null) {
  const now = new Date();
  const [totalMemories, totalJournals, upcomingEvents, latestMemories, recentJournals, pinnedNote] =
    await Promise.all([
      prisma.memory.count({
        where: { coupleId },
      }),
      prisma.journal.count({
        where: { coupleId },
      }),
      prisma.event.count({
        where: {
          coupleId,
          eventDate: {
            gte: now,
          },
        },
      }),
      prisma.memory.findMany({
        where: { coupleId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.journal.findMany({
        where: { coupleId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.note.findFirst({
        where: {
          coupleId,
          isPinned: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  return {
    ...emptyDashboard(),
    loveDays: calculateLoveDays(startDate),
    totalMemories,
    totalJournals,
    upcomingEvents,
    latestMemories: latestMemories.map(serializeMemory),
    recentJournals: recentJournals.map(serializeJournal),
    pinnedNote: pinnedNote ? serializeNote(pinnedNote) : null,
  };
}
