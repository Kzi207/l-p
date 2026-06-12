"use client";

import { cn } from "@/lib/utils";

interface EventFiltersProps {
  selected: string;
  onChange: (type: string) => void;
}

const filterOptions = [
  { value: "all", label: "Tất cả" },
  { value: "anniversary", label: "Kỷ niệm" },
  { value: "birthday", label: "Sinh nhật" },
  { value: "date", label: "Hẹn hò" },
  { value: "trip", label: "Chuyến đi" },
  { value: "custom", label: "Khác" }
];

export function EventFilters({ selected, onChange }: EventFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 select-none mb-6">
      {filterOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 shadow-sm/5 cursor-pointer",
            selected === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white hover:bg-secondary/60 text-muted-foreground border-border/80"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
