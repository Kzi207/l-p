"use client";

import { Camera, Home, Images, Music2, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const leftItems = [
  { label: "Trang chủ", icon: Home, href: "/" },
  { label: "Âm nhạc", icon: Music2, href: "/music" },
];

const rightItems = [
  { label: "Kỷ niệm", icon: Images, href: "/map" },
  { label: "Cá nhân", icon: UserRound, href: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  function renderItem({ label, icon: Icon, href }: (typeof leftItems)[number]) {
    const active = pathname === href;
    return (
      <Link
        className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[9px] font-semibold transition active:scale-95 sm:text-[11px] ${active ? "bg-blush/45 text-cocoa" : "text-[#9c8980] hover:bg-white/60"}`}
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
      >
        <Icon className={`size-5 shrink-0 ${active ? "fill-white/70" : ""}`} />
        <span className="max-w-full truncate">{label}</span>
      </Link>
    );
  }

  const locketActive = pathname === "/locket" || pathname === "/chat";

  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-30 px-2 pb-1 sm:px-6 sm:pb-3" aria-label="Điều hướng chính">
      <div className="bottom-nav-panel app-frame grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-stretch rounded-[1.6rem] border border-white/80 bg-[#fffaf5]/90 p-2 shadow-[0_-8px_30px_rgba(100,70,55,0.12)] backdrop-blur-xl">
        <div className="grid min-w-0 grid-cols-2">
          {leftItems.map(renderItem)}
        </div>

        <Link
          className="relative flex min-h-14 min-w-0 flex-col items-center justify-end pb-1 text-[10px] font-bold text-[#b65f70] transition active:scale-95 sm:text-[11px]"
          href="/locket"
          aria-current={locketActive ? "page" : undefined}
          aria-label="Mở camera Locket"
        >
          <span className={`absolute -top-8 grid size-16 place-items-center rounded-full border-[5px] border-[#fff8f0] text-white shadow-[0_9px_24px_rgba(204,103,122,.42)] transition ${locketActive ? "bg-[#c95f75]" : "bg-[#ed8799]"}`}>
            <Camera className="size-7" />
          </span>
          <span>Locket</span>
        </Link>

        <div className="grid min-w-0 grid-cols-2">
          {rightItems.map(renderItem)}
        </div>
      </div>
    </nav>
  );
}
