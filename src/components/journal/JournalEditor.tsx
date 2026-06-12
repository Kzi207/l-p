"use client";

import { useState, useRef } from "react";
import { Save, Trash2, Cloud, ImageIcon, Upload, X, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import type { Journal } from "@/types/journal";
import { Button } from "@/components/ui/button";

interface JournalEditorProps {
  journal: Journal | null;
  onSave: (payload: {
    title: string;
    content: string;
    imageUrl?: string | null;
  }) => Promise<unknown>;
  onDelete?: (id: string) => Promise<unknown>;
  isNew?: boolean;
  onBack?: () => void;
}

const presetJournalImages = [
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&q=80&w=600",
];

export function JournalEditor({
  journal,
  onSave,
  onDelete,
  isNew = false,
  onBack,
}: JournalEditorProps) {
  const [title, setTitle] = useState(journal?.title ?? "");
  const [content, setContent] = useState(journal?.content ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(journal?.imageUrl ?? null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề nhật ký!");
      return;
    }
    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung nhật ký!");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ title, content, imageUrl });
      toast.success(isNew ? "Đã viết thêm một trang nhật ký mới!" : "Đã cập nhật trang nhật ký!");
    } catch {
      toast.error("Có lỗi xảy ra khi lưu nhật ký!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!journal || !onDelete) return;

    if (confirm("Bạn có chắc chắn muốn xóa trang nhật ký này không? Hành động này không thể hoàn tác.")) {
      try {
        await onDelete(journal.id);
        toast.success("Đã xóa trang nhật ký!");
      } catch {
        toast.error("Không thể xóa nhật ký!");
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Vui lòng chọn ảnh nhỏ hơn 8MB!");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setImageUrl(data.imageUrl);
      toast.success("Tải ảnh bìa lên thành công!");
    } catch {
      toast.error("Không thể tải ảnh từ thiết bị lên!");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col space-y-0 overflow-hidden rounded-[32px] border border-white/60 bg-white/75 backdrop-blur-md shadow-panel relative select-none"
    >
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 md:px-6 py-4 bg-white/40">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-1.5 hover:bg-secondary/60 rounded-xl text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Cloud className={`size-4 ${isSaving ? "animate-pulse text-primary" : "text-primary/70"}`} />
            <span>{isSaving ? "Đang lưu..." : "Đã đồng bộ"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="flex size-9 items-center justify-center rounded-xl border border-destructive/10 text-destructive hover:bg-destructive/5 p-0"
              title="Xóa nhật ký"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSaving || isUploading}
            className="h-9 rounded-xl bg-gradient-to-r from-primary to-[#ff80a4] px-4 text-xs font-bold text-primary-foreground hover:opacity-95 shadow-md shadow-primary/10 transition-all duration-300"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            {isNew ? "Đăng nhật ký" : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-5 scrollbar-thin">
        {/* Banner Cover Image (Notion style) */}
        <AnimatePresence>
          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative w-full h-44 md:h-52 rounded-2xl overflow-hidden shadow-sm group border border-border/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl text-xs font-semibold bg-white/95 hover:bg-white"
                >
                  <Upload className="size-3.5 mr-1" />
                  Thay đổi ảnh
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setImageUrl(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  <X className="size-3.5 mr-1" />
                  Gỡ ảnh
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title input (Notion design: borderless, large, bold) */}
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Tiêu đề nhật ký hôm nay..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl md:text-3xl font-extrabold tracking-tight border-none bg-transparent p-0 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 focus:border-none focus-visible:ring-0"
          />
        </div>

        {/* Toolbar for image attachment & uploading */}
        <div className="flex items-center gap-3 border-y border-border/20 py-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-secondary/40"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5 text-primary/70" />
            )}
            <span>{isUploading ? "Đang tải lên..." : "Tải ảnh từ máy"}</span>
          </button>

          <div className="h-4 w-px bg-border/40" />

          <button
            type="button"
            onClick={() => setShowImageOptions((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-secondary/40"
          >
            <ImageIcon className="size-3.5 text-primary/70" />
            <span>{showImageOptions ? "Ẩn ảnh mẫu" : "Chọn ảnh mẫu"}</span>
          </button>
        </div>

        {/* Preset selections */}
        <AnimatePresence>
          {showImageOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2.5 bg-secondary/20 p-4 rounded-2xl border border-border/30"
            >
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3 text-primary" /> Chọn nhanh ảnh kỷ niệm
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {presetJournalImages.map((url) => (
                  <button
                    type="button"
                    key={url}
                    onClick={() => setImageUrl(url)}
                    className={`relative aspect-[16/10] overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      imageUrl === url
                        ? "scale-95 border-primary shadow-md"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="preset" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content body textarea (Notion design: borderless, readable body text) */}
        <div className="pt-2">
          <textarea
            placeholder="Hãy viết gì đó về câu chuyện hôm nay của hai bạn... (được lưu tự động)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[350px] text-sm md:text-base leading-relaxed border-none bg-transparent p-0 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 focus:border-none focus-visible:ring-0 resize-none font-sans"
          />
        </div>
      </div>
    </form>
  );
}
