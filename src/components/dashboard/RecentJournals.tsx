"use client";

import Link from "next/link";
import { Journal } from "@/types/journal";
import { SectionCard } from "@/components/shared/SectionCard";
import { ArrowRight, BookOpen } from "lucide-react";
import { formatDate } from "@/lib/date";

interface RecentJournalsProps {
  journals: Journal[];
}

export function RecentJournals({ journals }: RecentJournalsProps) {
  return (
    <SectionCard
      title="Nhật ký chung gần đây"
      description="Nơi ghi chép những suy nghĩ, câu chuyện mộc mạc của hai bạn."
      action={
        <Link
          href="/journal"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Viết nhật ký
          <ArrowRight className="size-3" />
        </Link>
      }
    >
      {journals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-2xl bg-secondary/10">
          <p className="text-xs text-muted-foreground">Chưa viết trang nhật ký nào.</p>
          <Link href="/journal" className="mt-2 text-xs font-semibold text-primary hover:underline">
            Viết trang đầu tiên
          </Link>
        </div>
      ) : (
        <div className="relative pl-4 border-l border-border/80 ml-2 space-y-8 py-2">
          {journals.map((journal) => (
            <div key={journal.id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-[23px] top-1.5 size-2.5 rounded-full border-[2px] border-primary bg-background ring-4 ring-background group-hover:scale-110 transition-transform duration-200" />
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-primary/80">
                      @{journal.author.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(journal.createdAt)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                    <Link href={`/journal?id=${journal.id}`}>
                      {journal.title}
                    </Link>
                  </h4>
                  <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2 leading-relaxed">
                    {journal.content}
                  </p>
                </div>
                {journal.imageUrl && (
                  <img
                    src={journal.imageUrl}
                    alt={journal.title}
                    className="w-16 h-16 flex-shrink-0 aspect-square rounded-xl object-cover border border-border/40"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
