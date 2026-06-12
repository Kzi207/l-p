"use client";

import type { NoteItem } from "@/types/contracts";
import { usePollingResource } from "@/hooks/use-polling-resource";
import { apiClient } from "@/services/api-client";

export function useNotes() {
  const resource = usePollingResource<NoteItem[]>("/api/notes", {
    initialData: [],
    intervalMs: 5000,
  });

  const createNote = async (payload: { content: string; isPinned?: boolean }) => {
    const note = await apiClient<NoteItem>("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await resource.refresh();
    return note;
  };

  const updateNote = async (
    id: string,
    payload: Partial<{
      content: string;
      isPinned: boolean;
    }>,
  ) => {
    const note = await apiClient<NoteItem>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    await resource.refresh();
    return note;
  };

  const deleteNote = async (id: string) => {
    await apiClient(`/api/notes/${id}`, {
      method: "DELETE",
    });

    await resource.refresh();
  };

  const togglePinNote = async (id: string) => {
    const current = resource.data.find((note) => note.id === id);
    if (!current) {
      return null;
    }

    return updateNote(id, { isPinned: !current.isPinned });
  };

  return {
    ...resource,
    notes: resource.data,
    addNote: async (content: string) => createNote({ content }),
    editNote: updateNote,
    removeNote: deleteNote,
    togglePinNote,
    createNote,
    updateNote,
    deleteNote,
  };
}
