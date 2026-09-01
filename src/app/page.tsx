"use client";

import { LoginScreen } from "@/components/auth/login-screen";
import { HomeScreen } from "@/components/home/home-screen";
import { ConfigurationMissing } from "@/components/shared/app-states";
import { useAuth } from "@/components/providers/auth-provider";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function HomePage() {
  const { user } = useAuth();

  if (!isFirebaseConfigured) return <ConfigurationMissing />;
  // Không khóa màn hình trong lúc Firebase khôi phục session; người dùng có thể
  // bấm đăng nhập Google ngay, session cũ vẫn tự cập nhật khi listener hoàn tất.
  if (!user) return <LoginScreen />;
  return <HomeScreen user={user} />;
}
