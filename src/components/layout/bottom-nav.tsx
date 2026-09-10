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
        className={`group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] px-0.5 text-[9px] font-semibold transition active:scale-95 sm:text-[11px] ${active ? "bg-gradient-to-b from-[#ffe3e7] to-[#ffd5dd] text-[#aa5365] shadow-[inset_0_1px_0_white]" : "text-[#9c8980] hover:bg-white/60"}`}
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
      >
        <Icon className={`size-5 shrink-0 transition-transform group-hover:-translate-y-0.5 ${active ? "stroke-[2.4]" : ""}`} />
        <span className="max-w-full truncate">{label}</span>
      </Link>
    );
  }

  const locketActive = pathname === "/locket" || pathname === "/chat";

  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-30 px-2 pb-1.5 sm:px-6 sm:pb-4" aria-label="Điều hướng chính">
      <div className="bottom-nav-panel app-frame grid grid-cols-[minmax(0,1fr)_4.35rem_minmax(0,1fr)] items-stretch rounded-[1.75rem] border border-white/90 bg-[#fffaf5]/88 p-1.5 backdrop-blur-2xl sm:p-2">
        <div className="grid min-w-0 grid-cols-2">
          {leftItems.map(renderItem)}
        </div>

        <Link
          className="relative flex min-h-14 min-w-0 flex-col items-center justify-end pb-0.5 text-[9px] font-extrabold text-[#b65f70] transition active:scale-95 sm:text-[11px]"
          href="/locket"
          aria-current={locketActive ? "page" : undefined}
          aria-label="Mở camera Locket"
        >
          <span className={`absolute -top-8 grid size-16 place-items-center rounded-full border-[5px] border-[#fff8f0] text-white shadow-[0_10px_28px_rgba(204,103,122,.4)] transition hover:-translate-y-0.5 ${locketActive ? "bg-gradient-to-br from-[#d45f75] to-[#b84c63]" : "bg-gradient-to-br from-[#f29bad] to-[#dc7086]"}`}>
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
