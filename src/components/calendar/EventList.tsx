"use client";

import { Event } from "@/types/event";
import { EventCard } from "./EventCard";
import { motion } from "framer-motion";

interface EventListProps {
  events: Event[];
  onDelete: (id: string) => void;
}

export function EventList({ events, onDelete }: EventListProps) {
  // Sort events so that events closest to now (or upcoming) are first
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
  });

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <EventCard event={event} onDelete={onDelete} />
        </motion.div>
      ))}
    </div>
  );
}
