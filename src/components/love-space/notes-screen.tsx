"use client";

import { useState } from "react";

import { useCouple } from "@/hooks/useCouple";
import { useNotes } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CoupleGate } from "@/components/love-space/couple-gate";
import { SectionHeader } from "@/components/love-space/section-header";

export function NotesScreen() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data, createNote, updateNote, deleteNote } = useNotes();
  const [content, setContent] = useState("");

  if (!coupleLoading && !couple) {
    return <CoupleGate />;
  }

  const handleCreate = async () => {
    await createNote({ content });
    setContent("");
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Notes"
        title="Shared notes with pin, edit, and delete"
        description="Notes poll every 5 seconds as a simple realtime fallback for serverless deployment."
      />

      <Card>
        <div className="flex flex-col gap-3 md:flex-row">
          <Textarea
            className="min-h-[96px] flex-1"
            placeholder="Write a shared note..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <Button onClick={handleCreate}>Add note</Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {data.length > 0 ? (
          data.map((note) => (
            <Card key={note.id} className={note.isPinned ? "border-rose-100 bg-rose-50/55" : ""}>
              <p className="text-sm leading-7 text-zinc-700">{note.content}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={note.isPinned ? "secondary" : "default"}
                  onClick={() => void updateNote(note.id, { isPinned: !note.isPinned })}
                >
                  {note.isPinned ? "Unpin" : "Pin"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const nextValue = window.prompt("Edit note", note.content);
                    if (nextValue && nextValue !== note.content) {
                      void updateNote(note.id, { content: nextValue });
                    }
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void deleteNote(note.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2 xl:col-span-3">
            <p className="text-sm text-[var(--color-muted)]">No notes yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
