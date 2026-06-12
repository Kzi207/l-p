"use client";

import { useState } from "react";
import { useEvents } from "@/hooks/useEvents";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventList } from "@/components/calendar/EventList";
import { EventForm } from "@/components/calendar/EventForm";
import { EventFilters } from "@/components/calendar/EventFilters";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarDays } from "lucide-react";

export default function CalendarPage() {
  const { data: events, loading, error, createEvent, deleteEvent, refresh } = useEvents();
  const [filterType, setFilterType] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const eventsList = events || [];
  
  // Filter by event type
  const filteredEvents = eventsList.filter((e) => {
    if (filterType === "all") return true;
    return e.type === filterType;
  });

  // Filter events for the selected date
  const dateSpecificEvents = selectedDate
    ? filteredEvents.filter((e) => {
        const eDate = new Date(e.eventDate);
        return (
          eDate.getFullYear() === selectedDate.getFullYear() &&
          eDate.getMonth() === selectedDate.getMonth() &&
          eDate.getDate() === selectedDate.getDate()
        );
      })
    : filteredEvents;

  const handleCreate = async (payload: { title: string; eventDate: string; type: string }) => {
    await createEvent(payload);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      await deleteEvent(id);
    }
  };

  const prefilledDateString = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
    : "";

  if (loading && (!events || events.length === 0)) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        <PageHeader title="Lịch chung" description="Đang tải kế hoạch..." />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <LoadingCard rows={4} />
            <LoadingCard rows={2} />
          </div>
          <LoadingCard rows={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Lỗi tải lịch"
        description={error}
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="space-y-6 select-none">
      <PageHeader
        title="Lịch sự kiện & Kỷ niệm"
        description="Đồng hành cùng đối phương, ghi nhớ ngày hẹn hò và chuẩn bị các ngày quan trọng."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Left Side: Calendar Grid & List */}
        <div className="space-y-6">
          {/* Calendar Grid View */}
          <MonthGrid
            events={eventsList}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/40 p-4 rounded-2xl border border-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4.5 text-primary" />
              <h4 className="text-xs font-bold text-foreground">Bộ lọc sự kiện</h4>
            </div>
            <EventFilters selected={filterType} onChange={setFilterType} />
          </div>

          {/* Selected day events list / upcoming list */}
          <div className="space-y-4 bg-white/50 p-6 rounded-[28px] border border-white/60 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary" />
                  {selectedDate ? (
                    <span>
                      Sự kiện ngày {selectedDate.toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })}
                    </span>
                  ) : (
                    <span>Danh sách kế hoạch sắp tới</span>
                  )}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {selectedDate
                    ? `Hiển thị các kế hoạch chung trong ngày đã chọn (${dateSpecificEvents.length} sự kiện)`
                    : `Hiển thị toàn bộ các kế hoạch sắp diễn ra của hai bạn (${filteredEvents.length} sự kiện)`}
                </p>
              </div>
              {selectedDate && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  className="h-8 rounded-xl px-3 text-[10px] font-bold"
                >
                  Xem tất cả
                </Button>
              )}
            </div>

            {dateSpecificEvents.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl bg-secondary/15 text-xs text-muted-foreground">
                {selectedDate ? (
                  <span>Không có kế hoạch nào cho ngày này. Hãy lên kế hoạch ở bảng bên phải!</span>
                ) : (
                  <span>Không tìm thấy kế hoạch hoặc ngày kỉ niệm nào phù hợp.</span>
                )}
              </div>
            ) : (
              <EventList events={dateSpecificEvents} onDelete={handleDelete} />
            )}
          </div>
        </div>

        {/* Right Side: Form */}
        <div>
          <EventForm
            onSubmitSuccess={handleCreate}
            prefilledDate={prefilledDateString}
          />
        </div>
      </div>
    </div>
  );
}
