"use client";

import Link from "next/link";
import { Note } from "@/types/note";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pin, ArrowRight, Plus } from "lucide-react";

interface PinnedNoteCardProps {
  note: Note | null;
}

export function PinnedNoteCard({ note }: PinnedNoteCardProps) {
  return (
    <Card className="rounded-[24px] border border-border/80 bg-gradient-to-br from-white to-[#FDFDFD] shadow-sm select-none h-full flex flex-col justify-between overflow-hidden">
      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Pin className="size-4 text-primary fill-primary/10 rotate-45" />
          Ghi chú được ghim
        </CardTitle>
        <Link href="/notes" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
          Tất cả
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      
      <CardContent className="p-6 pt-2 flex-1 flex flex-col justify-center">
        {note ? (
          <div className="bg-[#FFFDF4]/80 border border-[#F6E9BE]/60 p-4 rounded-2xl h-full flex flex-col justify-between shadow-sm/5">
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-5">
              {note.content}
            </p>
            <span className="text-[10px] text-muted-foreground/80 font-medium self-end mt-4">Ghim bởi hai bạn</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border/60 rounded-2xl bg-secondary/10">
            <p className="text-xs text-muted-foreground">Chưa có ghi chú nào được ghim.</p>
            <Link
              href="/notes"
              className="mt-3 flex items-center gap-1 bg-white hover:bg-secondary border border-border px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm transition-all"
            >
              <Plus className="size-3 text-muted-foreground" />
              Tạo ghi chú
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
