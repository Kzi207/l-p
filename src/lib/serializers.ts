import type { Couple, Event, Journal, Memory, Note, User } from "@prisma/client";

import type {
  CoupleResponse,
  DashboardResponse,
  EventItem,
  JournalItem,
  MemoryItem,
  NoteItem,
} from "@/types/contracts";
import { calculateLoveDays } from "@/lib/utils";

type MemoryWithAuthor = Memory & {
  author: Pick<User, "id" | "name" | "avatar">;
};

type JournalWithAuthor = Journal & {
  author: Pick<User, "id" | "name">;
};

type CoupleWithUsers = Couple & {
  users: Pick<User, "id" | "name" | "email" | "avatar">[];
};

export function serializeMemory(memory: MemoryWithAuthor): MemoryItem {
  return {
    id: memory.id,
    imageUrl: memory.imageUrl,
    caption: memory.caption,
    createdAt: memory.createdAt.toISOString(),
    author: {
      id: memory.author.id,
      name: memory.author.name,
      avatar: memory.author.avatar ?? null,
    },
  };
}

export function serializeJournal(journal: JournalWithAuthor): JournalItem {
  return {
    id: journal.id,
    title: journal.title,
    content: journal.content,
    imageUrl: journal.imageUrl ?? null,
    createdAt: journal.createdAt.toISOString(),
    author: {
      id: journal.author.id,
      name: journal.author.name,
    },
  };
}

type EventWithAuthor = Event & {
  author: Pick<User, "id" | "name" | "avatar"> | null;
};

export function serializeEvent(event: EventWithAuthor): EventItem {
  return {
    id: event.id,
    title: event.title,
    eventDate: event.eventDate.toISOString(),
    type: event.type,
    author: event.author
      ? {
          id: event.author.id,
          name: event.author.name,
          avatar: event.author.avatar ?? null,
        }
      : null,
  };
}

export function serializeNote(note: Note): NoteItem {
  return {
    id: note.id,
    content: note.content,
    isPinned: note.isPinned,
  };
}

export function serializeCouple(couple: CoupleWithUsers): CoupleResponse {
  return {
    id: couple.id,
    code: couple.code,
    startDate: couple.startDate ? couple.startDate.toISOString() : null,
    loveDays: calculateLoveDays(couple.startDate),
    users: couple.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
    })),
  };
}

export function emptyDashboard(): DashboardResponse {
  return {
    loveDays: 0,
    totalMemories: 0,
    totalJournals: 0,
    upcomingEvents: 0,
    latestMemories: [],
    recentJournals: [],
    pinnedNote: null,
  };
}
