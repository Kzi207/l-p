"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  StickyNote,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { useCouple } from "@/hooks/useCouple";
import { useDashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";
import { AvatarPair } from "@/components/shared/AvatarPair";
import { Logo } from "@/components/shared/Logo";

const menuItems = [
  { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { name: "Khoảnh khắc", href: "/memories", icon: ImageIcon },
  { name: "Nhật ký", href: "/journal", icon: BookOpen },
  { name: "Lịch chung", href: "/calendar", icon: Calendar },
  { name: "Ghi chú", href: "/notes", icon: StickyNote },
  { name: "Cài đặt", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: dashboardData } = useDashboard();
  const { couple } = useCouple();

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] flex-shrink-0 flex-col border-r border-border bg-card select-none lg:flex">
      <div className="flex h-[72px] items-center px-6 border-b border-border/50">
        <Link href="/dashboard" className="group flex items-center gap-2.5">
          <Logo size="sm" className="group-hover:scale-105" />
          <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-bold tracking-tight">
            LoveSpace
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-6">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-[18px]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-secondary/40 p-3">
          <AvatarPair
            avatar1={couple?.partner1.avatar ?? null}
            avatar2={couple?.partner2.avatar ?? null}
            name1={couple?.partner1.name}
            name2={couple?.partner2.name}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {couple?.partner1.name ?? "Bạn"} & {couple?.partner2.name ?? "Nửa kia"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <span>Đã yêu:</span>
              <span className="font-bold text-primary">
                {dashboardData?.loveDays ?? "..."} ngày
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-white/70 py-2 text-xs font-bold text-muted-foreground hover:text-red-500 hover:bg-red-50/40 hover:border-red-200/50 transition-all duration-200"
        >
          <LogOut className="size-3.5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
