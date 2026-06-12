export type AuthorSummary = {
  id: string;
  name: string;
  avatar: string | null;
};

export type JournalAuthorSummary = {
  id: string;
  name: string;
};

export type MemoryItem = {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  author: AuthorSummary;
};

export type JournalItem = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: JournalAuthorSummary;
};

export type EventItem = {
  id: string;
  title: string;
  eventDate: string;
  type: string;
  author: AuthorSummary | null;
};

export type NoteItem = {
  id: string;
  content: string;
  isPinned: boolean;
};

export type CoupleMember = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
};

export type CoupleResponse = {
  id: string;
  code: string;
  startDate: string | null;
  loveDays: number;
  users: CoupleMember[];
};

export type DashboardResponse = {
  loveDays: number;
  totalMemories: number;
  totalJournals: number;
  upcomingEvents: number;
  latestMemories: MemoryItem[];
  recentJournals: JournalItem[];
  pinnedNote: NoteItem | null;
};

export type ApiErrorResponse = {
  message: string;
  issues?: unknown;
};
