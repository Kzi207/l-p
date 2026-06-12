"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface NoteEditorProps {
  onCreate: (content: string) => Promise<unknown>;
}

export function NoteEditor({ onCreate }: NoteEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onCreate(content);
      setContent("");
      setIsOpen(false);
      toast.success("Đã thêm ghi chú mới!");
    } catch {
      toast.error("Không thể tạo ghi chú!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-6 select-none">
      {isOpen ? (
        <Card className="max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Nhập ghi chú nhanh... (Ví dụ: danh sách mua đồ, việc cần nhớ...)"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-[100px] w-full resize-none rounded-xl border-border bg-secondary/20 p-3 text-xs leading-relaxed focus-visible:ring-primary/20"
                disabled={isSaving}
                autoFocus
              />
              <div className="flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                  className="h-9 rounded-xl border border-border px-4 text-xs font-semibold"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !content.trim()}
                  className="h-9 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/95"
                >
                  <Plus className="mr-1.5 size-4" />
                  Tạo ghi chú
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="plus-button-note flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-white px-4 py-2.5 text-xs font-bold text-muted-foreground shadow-sm transition-all duration-200 hover:bg-secondary/40 hover:text-foreground"
        >
          <Plus className="size-4" />
          Viết ghi chú mới...
        </button>
      )}
    </div>
  );
}
