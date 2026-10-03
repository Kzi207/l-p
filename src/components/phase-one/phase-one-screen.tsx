"use client";

import type { User } from "firebase/auth";
import { CalendarDays, Heart } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SharedCalendar } from "@/components/calendar/shared-calendar";
import { LoginScreen } from "@/components/auth/login-screen";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";

export function PhaseOneScreen() {
  const { user } = useAuth();
  const { couple, profile, loading } = useCoupleSpace();
  if (!user) return <LoginScreen />;
  if (loading) return <main className="grid min-h-dvh place-items-center"><Heart className="size-9 animate-pulse fill-blush text-blush" /></main>;
  if (!couple) return <PairingScreen user={user} />;
  return <CalendarContent user={user} coupleId={couple.id} authorName={profile?.nickname || profile?.displayName || user.displayName || "Người thương"} />;
}

function CalendarContent({ user, coupleId, authorName }: { user: User; coupleId: string; authorName: string }) {
  return (
    <main className="min-h-dvh px-4 pb-32 pt-7 sm:px-6">
      <section className="app-frame">
        <header className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-blush/45 shadow-soft">
            <CalendarDays className="size-6 text-[#c66f80]" />
          </span>
          <div>
            <p className="font-handwritten text-xl text-[#a56f78]">Những ngày mình mong chờ</p>
            <h1 className="font-display text-3xl font-extrabold">Lịch đôi</h1>
          </div>
        </header>
        <SharedCalendar user={user} coupleId={coupleId} authorName={authorName} />
      </section>
      <BottomNav />
    </main>
  );
}
