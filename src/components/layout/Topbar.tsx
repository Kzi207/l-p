"use client";

import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import { Bell, Search, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { useCouple } from "@/hooks/useCouple";
import { Button } from "@/components/ui/button";

const pageConfigs: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Tổng quan",
    description: "Chào mừng trở lại không gian yêu thương của hai bạn.",
  },
  "/memories": {
    title: "Khoảnh khắc",
    description: "Lưu giữ những tấm hình và kỷ niệm đẹp đẽ.",
  },
  "/journal": {
    title: "Nhật ký chung",
    description: "Nơi chia sẻ tâm sự, ghi lại những câu chuyện thường ngày.",
  },
  "/calendar": {
    title: "Lịch chung",
    description: "Theo dõi các ngày kỷ niệm và sự kiện quan trọng sắp tới.",
  },
  "/notes": {
    title: "Ghi chú nhanh",
    description: "Nhắc nhở công việc, danh sách mua sắm hoặc ý tưởng thú vị.",
  },
  "/settings": {
    title: "Cài đặt",
    description: "Quản lý thông tin tài khoản, cặp đôi và tùy chọn hiển thị.",
  },
};

export function Topbar() {
  const pathname = usePathname();
  const { couple } = useCouple();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh vượt quá kích thước 2MB cho phép!");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      if (data.imageUrl && couple?.partner1.id) {
        localStorage.setItem(`custom-avatar-${couple.partner1.id}`, data.imageUrl);
        window.dispatchEvent(new Event("avatar-updated"));
        toast.success("Cập nhật ảnh đại diện thành công!");
      }
    } catch {
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
    }
  };

  const currentPath = Object.keys(pageConfigs).find(
    (key) => pathname === key || (key !== "/dashboard" && pathname.startsWith(key)),
  );

  const config = currentPath
    ? pageConfigs[currentPath]
    : { title: "LoveSpace", description: "Không gian riêng tư cho hai người." };

  return (
    <header className="sticky top-0 z-20 flex h-[72px] w-full items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl select-none md:px-8">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{config.title}</h1>
        <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
          {config.description}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden w-64 md:block lg:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Tìm kiếm ảnh, nhật ký, sự kiện..."
            className="w-full rounded-xl border border-border/40 bg-secondary/40 py-1.5 pl-9 pr-4 text-xs font-medium outline-none transition-all duration-200 hover:bg-secondary/70 focus:border-primary/30 focus:bg-background"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="relative flex size-9 items-center justify-center rounded-xl border border-border/30 p-0 hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell className="size-4.5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
        </Button>

        <div className="flex items-center gap-3 border-l border-border/50 pl-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <div
              onClick={handleAvatarClick}
              className="relative w-9 h-9 flex-shrink-0 aspect-square rounded-full border border-border/30 overflow-hidden cursor-pointer shadow-sm group/avatar active:scale-95 transition-all duration-200"
              title="Nhấp để thay đổi ảnh đại diện"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  couple?.partner1.avatar ??
                  "https://ui-avatars.com/api/?background=F4F4F5&color=18181B&name=Ban"
                }
                alt={couple?.partner1.name ?? "Bạn"}
                className="size-full object-cover"
              />
              {isUploading ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <span className="text-[7px] text-white font-bold select-none">SỬA</span>
                </div>
              )}
            </div>
            <div className="hidden text-left xl:flex xl:flex-col">
              <span className="text-xs font-semibold leading-tight text-foreground">
                {couple?.partner1.name ?? "Bạn"}
              </span>
              <span className="text-[10px] text-muted-foreground">Thành viên</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-9 h-9 flex-shrink-0 aspect-square items-center justify-center rounded-xl border border-border/40 bg-secondary/20 hover:bg-red-50/50 hover:text-red-600 hover:border-red-200/60 text-muted-foreground transition-all duration-200"
            title="Đăng xuất"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
