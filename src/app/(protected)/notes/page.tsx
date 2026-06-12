"use client";

import { useNotes } from "@/hooks/useNotes";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotesGrid } from "@/components/notes/NotesGrid";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NotesEmptyState } from "@/components/notes/NotesEmptyState";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ErrorState } from "@/components/shared/ErrorState";

export default function NotesPage() {
  const { data: notes, loading, error, createNote, updateNote, deleteNote, refresh } = useNotes();

  const notesList = notes || [];

  const handleCreate = async (content: string) => {
    await createNote({ content });
  };

  const handleUpdate = async (id: string, content: string) => {
    await updateNote(id, { content });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) {
      await deleteNote(id);
    }
  };

  const handleTogglePin = async (id: string) => {
    const note = notesList.find((n) => n.id === id);
    if (note) {
      await updateNote(id, { isPinned: !note.isPinned });
    }
  };

  if (loading && (!notes || notes.length === 0)) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        <PageHeader title="Ghi chú nhanh" description="Đang tải ghi chú..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingCard rows={3} />
          <LoadingCard rows={3} />
          <LoadingCard rows={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Lỗi tải ghi chú"
        description={error}
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="space-y-6 select-none">
      <PageHeader
        title="Ghi chú nhanh"
        description="Lưu nhanh danh sách mua sắm, lời nhắc nhỏ nhặt hoặc ý tưởng đi chơi thú vị."
      />

      <NoteEditor onCreate={handleCreate} />

      {notesList.length === 0 ? (
        <NotesEmptyState onCreateClick={() => {
          // Triggers opening editor if click
          const trigger = document.querySelector(".plus-button-note") as HTMLElement;
          if (trigger) trigger.click();
        }} />
      ) : (
        <NotesGrid
          notes={notesList}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
