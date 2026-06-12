"use client";

import type { EventItem } from "@/types/contracts";
import { usePollingResource } from "@/hooks/use-polling-resource";
import { apiClient } from "@/services/api-client";

export function useEvents() {
  const resource = usePollingResource<EventItem[]>("/api/events", {
    initialData: [],
    intervalMs: 10000,
  });

  const createEvent = async (payload: {
    title: string;
    eventDate: string;
    type: string;
  }) => {
    const event = await apiClient<EventItem>("/api/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await resource.refresh();
    return event;
  };

  const updateEvent = async (
    id: string,
    payload: Partial<{
      title: string;
      eventDate: string;
      type: string;
    }>,
  ) => {
    const event = await apiClient<EventItem>(`/api/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    await resource.refresh();
    return event;
  };

  const deleteEvent = async (id: string) => {
    await apiClient(`/api/events/${id}`, {
      method: "DELETE",
    });

    await resource.refresh();
  };

  return {
    ...resource,
    events: resource.data,
    addEvent: createEvent,
    editEvent: updateEvent,
    removeEvent: deleteEvent,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
