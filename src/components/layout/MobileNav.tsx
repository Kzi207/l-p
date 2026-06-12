"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Image as ImageIcon, BookOpen, Calendar, StickyNote, Settings } from "lucide-react";

const navItems = [
  { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { name: "Khoảnh khắc", href: "/memories", icon: ImageIcon },
  { name: "Nhật ký", href: "/journal", icon: BookOpen },
  { name: "Lịch chung", href: "/calendar", icon: Calendar },
  { name: "Ghi chú", href: "/notes", icon: StickyNote },
  { name: "Cài đặt", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden flex-shrink-0 border-t border-border bg-card/90 backdrop-blur-lg px-2 py-2 flex justify-around items-center safe-area-pb z-30 sticky bottom-0 w-full select-none">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all relative flex-1 min-w-0 max-w-[70px]",
              isActive ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span className="text-[9px] truncate font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
