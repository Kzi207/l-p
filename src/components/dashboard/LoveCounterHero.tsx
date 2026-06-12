"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

import { useCouple } from "@/hooks/useCouple";
import { calculateDetailedTime } from "@/lib/date";
import { AvatarPair } from "@/components/shared/AvatarPair";

export function LoveCounterHero({ loveDays }: { loveDays?: number }) {
  const { couple } = useCouple();
  const startDate = couple?.startDate || new Date().toISOString();
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
    }, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, []);

  const time = useMemo(() => {
    const calculated = calculateDetailedTime(startDate);
    if (typeof loveDays === "number") {
      return {
        ...calculated,
        totalDays: loveDays,
      };
    }
    return calculated;
  }, [startDate, tick, loveDays]);

  const formattedStart = new Date(startDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex h-auto flex-col items-center justify-between gap-6 overflow-hidden rounded-[32px] border border-white/65 bg-white/75 backdrop-blur-md p-6 shadow-panel select-none md:h-[260px] md:flex-row md:p-8"
    >
      {/* Decorative Glow Elements */}
      <div className="pointer-events-none absolute -bottom-16 -right-16 size-56 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-primary/8 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Center Heart Decoration */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center pointer-events-none z-0">
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-ping" style={{ animationDuration: "3s" }} />
          <Heart className="size-12 text-primary/10 fill-primary/5 animate-pulse" />
        </div>
      </div>

      <div className="z-10 flex flex-col items-center text-center md:items-start md:text-left">
        <AvatarPair
          avatar1={couple?.partner1.avatar ?? null}
          avatar2={couple?.partner2.avatar ?? null}
          name1={couple?.partner1.name}
          name2={couple?.partner2.name}
          size="lg"
          className="mb-4 shadow-sm"
        />
        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
          {couple?.partner1.name ?? "You"}
          <Heart className="size-4 animate-bounce fill-primary text-primary" />
          {couple?.partner2.name ?? "Partner"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground font-medium">Bên nhau từ ngày {formattedStart}</p>
      </div>

      <div className="z-10 flex flex-col items-center text-center md:items-end md:text-right">
        <div className="flex items-baseline gap-2">
          <span className="bg-gradient-to-r from-primary to-[#FF80A4] bg-clip-text text-6xl font-extrabold tracking-tight text-transparent md:text-7xl animate-pulse" style={{ animationDuration: "3s" }}>
            {time.totalDays}
          </span>
          <span className="text-xl font-bold text-foreground">ngày</span>
        </div>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Yêu thương & gắn kết
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border/20 bg-white/60 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
          <div className="flex flex-col items-center px-1">
            <span className="font-bold text-foreground text-sm">{time.years}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80">năm</span>
          </div>
          <div className="h-6 w-px bg-border/30" />
          <div className="flex flex-col items-center px-1">
            <span className="font-bold text-foreground text-sm">{time.months}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80">tháng</span>
          </div>
          <div className="h-6 w-px bg-border/30" />
          <div className="flex flex-col items-center px-1">
            <span className="font-bold text-foreground text-sm">{time.days}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80">ngày</span>
          </div>
          <div className="h-6 w-px bg-border/30" />
          <div className="flex flex-col items-center px-1">
            <span className="font-bold text-foreground text-sm">{time.hours}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80">giờ</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
