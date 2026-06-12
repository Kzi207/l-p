"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User as UserIcon } from "lucide-react";
import { toast } from "sonner";

interface ProfileSettingsProps {
  user: User;
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || "");
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarSrc =
    avatar ??
    `https://ui-avatars.com/api/?background=F4F4F5&color=18181B&name=${encodeURIComponent(name)}`;

  useEffect(() => {
    const loadAvatar = () => {
      const stored = localStorage.getItem(`custom-avatar-${user.id}`);
      if (stored) {
        setAvatar(stored);
      }
    };
    loadAvatar();
    window.addEventListener("avatar-updated", loadAvatar);
    return () => {
      window.removeEventListener("avatar-updated", loadAvatar);
    };
  }, [user.id]);

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
      if (data.imageUrl) {
        setAvatar(data.imageUrl);
        localStorage.setItem(`custom-avatar-${user.id}`, data.imageUrl);
        window.dispatchEvent(new Event("avatar-updated"));
        toast.success("Tải ảnh đại diện mới thành công!");
      }
    } catch {
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Cập nhật hồ sơ cá nhân thành công!");
    }, 600);
  };

  return (
    <Card className="rounded-[24px] border border-border/80 bg-card shadow-sm overflow-hidden select-none">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <UserIcon className="size-4.5 text-primary" />
          Hồ sơ cá nhân
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Cập nhật thông tin hiển thị của bạn trong không gian chung.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-3">
        <form onSubmit={handleSave} className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="flex flex-col sm:flex-row items-center gap-4 pb-2">
            <div
              onClick={handleAvatarClick}
              className="relative w-16 h-16 flex-shrink-0 aspect-square rounded-full overflow-hidden cursor-pointer border border-border/40 shadow-sm group active:scale-95 transition-all duration-200"
              title="Nhấp để thay đổi ảnh đại diện"
            >
              <img
                src={avatarSrc}
                alt={name}
                className="size-full object-cover"
              />
              {isUploading ? (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <div className="size-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white font-bold select-none">SỬA</span>
                </div>
              )}
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <Label
                onClick={handleAvatarClick}
                className="text-xs font-semibold text-muted-foreground cursor-pointer hover:underline"
              >
                Thay đổi ảnh đại diện
              </Label>
              <p className="text-[10px] text-muted-foreground">Hỗ trợ JPG, PNG hoặc GIF. Tối đa 2MB.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Họ và tên</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl bg-secondary/35 border-border text-xs focus-visible:ring-primary/20"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Địa chỉ email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl bg-secondary/35 border-border text-xs focus-visible:ring-primary/20"
              disabled={isSaving}
            />
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold px-5 h-9"
          >
            Lưu thay đổi
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
