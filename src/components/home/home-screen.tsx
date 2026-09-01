"use client";
/* eslint-disable @next/next/no-img-element */

import { signOut, type User } from "firebase/auth";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Bell, BellRing, LogOut, Music2, RefreshCw } from "lucide-react";
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
import { registerForPushNotifications } from "@/lib/fcm";
import { auth, db } from "@/lib/firebase";
import type { PhotoDocument } from "@/types/firestore";

export function HomeScreen({ user }: { user: User }) {
  const { couple, profile, partner, loading: coupleLoading, error: coupleError } = useCoupleSpace();
  const [photo, setPhoto] = useState<(PhotoDocument & { id: string }) | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<"idle" | "loading" | "granted" | "denied" | "unsupported">("idle");
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

  async function enableNotifications() {
    if (!couple) return;
    setNotificationStatus("loading");
    try {
      setNotificationStatus(await registerForPushNotifications(user.uid));
    } catch {
      setNotificationStatus("denied");
    }
  }

  if (coupleLoading) return <main className="grid min-h-dvh place-items-center"><span className="font-handwritten text-2xl text-[#a56f78]">Đang mở không gian riêng...</span></main>;
  if (!couple) return <PairingScreen user={user} />;
  if (!couple.startDate) return <CoupleSetup />;

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 sm:px-6">
      {photo && <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] scale-110 bg-cover bg-center opacity-20 blur-3xl" style={{ backgroundImage: `linear-gradient(rgba(255,248,240,.25), #fff8f0 92%), url(${photo.imageUrl})` }} />}
      <header className="app-frame relative z-20 flex items-center justify-between pt-4">
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-blush/55 font-display text-lg font-bold shadow-soft">♥</span><span className="font-display text-lg font-bold">Love Days</span></div>
        <div className="flex gap-2">
          <Link className="grid size-10 place-items-center rounded-full bg-white/60 shadow-soft" href="/music" aria-label="Mở trang nghe nhạc" title="Nghe nhạc"><Music2 className="size-4 text-[#d36f80]" /></Link>
          <button className="grid size-10 place-items-center overflow-hidden rounded-full bg-blush/35 shadow-soft" type="button" onClick={() => setProfileOpen(true)} aria-label="Mở hồ sơ cá nhân">{profile?.photoURL ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="size-full object-cover" src={profile.photoURL} alt="" /></> : <span className="font-bold">{(profile?.nickname || profile?.displayName || "B").slice(0, 1)}</span>}</button>
          <button className="grid size-10 place-items-center rounded-full bg-white/60 shadow-soft" type="button" onClick={enableNotifications} disabled={notificationStatus === "loading" || notificationStatus === "granted"} aria-label="Bật thông báo" title={notificationStatus === "granted" ? "Đã bật thông báo" : "Bật thông báo đẩy"}>{notificationStatus === "granted" ? <BellRing className="size-4 text-[#d36f80]" /> : <Bell className="size-4" />}</button>
          <button className="grid size-10 place-items-center rounded-full bg-white/60 shadow-soft" type="button" onClick={() => auth && signOut(auth)} aria-label="Đăng xuất"><LogOut className="size-4" /></button>
        </div>
      </header>

      {(dataError || coupleError) && <p className="relative z-20 mx-auto mt-3 max-w-md rounded-2xl bg-red-50/90 px-4 py-3 text-center text-sm text-red-700">{dataError || coupleError}<button className="ml-2 underline" type="button" onClick={() => window.location.reload()}><RefreshCw className="inline size-3" /> thử lại</button></p>}
      {notificationStatus === "denied" && <p className="relative z-20 mx-auto mt-3 max-w-md px-4 text-center text-xs text-[#8f655e]">Trình duyệt chưa cho phép thông báo. Bạn có thể bật lại trong cài đặt của trang.</p>}

      <LoveCounter startDate={couple.startDate.toDate()} names={names} />
      <LocketPhoto coupleId={couple.id} photo={photo} onChangePhoto={() => setModalOpen(true)} />
      <BottomNav />
      <ProfileModal open={profileOpen} user={user} profile={profile} partner={partner} onClose={() => setProfileOpen(false)} />
      <UploadModal coupleId={couple.id} open={modalOpen} user={user} profile={profile} onClose={() => setModalOpen(false)} />
    </main>
  );
}
