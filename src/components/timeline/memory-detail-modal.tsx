"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, X } from "lucide-react";
import type { MemoryDocument } from "@/types/firestore";

type Memory = MemoryDocument & { id: string };

export function MemoryDetailModal({ memory, onClose }: { memory: Memory | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {memory && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#3e302a]/55 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="memory-detail-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <motion.article className="safe-bottom my-auto max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#fff8f0] shadow-2xl" initial={{ y: 70, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 70, opacity: 0 }}>
            <div className="relative overflow-hidden rounded-t-[2rem] bg-[#eadbd0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={memory.imageUrl} alt={memory.title} className="h-auto max-h-[72dvh] w-full object-contain" />
              <button className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/85 shadow-soft backdrop-blur" type="button" onClick={onClose} aria-label="Đóng"><X className="size-5" /></button>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a16f78]"><CalendarDays className="size-4" />{memory.date.toDate().toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}</div>
              <h2 id="memory-detail-title" className="mt-3 font-display text-3xl font-extrabold">{memory.title}</h2>
              {memory.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#6e5a51]">{memory.description}</p>}
              {memory.tags.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{memory.tags.map((tag) => <span className="rounded-full bg-blush/25 px-3 py-1.5 text-xs font-semibold text-[#8b5963]" key={tag}>#{tag}</span>)}</div>}
              <p className="mt-6 border-t border-[#eadbd0] pt-4 text-xs text-[#9b857b]">Được lưu bởi {memory.uploaderName}</p>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
