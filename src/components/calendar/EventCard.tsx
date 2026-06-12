"use client";

import { Event } from "@/types/event";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, Clock } from "lucide-react";
import { getDaysCountdown, formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  event: Event;
  onDelete?: (id: string) => void;
}

const typeConfigs: Record<string, { label: string; color: string; bg: string }> = {
  anniversary: { label: "Kỷ niệm", color: "text-pink-600 bg-pink-100", bg: "from-pink-50/20 to-white" },
  birthday: { label: "Sinh nhật", color: "text-emerald-600 bg-emerald-100", bg: "from-emerald-50/20 to-white" },
  date: { label: "Hẹn hò", color: "text-blue-600 bg-blue-100", bg: "from-blue-50/20 to-white" },
  trip: { label: "Chuyến đi", color: "text-violet-600 bg-violet-100", bg: "from-violet-50/20 to-white" },
  custom: { label: "Sự kiện", color: "text-amber-600 bg-amber-100", bg: "from-amber-50/20 to-white" }
};

export function EventCard({ event, onDelete }: EventCardProps) {
  const config = typeConfigs[event.type] || typeConfigs.custom;
  const countdown = getDaysCountdown(event.eventDate);

  let countdownText = "";
  if (countdown === 0) {
    countdownText = "Hôm nay! 🎉";
  } else if (countdown > 0) {
    countdownText = `Còn ${countdown} ngày`;
  } else {
    countdownText = `Đã qua ${Math.abs(countdown)} ngày`;
  }

  return (
    <Card className={`rounded-2xl border border-border/60 overflow-hidden shadow-sm bg-gradient-to-br ${config.bg} hover:shadow-md transition-all duration-300 select-none group`}>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="size-10 rounded-xl bg-white border border-border/40 flex flex-col items-center justify-center flex-shrink-0 shadow-sm/5">
            <Calendar className="size-4 text-muted-foreground/90" />
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
              {event.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-muted-foreground/80 font-medium flex items-center gap-1">
                <span>
                  {formatDate(event.eventDate)} • {new Date(event.eventDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
              {event.author && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 font-medium border-l border-border/40 pl-2">
                  <span>bởi</span>
                  <div className="flex items-center gap-1">
                    {event.author.avatar ? (
                      <img src={event.author.avatar} alt={event.author.name} className="size-3.5 rounded-full object-cover" />
                    ) : (
                      <div className="size-3.5 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-bold text-primary">
                        {event.author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate max-w-[60px]">{event.author.name.split(" ")[0]}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Badge className={`rounded-lg px-2 py-0 text-[9px] font-bold shadow-none ${config.color}`}>
                {config.label}
              </Badge>
              <Badge tone="zinc" className="rounded-lg px-2 py-0 text-[9px] font-bold border border-border/60 text-muted-foreground/80 flex items-center gap-1">
                <Clock className="size-2.5" />
                {countdownText}
              </Badge>
            </div>
          </div>
        </div>

        {onDelete && (
          <Button
            onClick={() => onDelete(event.id)}
            variant="ghost"
            size="sm"
            className="size-9 rounded-lg border border-border/10 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-200 p-0 flex items-center justify-center"
            aria-label="Xóa sự kiện"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
