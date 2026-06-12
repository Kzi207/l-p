"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useJournals } from "@/hooks/useJournals";
import { PageHeader } from "@/components/layout/PageHeader";
import { JournalLayout } from "@/components/journal/JournalLayout";
import { JournalList } from "@/components/journal/JournalList";
import { JournalEditor } from "@/components/journal/JournalEditor";
import { JournalEmptyState } from "@/components/journal/JournalEmptyState";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ErrorState } from "@/components/shared/ErrorState";

export default function JournalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const { journals, loading, error, addJournal, editJournal, removeJournal, reload } =
    useJournals();
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const activeId = queryId ?? localActiveId;

  const handleJournalSelect = (id: string) => {
    setIsCreatingNew(false);
    setLocalActiveId(id);
    router.push(`/journal?id=${id}`);
  };

  const handleCreateNew = () => {
    setLocalActiveId(null);
    setIsCreatingNew(true);
    router.push("/journal");
  };

  const handleSave = async (payload: {
    title: string;
    content: string;
    imageUrl?: string | null;
  }) => {
    if (isCreatingNew) {
      const newJournal = await addJournal(payload);
      setIsCreatingNew(false);
      if (newJournal) {
        handleJournalSelect(newJournal.id);
      }
    } else if (activeId) {
      await editJournal(activeId, payload);
    }
  };

  const handleDelete = async (id: string) => {
    await removeJournal(id);
    setLocalActiveId(null);
    setIsCreatingNew(false);
    router.push("/journal");
  };

  const selectedJournal = journals.find((journal) => journal.id === activeId) || null;

  if (loading) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        <PageHeader title="Nhật ký chung" description="Đang tải danh sách nhật ký..." />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <LoadingCard lines={4} />
          <LoadingCard lines={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Lỗi tải nhật ký"
        description={error.message || "Đã xảy ra lỗi ngoài ý muốn."}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6 select-none">
      <PageHeader
        title="Nhật ký chung"
        description="Nơi gửi gắm những dòng tâm sự mộc mạc và câu chuyện hằng ngày của hai người."
      />

      <JournalLayout
        showContentMobile={isCreatingNew || Boolean(activeId)}
        sidebar={
          <JournalList
            journals={journals}
            activeId={activeId}
            onJournalSelect={handleJournalSelect}
            onCreateNew={handleCreateNew}
          />
        }
        content={
          isCreatingNew ? (
            <JournalEditor
              key="new-journal"
              journal={null}
              onSave={handleSave}
              isNew
              onBack={() => {
                setLocalActiveId(null);
                setIsCreatingNew(false);
                router.push("/journal");
              }}
            />
          ) : selectedJournal ? (
            <JournalEditor
              key={selectedJournal.id}
              journal={selectedJournal}
              onSave={handleSave}
              onDelete={handleDelete}
              onBack={() => {
                setLocalActiveId(null);
                setIsCreatingNew(false);
                router.push("/journal");
              }}
            />
          ) : (
            <JournalEmptyState onCreateClick={handleCreateNew} />
          )
        }
      />
    </div>
  );
}
