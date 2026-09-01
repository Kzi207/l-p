"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarHeart, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getLoveDuration, getUpcomingMilestone } from "@/lib/date";

const QUOTES = [
  "Có những ngày bình thường, vì có nhau mà thành đáng nhớ.",
  "Mình cứ yêu nhau dịu dàng như thế nhé.",
  "Nhà không phải một nơi, nhà là nơi có chúng mình.",
  "Thêm một ngày bên nhau, thêm một điều để thương.",
  "Giữa rất nhiều người, thật vui vì mình đã tìm thấy nhau.",
  "Cảm ơn vì đã biến những ngày nhỏ bé thành cả một bầu trời.",
];

function TimeCard({ value, label }: { value: number; label: string }) {
  const formatted = label === "ngày" ? value.toLocaleString("vi-VN") : value.toString().padStart(2, "0");
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="relative grid min-h-[4.6rem] place-items-center overflow-hidden rounded-2xl border border-white/70 bg-[#fffaf5]/75 shadow-insetSoft sm:min-h-24">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={formatted}
            initial={{ rotateX: -85, opacity: 0, y: -12 }}
            animate={{ rotateX: 0, opacity: 1, y: 0 }}
            exit={{ rotateX: 85, opacity: 0, y: 12 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="font-display text-2xl font-extrabold tabular-nums sm:text-4xl"
          >
            {formatted}
          </motion.span>
        </AnimatePresence>
        <span className="absolute inset-x-2 top-1/2 h-px bg-[#ddcfc6]/50" />
      </div>
      <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#927d73] sm:text-xs">{label}</span>
    </div>
  );
}

export function LoveCounter({ startDate, names }: { startDate: Date; names: string }) {
  const [now, setNow] = useState(() => new Date());
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const duration = getLoveDuration(startDate, now);
  const milestone = useMemo(() => getUpcomingMilestone(startDate, now), [startDate, now]);

  return (
    <section className="app-frame relative z-10 pt-6 sm:pt-10">
      <div className="text-center">
        <p className="font-handwritten text-2xl text-[#a56975] sm:text-3xl">{names}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Mình đã yêu nhau</h1>
      </div>

      <div className="soft-card mt-5 p-4 sm:p-6">
        <div className="flex gap-2.5 sm:gap-4">
          <TimeCard value={duration.days} label="ngày" />
          <TimeCard value={duration.hours} label="giờ" />
          <TimeCard value={duration.minutes} label="phút" />
          <TimeCard value={duration.seconds} label="giây" />
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-blush/20 px-4 py-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/70"><CalendarHeart className="size-5 text-[#d27686]" /></div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9d7780]">Cột mốc tiếp theo</p>
            <p className="truncate text-sm font-semibold">{milestone.label} · còn {milestone.daysLeft} ngày</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-5 flex max-w-md items-start justify-center gap-2 px-3 text-center">
        <Sparkles className="mt-1 size-4 shrink-0 text-[#d48895]" />
        <p className="font-handwritten text-xl leading-6 text-[#7f655d]">“{quote}”</p>
      </div>
    </section>
  );
}
