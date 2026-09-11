"use client";
/* eslint-disable @next/next/no-img-element */

import type { User } from "firebase/auth";
import { collection, limit, onSnapshot, orderBy, query } from "@/lib/database";
import { CalendarDays, Clock3, Images, ListTodo, RefreshCw, Search, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CoupleSetup } from "@/components/home/couple-setup";
import { LocketPhoto } from "@/components/home/locket-photo";
import { LoveCounter } from "@/components/home/love-counter";
import { UploadModal } from "@/components/home/upload-modal";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { ProfileModal } from "@/components/profile/profile-modal";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { db } from "@/lib/firebase";
import type { PhotoDocument } from "@/types/firestore";

export function HomeScreen({ user }: { user: User }) {
  const { couple, profile, partner, loading: coupleLoading, error: coupleError } = useCoupleSpace();
  const [photo, setPhoto] = useState<(PhotoDocument & { id: string }) | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    if (!db || !couple) {
      setPhoto(null);
      return;
    }
    const photosQuery = query(collection(db, "couples", couple.id, "photos"), orderBy("createdAt", "desc"), limit(1));
    return onSnapshot(photosQuery, (snapshot) => {
      const first = snapshot.docs[0];
      setPhoto(first ? ({ id: first.id, ...first.data() } as PhotoDocument & { id: string }) : null);
      setDataError("");
    }, (caught) => setDataError(`Không thể tải ảnh chung (${caught.code}).`));
  }, [couple]);

  const names = useMemo(() => {
    const mine = profile?.nickname || profile?.displayName || "Bạn";
    const theirs = partner?.nickname || partner?.displayName || "Người thương";
    return `${mine} & ${theirs}`;
  }, [partner, profile]);

  if (coupleLoading) return <main className="grid min-h-dvh place-items-center"><span className="font-handwritten text-2xl text-[#a56f78]">Đang mở không gian riêng...</span></main>;
  if (!couple) return <PairingScreen user={user} />;
  if (!couple.startDate) return <CoupleSetup />;

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 pb-32 sm:px-6">
      {photo && <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] scale-110 bg-cover bg-center opacity-20 blur-3xl" style={{ backgroundImage: `linear-gradient(rgba(255,248,240,.25), #fff8f0 92%), url(${photo.imageUrl})` }} />}
      <header className="app-frame relative z-20 flex items-center justify-between pt-4">
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-blush/55 font-display text-lg font-bold shadow-soft">♥</span><span className="font-display text-lg font-bold">Love Days</span></div>
      </header>

      {(dataError || coupleError) && <p className="relative z-20 mx-auto mt-3 max-w-md rounded-2xl bg-red-50/90 px-4 py-3 text-center text-sm text-red-700">{dataError || coupleError}<button className="ml-2 underline" type="button" onClick={() => window.location.reload()}><RefreshCw className="inline size-3" /> thử lại</button></p>}
      <LoveCounter startDate={couple.startDate.toDate()} names={names} />
      <LocketPhoto coupleId={couple.id} photo={photo} onChangePhoto={() => setModalOpen(true)} />
      <section className="app-frame relative z-10 mt-6">
        <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b0717d]">Không gian của hai mình</p><h2 className="font-display text-xl font-extrabold">Khám phá Love Days</h2></div><span className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold text-[#9b7780] shadow-sm">7 tiện ích</span></div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {[{ href: "/calendar", label: "Lịch đôi", icon: CalendarDays }, { href: "/timecapsule", label: "Hộp thư", icon: Clock3 }, { href: "/albums", label: "Chuyến đi", icon: Images }, { href: "/firsts", label: "Lần đầu", icon: Sparkles }, { href: "/search", label: "Tìm kiếm", icon: Search }, { href: "/wishlist", label: "Mong muốn", icon: ListTodo }, { href: "/challenges", label: "Thử thách", icon: Trophy }].map(({ href, label, icon: Icon }, index) => <Link key={href} href={href} className="soft-card group flex min-w-0 flex-col items-center gap-2.5 p-3 text-center text-xs font-bold text-[#806e65] transition hover:-translate-y-1 active:scale-95"><span className={`grid size-11 place-items-center rounded-2xl transition group-hover:scale-105 ${index % 3 === 0 ? "bg-[#f8d4dc]" : index % 3 === 1 ? "bg-[#f8dfc9]" : "bg-[#eadff2]"}`}><Icon className="size-5 text-[#bd6174]" /></span><span className="w-full truncate">{label}</span></Link>)}
        </div>
      </section>
      <BottomNav />
      <ProfileModal open={profileOpen} user={user} profile={profile} partner={partner} onClose={() => setProfileOpen(false)} />
      <UploadModal coupleId={couple.id} open={modalOpen} user={user} profile={profile} onClose={() => setModalOpen(false)} />
    </main>
  );
}
