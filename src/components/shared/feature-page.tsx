"use client";

import { Clock3, Heart, MapPinned, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LoginScreen } from "@/components/auth/login-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { PairingScreen } from "@/components/pairing/pairing-screen";

const content = {
  timeline: {
    eyebrow: "Những điều mình đã đi qua",
    title: "Timeline kỷ niệm",
    description: "Nơi ảnh, ngày tháng và những câu chuyện của hai bạn sẽ được xếp thành một dòng thời gian dịu dàng.",
    icon: Heart,
  },
  map: {
    eyebrow: "Những nơi có dấu chân đôi",
    title: "Bản đồ kỷ niệm",
    description: "Các địa điểm hai bạn từng ghé qua sẽ xuất hiện tại đây cùng ảnh và câu chuyện tương ứng.",
    icon: MapPinned,
  },
  timecapsule: {
    eyebrow: "Gửi một lời nhắn đến mai sau",
    title: "Hộp thư tương lai",
    description: "Viết những lá thư chỉ được mở vào đúng ngày hai bạn đã hẹn với nhau.",
    icon: Clock3,
  },
} as const;

export function FeaturePage({ type }: { type: keyof typeof content }) {
  const { user } = useAuth();
  const { couple, loading } = useCoupleSpace();
  const item = content[type];
  const Icon = item.icon;

  if (!user) return <LoginScreen />;
  if (loading) return <main className="grid min-h-dvh place-items-center"><Heart className="size-9 animate-pulse fill-blush text-blush" /></main>;
  if (!couple) return <PairingScreen user={user} />;

  return (
    <main className="min-h-dvh px-4 pb-32 pt-8 sm:px-6">
      <section className="app-frame">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-blush/45 shadow-soft"><Icon className="size-6 text-[#c66f80]" /></span>
          <div>
            <p className="font-handwritten text-xl text-[#a56f78]">{item.eyebrow}</p>
            <h1 className="font-display text-3xl font-extrabold">{item.title}</h1>
          </div>
        </div>

        <div className="soft-card mt-8 flex min-h-[22rem] flex-col items-center justify-center px-7 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-blush/25 shadow-insetSoft">
            <Sparkles className="size-8 text-[#d07a8a]" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold">Trang đã sẵn sàng để mở rộng</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#806e65]">{item.description}</p>
          <p className="mt-5 rounded-full bg-white/65 px-4 py-2 text-xs font-semibold text-[#9b6b74] shadow-soft">Nội dung đầy đủ sẽ được xây dựng ở giai đoạn tiếp theo</p>
        </div>
      </section>
      <BottomNav />
    </main>
  );
}
