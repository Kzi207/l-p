"use client";

import { useState } from "react";
import { useMemories } from "@/hooks/useMemories";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemoryGrid } from "@/components/memories/MemoryGrid";
import { MemoryUpload } from "@/components/memories/MemoryUpload";
import { MemoryLightbox } from "@/components/memories/MemoryLightbox";
import { MemoryEmptyState } from "@/components/memories/MemoryEmptyState";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { MemoryItem } from "@/types/contracts";

export default function MemoriesPage() {
  const { data, loading, error, createMemory, deleteMemory, refresh } = useMemories();
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  const handleUpload = async (payload: { imageUrl: string; caption: string }) => {
    await createMemory(payload);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa khoảnh khắc này?")) {
      await deleteMemory(id);
      setSelectedMemory(null);
    }
  };

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        <PageHeader title="Khoảnh khắc" description="Đang tải kho ảnh kỉ niệm..." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LoadingCard rows={2} />
          <LoadingCard rows={2} />
          <LoadingCard rows={2} />
          <LoadingCard rows={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Lỗi tải khoảnh khắc"
        description={error}
        onRetry={refresh}
      />
    );
  }

  // Convert MemoryItem contract type to component memory type if needed
  // Note: the component matches MemoryItem structure closely
  const memoriesList = data || [];

  return (
    <div className="space-y-6 select-none flex flex-col h-full">
      <PageHeader
        title="Khoảnh khắc kỉ niệm"
        description="Nơi lưu giữ từng tấm ảnh và câu chuyện đẹp của hai người."
        action={<MemoryUpload onUploadSuccess={handleUpload} />}
      />

      {memoriesList.length === 0 ? (
        <MemoryEmptyState onUploadClick={() => {
          const btn = document.querySelector("#upload-trigger") as HTMLButtonElement;
          if (btn) btn.click();
        }} />
      ) : (
        <MemoryGrid memories={memoriesList} onMemorySelect={(m) => setSelectedMemory(m as MemoryItem)} />
      )}

      {/* Fullscreen light box view */}
      <MemoryLightbox
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
