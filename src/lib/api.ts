import { apiClient } from "@/services/api-client";

import type {
  CoupleResponse,
  DashboardResponse,
  EventItem,
  JournalItem,
  MemoryItem,
  NoteItem,
} from "@/types/contracts";

export const api = {
  getDashboard: () => apiClient<DashboardResponse>("/api/dashboard"),
  getMemories: () => apiClient<MemoryItem[]>("/api/memories"),
  createMemory: (data: { imageUrl: string; caption: string }) =>
    apiClient<MemoryItem>("/api/memories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getJournals: () => apiClient<JournalItem[]>("/api/journals"),
  createJournal: (data: { title: string; content: string; imageUrl?: string | null }) =>
    apiClient<JournalItem>("/api/journals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateJournal: (
    id: string,
    data: { title: string; content: string; imageUrl?: string | null },
  ) =>
    apiClient<JournalItem>(`/api/journals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteJournal: (id: string) =>
    apiClient(`/api/journals/${id}`, {
      method: "DELETE",
    }),
  getEvents: () => apiClient<EventItem[]>("/api/events"),
  createEvent: (data: { title: string; eventDate: string; type: string }) =>
    apiClient<EventItem>("/api/events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteEvent: (id: string) =>
    apiClient(`/api/events/${id}`, {
      method: "DELETE",
    }),
  getNotes: () => apiClient<NoteItem[]>("/api/notes"),
  createNote: (content: string) =>
    apiClient<NoteItem>("/api/notes", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  updateNote: (id: string, content: string) =>
    apiClient<NoteItem>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),
  togglePinNote: async (id: string, isPinned: boolean) =>
    apiClient<NoteItem>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPinned }),
    }),
  deleteNote: (id: string) =>
    apiClient(`/api/notes/${id}`, {
      method: "DELETE",
    }),
  getCouple: () => apiClient<CoupleResponse | null>("/api/couples/me"),
  updateCouple: (data: { startDate: string }) =>
    apiClient<CoupleResponse>("/api/couples/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
