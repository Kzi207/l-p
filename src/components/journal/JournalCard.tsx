"use client";

import { Journal } from "@/types/journal";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";

interface JournalCardProps {
  journal: Journal;
  isActive: boolean;
  onClick: () => void;
}

export function JournalCard({ journal, isActive, onClick }: JournalCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-left flex gap-3.5",
        isActive
          ? "bg-primary/5 border-primary/20 shadow-sm"
          : "bg-card border-border/60 hover:bg-secondary/40 hover:border-border"
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h4 className={cn("text-sm font-semibold tracking-tight truncate", isActive ? "text-primary" : "text-foreground")}>
            {journal.title || "Không có tiêu đề"}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {journal.content || "Chưa viết nội dung..."}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground/80 font-medium">
          <span className="font-semibold text-primary/80">@{journal.author.name}</span>
          <span className="size-1 rounded-full bg-muted-foreground/30" />
          <span>{formatShortDate(journal.createdAt)}</span>
        </div>
      </div>
      {journal.imageUrl && (
        <img
          src={journal.imageUrl}
          alt={journal.title}
          className="size-14 rounded-xl object-cover border border-border/40 flex-shrink-0"
        />
      )}
    </div>
  );
}
