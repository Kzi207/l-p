import { Memory } from "./memory";
import { Journal } from "./journal";
import { Note } from "./note";

export interface DashboardResponse {
  loveDays: number;
  totalMemories: number;
  totalJournals: number;
  upcomingEvents: number;
  latestMemories: Memory[];
  recentJournals: Journal[];
  pinnedNote: Note | null;
}
