"use client";

import { useState } from "react";
import { Journal } from "@/types/journal";
import { JournalCard } from "./JournalCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

interface JournalListProps {
  journals: Journal[];
  activeId: string | null;
  onJournalSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function JournalList({ journals, activeId, onJournalSelect, onCreateNew }: JournalListProps) {
  const [query, setQuery] = useState("");

  const filtered = journals.filter(
    (j) =>
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.content.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
      {/* List Header Actions */}
      <div className="p-4 border-b border-border/50 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Danh sách nhật ký</span>
          <Button
            size="sm"
            onClick={onCreateNew}
            className="rounded-xl px-3 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-8"
          >
            <Plus className="size-3.5 mr-1" />
            Viết trang mới
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
          <Input
            placeholder="Tìm kiếm nhật ký..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-xl bg-secondary/35 border-border pl-9 text-xs focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* Journals List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Không tìm thấy nhật ký phù hợp.
          </div>
        ) : (
          filtered.map((journal) => (
            <JournalCard
              key={journal.id}
              journal={journal}
              isActive={activeId === journal.id}
              onClick={() => onJournalSelect(journal.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
