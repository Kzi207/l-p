"use client";

import { motion } from "framer-motion";

import type { Note } from "@/types/note";
import { NoteCard } from "@/components/notes/NoteCard";

interface NotesGridProps {
  notes: Note[];
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => Promise<unknown>;
}

export function NotesGrid({ notes, onTogglePin, onDelete, onUpdate }: NotesGridProps) {
  const sortedNotes = [...notes].sort((left, right) => {
    if (left.isPinned && !right.isPinned) {
      return -1;
    }
    if (!left.isPinned && right.isPinned) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedNotes.map((note, index) => (
        <motion.div
          key={note.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.04 }}
          className="h-full"
        >
          <NoteCard
            note={note}
            onTogglePin={onTogglePin}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        </motion.div>
      ))}
    </div>
  );
}
