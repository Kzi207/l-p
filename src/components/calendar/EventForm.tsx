"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EventFormProps {
  onSubmitSuccess: (payload: {
    title: string;
    eventDate: string;
    type: string;
  }) => Promise<unknown>;
  prefilledDate?: string;
}

const eventTypes = [
  { value: "anniversary", label: "💖 Kỷ niệm" },
  { value: "birthday", label: "🎂 Sinh nhật" },
  { value: "date", label: "🍕 Hẹn hò" },
  { value: "trip", label: "✈️ Chuyến đi" },
  { value: "custom", label: "✨ Khác" },
];

export function EventForm({ onSubmitSuccess, prefilledDate }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(prefilledDate ?? "");
  const [type, setType] = useState("anniversary");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prefilledDate) {
      // If prefilledDate is just YYYY-MM-DD, append current time or a default
      if (prefilledDate.length === 10) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setEventDate(`${prefilledDate}T${timeStr}`);
      } else {
        setEventDate(prefilledDate);
      }
    }
  }, [prefilledDate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề sự kiện!");
      return;
    }
    if (!eventDate) {
      toast.error("Vui lòng chọn thời gian diễn ra!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitSuccess({
        title,
        eventDate: new Date(eventDate).toISOString(),
        type,
      });
      toast.success("Đã thêm sự kiện thành công!");
      setTitle("");
      setEventDate("");
      setType("anniversary");
    } catch {
      toast.error("Đã xảy ra lỗi khi tạo sự kiện!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="sticky top-24 overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-sm select-none">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Calendar className="size-4.5 text-primary" />
          Thêm sự kiện mới
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs text-muted-foreground">
          Lên kế hoạch cho ngày quan trọng của cả hai.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-3">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground">
              Tên sự kiện
            </Label>
            <Input
              id="title"
              placeholder="Ví dụ: Kỷ niệm 3 năm ngày yêu..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-xl border-border bg-secondary/35 text-xs focus-visible:ring-primary/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eventDate" className="text-xs font-semibold text-muted-foreground">
              Thời gian diễn ra
            </Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="rounded-xl border-border bg-secondary/35 text-xs focus-visible:ring-primary/20"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Phân loại sự kiện
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {eventTypes.map((eventType) => (
                <button
                  type="button"
                  key={eventType.value}
                  onClick={() => setType(eventType.value)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                    type === eventType.value
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-border/80 bg-white text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                  disabled={isSubmitting}
                >
                  {eventType.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-9.5 w-full rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95"
          >
            Lên kế hoạch
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
