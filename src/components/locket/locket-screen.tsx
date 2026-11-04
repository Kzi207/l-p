"use client";
import { useEffect, useRef, useState } from "react";
import { BookHeart, ChevronDown, Heart, Home, LayoutGrid, MessageCircle, Settings2, Users, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { LoginScreen } from "@/components/auth/login-screen";
import { AvatarImage } from "@/components/shared/avatar-image";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getLocketFriends } from "@/lib/locket/locket-client-api";
import { useVerticalGesture } from "@/lib/use-vertical-gesture";
import { LocketCameraStudio } from "./locket-camera-studio";
import { LocketFeedView } from "./locket-feed-view";
import { LocketChatView } from "./locket-chat-view";
import { LocketFriendsView } from "./locket-friends-view";
import { LocketAccountView } from "./locket-account-view";
import { LocketPhotobook } from "./locket-photobook";

type LocketTab = "studio" | "feed" | "chat" | "friends" | "account" | "photobook";
export function LocketScreen({ initialTab = "studio" }: { initialTab?: LocketTab }) {
  const { user } = useAuth();
  const { profile, loading } = useCoupleSpace();
  const [tab, setTab] = useState<LocketTab>(initialTab);
  const [filter, setFilter] = useState<"all" | "my">("all");
  const [grid, setGrid] = useState(false);
  const [editing, setEditing] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { if (!user) return; let active = true; getLocketFriends().then(friends => { if (active) setFriendCount(friends.length); }).catch(() => {}); return () => { active = false; }; }, [user]);
  function open(next: LocketTab) { setTab(next); window.scrollTo({ top: 0, behavior: "instant" }); }
  const cameraGesture = useVerticalGesture(direction => { if (direction === "up") { setGrid(false); open("feed"); } }, tab === "studio" && !editing && !loading && !!user);
  if (!user) return <LoginScreen />;
  if (loading) return <main className="grid min-h-dvh place-items-center bg-black"><Heart className="size-9 animate-pulse text-[#ffca28]" /></main>;
  const account = profile?.locketAccount;
  const secondary = tab === "friends" || tab === "account" || tab === "chat";
  return <main className={`locket-page locket-ios locket-reference-shell ${editing ? "" : "locket-with-site-nav"}`}>
    <div className="locket-reference-app">
      {!editing && <header className="locket-reference-header">
        <Link href="/" aria-label="Về trang chủ Love Days" className="locket-reference-icon"><Heart className="size-4" /></Link>
        {tab === "studio" ? <button type="button" onClick={() => open("friends")} className="locket-reference-pill"><Users className="size-4" />{friendCount === null ? "Bạn bè" : `${friendCount} người bạn`}</button> : <label className="locket-reference-pill relative"><span className="sr-only">Lọc khoảnh khắc</span><select aria-label="Lọc khoảnh khắc" value={filter} onChange={e => setFilter(e.target.value as "all" | "my")} className="appearance-none bg-transparent pr-5 text-center text-xs font-bold text-white outline-none"><option className="bg-[#292929]" value="all">Mọi người</option><option className="bg-[#292929]" value="my">Của mình</option></select><ChevronDown className="pointer-events-none absolute right-3 size-3 text-white/50" /></label>}
        <button type="button" onClick={() => open("account")} aria-label="Tài khoản Locket" className="locket-reference-icon overflow-hidden">{account?.avatarUrl ? <AvatarImage src={account.avatarUrl} alt="Tài khoản" /> : <Settings2 className="size-4" />}</button>
      </header>}
      <section className={`locket-reference-content ${tab === "studio" ? "locket-reference-camera" : ""} ${editing ? "locket-editing-content" : ""} ${tab === "feed" ? "locket-history-content" : ""}`} aria-label={tab === "studio" ? "Máy ảnh" : "Khoảnh khắc"}>
        {tab === "studio" && <div {...cameraGesture} className="locket-camera-gesture flex h-full flex-col" onTouchStart={e => { if ((e.target as HTMLElement).closest("button,input,textarea,select,label")) { touch.current = null; return; } touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { const start = touch.current; touch.current = null; if (!start || editing) return; const dy = e.changedTouches[0].clientY - start.y; const dx = e.changedTouches[0].clientX - start.x; if (dy < -65 && Math.abs(dy) > Math.abs(dx)) open("feed"); }}>
          <LocketCameraStudio compact onPreviewChange={setEditing} onPostSuccess={() => open("feed")} />
          {!editing && <button type="button" onClick={() => { setGrid(false); open("feed"); }} className="locket-reference-history">Lịch sử<ChevronDown className="size-4" /></button>}
        </div>}
        {tab === "feed" && <LocketFeedView filter={filter} grid={grid} onSelectMoment={() => setGrid(false)} onOpenCamera={() => open("studio")} />}
        {tab === "photobook" && <LocketPhotobook filter={filter} />}
      </section>
      {!editing && <nav className="locket-reference-dock" aria-label="Điều hướng Locket">
        <button type="button" title="Photobook" aria-label="Photobook theo tháng" aria-current={tab === "photobook" ? "page" : undefined} onClick={() => open("photobook")}><BookHeart className="size-4" /></button>
        <button type="button" aria-label="Lưới lịch sử" aria-pressed={tab === "feed" && grid} onClick={() => { setGrid(true); open("feed"); }}><LayoutGrid className="size-4" /></button>
        <button type="button" aria-label="Máy ảnh" aria-current={tab === "studio" ? "page" : undefined} onClick={() => open("studio")}>{tab === "feed" ? <span className="locket-mini-shutter" /> : <Home className="size-5 fill-current" />}</button>
        <button type="button" aria-label="Tin nhắn" aria-current={tab === "chat" ? "page" : undefined} onClick={() => open("chat")}><MessageCircle className="size-4 fill-current" /></button>
      </nav>}
      {secondary && <div className="locket-reference-sheet" role="dialog" aria-modal="true" aria-label={tab === "friends" ? "Bạn bè" : tab === "account" ? "Tài khoản" : "Tin nhắn"}><div className="mx-auto mb-4 h-1 w-8 rounded-full bg-white/20" /><button type="button" onClick={() => open("studio")} aria-label="Đóng" className="locket-reference-icon ml-auto mb-4"><X className="size-4" /></button>{tab === "friends" && <LocketFriendsView />}{tab === "account" && <LocketAccountView />}{tab === "chat" && <LocketChatView />}</div>}
    </div>
    {!editing && <BottomNav />}
  </main>;
}
