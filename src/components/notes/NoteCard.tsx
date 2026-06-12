"use client";

import { useState } from "react";
import { Check, Edit3, Pin, Trash2, X } from "lucide-react";

import type { Note } from "@/types/note";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface NoteCardProps {
  note: Note;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => Promise<unknown>;
}

export function NoteCard({ note, onTogglePin, onDelete, onUpdate }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editedContent.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(note.id, editedContent);
      setIsEditing(false);
    } catch {
      setEditedContent(note.content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(note.content);
    setIsEditing(false);
  };

  const pastelStyles = note.isPinned
    ? "bg-[#FFFDF2] border-[#F4E299] shadow-md/5"
    : "bg-white border-border/70 hover:shadow-sm";

  return (
    <Card
      className={`group overflow-hidden rounded-2xl border transition-all duration-300 select-none ${pastelStyles}`}
    >
      <CardContent className="relative flex h-full min-h-[160px] flex-col justify-between p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {note.isPinned ? "📌 Được ghim" : "📝 Bản nháp"}
          </span>
          <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePin(note.id)}
              className={`flex size-7.5 items-center justify-center rounded-lg border border-border/10 p-0 ${
                note.isPinned
                  ? "border-primary/20 bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
              title={note.isPinned ? "Bỏ ghim" : "Ghim ghi chú"}
            >
              <Pin className={`size-3.5 ${note.isPinned ? "fill-primary" : "rotate-45"}`} />
            </Button>
            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex size-7.5 items-center justify-center rounded-lg border border-border/10 p-0 text-muted-foreground hover:bg-secondary"
                title="Sửa ghi chú"
              >
                <Edit3 className="size-3.5" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="flex size-7.5 items-center justify-center rounded-lg border border-border/10 p-0 text-muted-foreground hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
              title="Xóa ghi chú"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-start">
          {isEditing ? (
            <div className="space-y-2.5">
              <Textarea
                value={editedContent}
                onChange={(event) => setEditedContent(event.target.value)}
                className="min-h-[90px] w-full resize-none rounded-xl border border-border bg-white p-2 text-xs leading-relaxed focus-visible:ring-primary/20"
                disabled={isSaving}
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="ghost"
                  className="size-7 rounded-lg p-0 hover:bg-secondary"
                >
                  <X className="size-3.5 text-muted-foreground" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="size-7 rounded-lg bg-primary p-0 text-primary-foreground"
                >
                  <Check className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
              {note.content}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
