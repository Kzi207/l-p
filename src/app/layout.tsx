import type { Metadata, Viewport } from "next";
import { Baloo_2, Caveat, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CoupleProvider } from "@/components/providers/couple-provider";
import { PushNotificationListener } from "@/components/providers/push-notification-listener";
import { GlobalNotifications } from "@/components/notifications/global-notifications";
import { MusicPlayerProvider } from "@/components/providers/music-player-provider";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-baloo", display: "swap" });
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Love Days — Góc nhỏ của chúng mình",
  description: "Đếm từng ngày yêu và giữ lại những khoảnh khắc chỉ thuộc về hai người.",
  manifest: "/manifest.json",
  applicationName: "Love Days",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
    other: [{ rel: "mask-icon", url: "/icon.svg", color: "#d96578" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Love Days" },
};

export const viewport: Viewport = {
  themeColor: "#FFB6C1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${baloo.variable} ${inter.variable} ${caveat.variable}`}>
        <AuthProvider><CoupleProvider><MusicPlayerProvider><PushNotificationListener /><GlobalNotifications />{children}</MusicPlayerProvider></CoupleProvider></AuthProvider>
      </body>
    </html>
  );
}
