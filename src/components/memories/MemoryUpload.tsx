"use client";

import { useState, useRef } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MemoryUploadProps {
  onUploadSuccess: (payload: { imageUrl: string; caption: string }) => Promise<unknown>;
}

export function MemoryUpload({ onUploadSuccess }: MemoryUploadProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh vượt quá kích thước 2MB cho phép!");
      return;
    }

    setIsUploading(true);
    setProgress(15);

    const formData = new FormData();
    formData.append("file", file);

    const interval = setInterval(() => {
      setProgress((previous) => (previous < 85 ? previous + 8 : previous));
    }, 120);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setProgress(100);
      setImageUrl(data.imageUrl);
      toast.success("Tải ảnh lên máy chủ thành công!");
    } catch {
      toast.error("Lỗi tải ảnh lên máy chủ. Vui lòng thử lại!");
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageUrl) {
      toast.error("Vui lòng chọn ảnh từ thiết bị!");
      return;
    }
    if (!caption.trim()) {
      toast.error("Vui lòng nhập lời bình luận!");
      return;
    }

    setIsUploading(true);
    setProgress(15);

    const interval = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 90) {
          clearInterval(interval);
          return previous;
        }
        return previous + 25;
      });
    }, 150);

    try {
      await onUploadSuccess({ imageUrl, caption });
      setProgress(100);
      toast.success("Lưu khoảnh khắc thành công!");
      setImageUrl("");
      setCaption("");
      setOpen(false);
    } catch {
      toast.error("Đã xảy ra lỗi khi tải ảnh lên!");
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            id="upload-trigger"
            className="rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/95"
          >
            <UploadCloud className="mr-2 size-4" />
            Tải ảnh lên
          </Button>
        }
      />
      <DialogContent className="rounded-3xl border-border bg-card p-6 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Tải khoảnh khắc mới
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpload} className="mt-2 space-y-5">
          {/* Device file upload section */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              Hình ảnh kỷ niệm
            </Label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/50 bg-secondary/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-black"
                >
                  Chọn ảnh khác
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  if (!isUploading) {
                    fileInputRef.current?.click();
                  }
                }}
                className="group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/45 bg-secondary/10 hover:bg-primary/5 rounded-2xl p-8 text-center transition-all duration-300"
              >
                <UploadCloud className="size-8 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all mb-2" />
                <span className="text-xs font-bold text-foreground">Chọn hình ảnh từ thiết bị</span>
                <span className="text-[10px] text-muted-foreground/80 mt-1">Hỗ trợ JPG, PNG, GIF. Tối đa 2MB.</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caption" className="text-xs font-semibold text-muted-foreground">
              Lời bình luận
            </Label>
            <Textarea
              id="caption"
              placeholder="Mô tả bức ảnh này, ghi lại kỷ niệm khó quên..."
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={3}
              className="resize-none rounded-xl border-border bg-secondary/35 text-xs leading-relaxed focus-visible:ring-primary/20"
            />
          </div>

          {isUploading ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span>Đang tải lên...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isUploading}
              className="rounded-xl border border-border px-4 text-xs font-semibold"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !imageUrl}
              className="rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/95"
            >
              Tải lên
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

