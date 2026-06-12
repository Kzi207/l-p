import { Image as ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface MemoryEmptyStateProps {
  onUploadClick: () => void;
}

export function MemoryEmptyState({ onUploadClick }: MemoryEmptyStateProps) {
  return (
    <EmptyState
      icon={ImageIcon}
      title="Chưa có khoảnh khắc nào"
      description="Hãy tải lên bức ảnh đầu tiên để bắt đầu lưu trữ những kỉ niệm ngọt ngào của hai người."
      actionText="Tải ảnh đầu tiên"
      onAction={onUploadClick}
      className="my-8"
    />
  );
}
