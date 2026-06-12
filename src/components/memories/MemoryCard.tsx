"use client";

import { Memory } from "@/types/memory";
import { formatShortDate } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface MemoryCardProps {
  memory: Memory;
  onClick: () => void;
}

export function MemoryCard({ memory, onClick }: MemoryCardProps) {
  return (
    <Card
      onClick={onClick}
      className="group rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 cursor-pointer select-none"
    >
      <div className="relative aspect-[4/3] bg-secondary/20 overflow-hidden">
        <img
          src={memory.imageUrl}
          alt={memory.caption}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          loading="lazy"
        />
        {/* Hover overlay with user details */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="flex items-center gap-2">
            <img
              src={memory.author.avatar ?? undefined}
              alt={memory.author.name}
              className="size-5 rounded-full object-cover border border-white/45"
            />
            <span className="text-[10px] text-white/95 font-semibold">@{memory.author.name}</span>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <p className="text-xs text-foreground/90 font-medium leading-relaxed line-clamp-2">
          {memory.caption}
        </p>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50 text-[10px] text-muted-foreground/80 font-medium">
          <div className="flex items-center gap-1.5 md:hidden">
            <img
              src={memory.author.avatar ?? undefined}
              alt={memory.author.name}
              className="size-4.5 rounded-full object-cover"
            />
            <span>{memory.author.name}</span>
          </div>
          <span className="hidden md:block">Đăng bởi {memory.author.name}</span>
          <span>{formatShortDate(memory.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
