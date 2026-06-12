"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Event } from "@/types/event";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MonthGridProps {
  events: Event[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

const typeConfigs: Record<string, { label: string; badge: string; dot: string }> = {
  anniversary: { label: "Kỷ niệm", badge: "bg-pink-50 text-pink-700 border-pink-100", dot: "bg-pink-500" },
  birthday: { label: "Sinh nhật", badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  date: { label: "Hẹn hò", badge: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  trip: { label: "Chuyến đi", badge: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500" },
  custom: { label: "Khác", badge: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
};

const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function MonthGrid({ events, selectedDate, onSelectDate }: MonthGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onSelectDate(today);
  };

  // Generate calendar cells
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday, etc.

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean; dayNum: number }[] = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = totalDaysInPrevMonth - i;
    cells.push({
      date: new Date(year, month - 1, day),
      isCurrentMonth: false,
      dayNum: day,
    });
  }

  // Current month
  for (let i = 1; i <= totalDaysInMonth; i++) {
    cells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
      dayNum: i,
    });
  }

  // Next month padding
  const totalCells = cells.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainingCells; i++) {
    cells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
      dayNum: i,
    });
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => {
      const eDate = new Date(e.eventDate);
      return (
        eDate.getFullYear() === date.getFullYear() &&
        eDate.getMonth() === date.getMonth() &&
        eDate.getDate() === date.getDate()
      );
    });
  };

  return (
    <div className="flex flex-col rounded-[32px] border border-white/60 bg-white/75 p-6 backdrop-blur-md shadow-panel select-none">
      {/* Month Switcher Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-5 text-primary/80" />
          <h3 className="text-base font-bold text-foreground capitalize">
            Tháng {month + 1}, {year}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={goToToday}
            className="h-8 rounded-xl px-3 text-[10px] font-bold"
          >
            Hôm nay
          </Button>
          <div className="flex border border-border/40 rounded-xl overflow-hidden bg-white/50">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors border-r border-border/20"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekdays row */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekdays.map((day, idx) => (
          <div
            key={day}
            className={cn(
              "text-[10px] font-bold tracking-wider py-1 select-none",
              idx === 0 ? "text-rose-500/90" : "text-muted-foreground/70"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 border border-border/30 rounded-2xl p-1.5 bg-secondary/10 overflow-hidden">
        {cells.map((cell, idx) => {
          const cellEvents = getEventsForDate(cell.date);
          const cellIsToday = isToday(cell.date);
          const cellIsSelected = isSelected(cell.date);

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(cell.date)}
              className={cn(
                "min-h-[64px] md:min-h-[84px] p-1.5 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer select-none relative group",
                cell.isCurrentMonth
                  ? "bg-white border-border/35"
                  : "bg-white/40 border-transparent text-muted-foreground/40",
                cellIsSelected
                  ? "ring-2 ring-primary border-transparent shadow-sm scale-[0.98] bg-primary/[0.02]"
                  : "hover:bg-secondary/40 hover:border-border/60"
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[10px] font-bold flex size-5.5 items-center justify-center rounded-full transition-colors",
                    cellIsToday
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : cell.isCurrentMonth
                      ? "text-foreground/90"
                      : "text-muted-foreground/45"
                  )}
                >
                  {cell.dayNum}
                </span>

                {/* If selected date, show soft marker */}
                {cellIsSelected && !cellIsToday && (
                  <span className="size-1.5 rounded-full bg-primary animate-ping absolute top-2 right-2" />
                )}
              </div>

              {/* Day events visualizer */}
              <div className="mt-1 flex-1 flex flex-col justify-end gap-1 overflow-hidden">
                {/* Mobile: dots view */}
                <div className="flex flex-wrap gap-1 md:hidden max-h-3 overflow-hidden justify-center py-0.5">
                  {cellEvents.map((e) => {
                    const cfg = typeConfigs[e.type] || typeConfigs.custom;
                    return (
                      <span
                        key={e.id}
                        className={cn("size-1.5 rounded-full", cfg.dot)}
                        title={e.title}
                      />
                    );
                  })}
                </div>

                {/* Desktop: small label pills */}
                <div className="hidden md:flex flex-col gap-0.5 max-h-[44px] overflow-hidden">
                  {cellEvents.slice(0, 2).map((e) => {
                    const cfg = typeConfigs[e.type] || typeConfigs.custom;
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "text-[9px] font-semibold px-1 py-0.5 rounded border truncate max-w-full leading-tight",
                          cfg.badge
                        )}
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    );
                  })}
                  {cellEvents.length > 2 && (
                    <div className="text-[8px] font-bold text-muted-foreground/60 text-center">
                      +{cellEvents.length - 2} sự kiện
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info indicator footer */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-border/40 text-[9px] text-muted-foreground/80 font-semibold select-none justify-center">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-pink-500" /> Kỷ niệm
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" /> Sinh nhật
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500" /> Hẹn hò
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-violet-500" /> Chuyến đi
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" /> Khác
        </div>
      </div>
    </div>
  );
}
