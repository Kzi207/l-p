"use client";

import Link from "next/link";
import { Image as ImageIcon, BookOpen, Calendar, StickyNote, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actions = [
  {
    name: "Tải ảnh lên",
    description: "Lưu giữ khoảnh khắc",
    href: "/memories",
    icon: ImageIcon,
    color: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20"
  },
  {
    name: "Viết nhật ký",
    description: "Chia sẻ tâm tư",
    href: "/journal",
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
  },
  {
    name: "Thêm sự kiện",
    description: "Lên lịch hẹn hò",
    href: "/calendar",
    icon: Calendar,
    color: "bg-green-500/10 text-green-500 hover:bg-green-500/20"
  },
  {
    name: "Tạo ghi chú",
    description: "Nhắc việc nhanh",
    href: "/notes",
    icon: StickyNote,
    color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
  }
];

export function QuickActions() {
  return (
    <Card className="rounded-[24px] border border-border/80 bg-card shadow-sm select-none">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Heart className="size-4.5 text-primary fill-primary/10" />
          Thao tác nhanh
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.name}
                href={act.href}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/40 hover:border-primary/20 bg-secondary/20 hover:bg-white hover:shadow-sm transition-all duration-300 text-center group"
              >
                <div className={`size-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors duration-300 ${act.color}`}>
                  <Icon className="size-5" />
                </div>
                <span className="text-xs font-bold text-foreground leading-tight">{act.name}</span>
                <span className="text-[9px] text-muted-foreground/80 mt-1">{act.description}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
