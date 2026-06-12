import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface JournalEmptyStateProps {
  onCreateClick: () => void;
}

export function JournalEmptyState({ onCreateClick }: JournalEmptyStateProps) {
  return (
    <EmptyState
      icon={BookOpen}
      title="Chưa chọn trang nhật ký nào"
      description="Hãy chọn một trang nhật ký bên trái hoặc tạo mới một câu chuyện để bắt đầu viết tâm sự."
      actionText="Viết trang nhật ký mới"
      onAction={onCreateClick}
      className="h-full min-h-[400px]"
    />
  );
}
