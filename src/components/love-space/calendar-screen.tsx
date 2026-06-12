"use client";

import { useState } from "react";

import { useCouple } from "@/hooks/useCouple";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CoupleGate } from "@/components/love-space/couple-gate";
import { SectionHeader } from "@/components/love-space/section-header";

export function CalendarScreen() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data, createEvent, deleteEvent } = useEvents();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [type, setType] = useState("date");

  if (!coupleLoading && !couple) {
    return <CoupleGate />;
  }

  const handleSubmit = async () => {
    if (!eventDate) {
      return;
    }

    await createEvent({
      title,
      eventDate: new Date(eventDate).toISOString(),
      type,
    });

    setTitle("");
    setEventDate("");
    setType("date");
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Calendar"
        title="Shared events backed by the real API"
        description="Birthdays, anniversaries, study sessions, and plans live in one couple-scoped event table."
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Create event</h3>
          <div className="mt-5 space-y-3">
            <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Input type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            <Input placeholder="Type: date, study, birthday..." value={type} onChange={(event) => setType(event.target.value)} />
            <Button onClick={handleSubmit}>Save event</Button>
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            {data.length > 0 ? (
              data.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-[24px] border border-black/6 bg-white/75 p-4">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {new Date(event.eventDate).toLocaleString()} · {event.type}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void deleteEvent(event.id)}>
                    Delete
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No events yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
