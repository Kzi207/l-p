import { StickyNote } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface NotesEmptyStateProps {
  onCreateClick: () => void;
}

export function NotesEmptyState({ onCreateClick }: NotesEmptyStateProps) {
  return (
    <EmptyState
      icon={StickyNote}
      title="Chưa có ghi chú nào"
      description="Tạo ghi chú nhanh để lưu lại danh sách mua sắm, lời nhắc hẹn hò hoặc những việc nhỏ cần nhớ."
      actionText="Tạo ghi chú đầu tiên"
      onAction={onCreateClick}
      className="my-8"
    />
  );
}
