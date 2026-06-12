"use client";

import Link from "next/link";
import { Memory } from "@/types/memory";
import { SectionCard } from "@/components/shared/SectionCard";
import { ArrowRight, MessageSquare, Plus } from "lucide-react";
import { formatShortDate } from "@/lib/date";
import { motion } from "framer-motion";

interface LatestMemoriesProps {
  memories: Memory[];
}

export function LatestMemories({ memories }: LatestMemoriesProps) {
  return (
    <SectionCard
      title="Khoảnh khắc gần đây"
      description="Những hình ảnh mới nhất lưu giữ kỷ niệm của hai người."
      action={
        <Link
          href="/memories"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Xem tất cả
          <ArrowRight className="size-3" />
        </Link>
      }
    >
      {memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-2xl bg-secondary/10">
          <p className="text-xs text-muted-foreground">Chưa có hình ảnh nào được lưu lại.</p>
          <Link href="/memories" className="mt-2 text-xs font-semibold text-primary hover:underline">
            Tải ảnh đầu tiên
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {memories.map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-border/40 bg-secondary/20 shadow-sm cursor-pointer"
            >
              <img
                src={memory.imageUrl}
                alt={memory.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
                <p className="text-xs text-white line-clamp-2 leading-snug mb-1 font-medium">{memory.caption}</p>
                <div className="flex items-center justify-between text-[9px] text-white/80 border-t border-white/20 pt-1.5 mt-1.5">
                  <div className="flex items-center gap-1">
                    <img src={memory.author.avatar ?? undefined} alt={memory.author.name} className="w-5 h-5 flex-shrink-0 aspect-square rounded-full object-cover border border-white/30" />
                    <span>{memory.author.name}</span>
                  </div>
                  <span>{formatShortDate(memory.createdAt)}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {/* Fill up remaining slots up to 4 */}
          {Array.from({ length: Math.max(0, 4 - memories.length) }).map((_, i) => (
            <Link
              key={`placeholder-${i}`}
              href="/memories"
              className="flex flex-col items-center justify-center aspect-square rounded-2xl border border-dashed border-border/60 bg-secondary/5 hover:bg-secondary/10 transition-all duration-300 group shadow-sm/5"
            >
              <div className="size-9 rounded-xl bg-white border border-border/40 flex items-center justify-center text-muted-foreground/50 group-hover:text-primary/70 transition-colors shadow-sm/5">
                <Plus className="size-4" />
              </div>
              <span className="text-[10px] text-muted-foreground/80 font-bold mt-2">Thêm ảnh</span>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
