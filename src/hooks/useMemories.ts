"use client";

import type { MemoryItem } from "@/types/contracts";
import { usePollingResource } from "@/hooks/use-polling-resource";
import { apiClient } from "@/services/api-client";

export function useMemories() {
  const resource = usePollingResource<MemoryItem[]>("/api/memories", {
    initialData: [],
    intervalMs: 10000,
  });

  const createMemory = async (payload: { imageUrl: string; caption: string }) => {
    const memory = await apiClient<MemoryItem>("/api/memories", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await resource.refresh();
    return memory;
  };

  const deleteMemory = async (id: string) => {
    await apiClient(`/api/memories/${id}`, {
      method: "DELETE",
    });

    await resource.refresh();
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    const result = await apiClient<{ imageUrl: string }>("/api/upload", {
      method: "POST",
      body: formData,
    });

    return result.imageUrl;
  };

  return {
    ...resource,
    memories: resource.data,
    addMemory: createMemory,
    removeMemory: deleteMemory,
    createMemory,
    deleteMemory,
    uploadFile,
  };
}
