"use client";

import type { DashboardResponse } from "@/types/contracts";
import { usePollingResource } from "@/hooks/use-polling-resource";

export function useDashboard() {
  const resource = usePollingResource<DashboardResponse>("/api/dashboard", {
    initialData: {
      loveDays: 0,
      totalMemories: 0,
      totalJournals: 0,
      upcomingEvents: 0,
      latestMemories: [],
      recentJournals: [],
      pinnedNote: null,
    },
    intervalMs: 10000,
  });

  return {
    ...resource,
    data: resource.data
      ? {
          ...resource.data,
          stats: {
            memoriesCount: resource.data.totalMemories,
            journalsCount: resource.data.totalJournals,
            upcomingEventsCount: resource.data.upcomingEvents,
            notesCount: resource.data.pinnedNote ? 1 : 0,
          },
        }
      : resource.data,
  };
}
