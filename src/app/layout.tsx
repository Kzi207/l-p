import type { Metadata, Viewport } from "next";
import { Baloo_2, Caveat, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CoupleProvider } from "@/components/providers/couple-provider";
import { PushNotificationListener } from "@/components/providers/push-notification-listener";
import { GlobalNotifications } from "@/components/notifications/global-notifications";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-baloo", display: "swap" });
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Love Days — Góc nhỏ của chúng mình",
  description: "Đếm từng ngày yêu và giữ lại những khoảnh khắc chỉ thuộc về hai người.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Love Days" },
};

export const viewport: Viewport = {
  themeColor: "#FFB6C1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${baloo.variable} ${inter.variable} ${caveat.variable}`}>
        <AuthProvider><CoupleProvider><PushNotificationListener /><GlobalNotifications />{children}</CoupleProvider></AuthProvider>
      </body>
    </html>
  );
}
