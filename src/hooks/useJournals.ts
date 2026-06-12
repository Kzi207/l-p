"use client";

import type { JournalItem } from "@/types/contracts";
import { usePollingResource } from "@/hooks/use-polling-resource";
import { apiClient } from "@/services/api-client";

export function useJournals() {
  const resource = usePollingResource<JournalItem[]>("/api/journals", {
    initialData: [],
    intervalMs: 10000,
  });

  const createJournal = async (payload: {
    title: string;
    content: string;
    imageUrl?: string | null;
  }) => {
    const journal = await apiClient<JournalItem>("/api/journals", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await resource.refresh();
    return journal;
  };

  const updateJournal = async (
    id: string,
    payload: Partial<{
      title: string;
      content: string;
      imageUrl: string | null;
    }>,
  ) => {
    const journal = await apiClient<JournalItem>(`/api/journals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    await resource.refresh();
    return journal;
  };

  const deleteJournal = async (id: string) => {
    await apiClient(`/api/journals/${id}`, {
      method: "DELETE",
    });

    await resource.refresh();
  };

  return {
    ...resource,
    journals: resource.data,
    addJournal: createJournal,
    editJournal: updateJournal,
    removeJournal: deleteJournal,
    createJournal,
    updateJournal,
    deleteJournal,
  };
}
