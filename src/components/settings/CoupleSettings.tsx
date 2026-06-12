"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import type { Couple } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CoupleSettingsProps {
  couple: Couple;
  onUpdate: (payload: Partial<Couple>) => Promise<unknown>;
}

export function CoupleSettings({ couple, onUpdate }: CoupleSettingsProps) {
  const [partner1Name, setPartner1Name] = useState(couple.partner1.name);
  const [partner2Name, setPartner2Name] = useState(couple.partner2.name);
  const [startDate, setStartDate] = useState(couple.startDate);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onUpdate({
        startDate,
        partner1: { ...couple.partner1, name: partner1Name },
        partner2: { ...couple.partner2, name: partner2Name },
      });
      toast.success("Cập nhật thông tin cặp đôi thành công!");
    } catch {
      toast.error("Không thể lưu cài đặt cặp đôi!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-sm select-none">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Heart className="size-4.5 fill-primary/10 text-primary" />
          Thông tin cặp đôi
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs text-muted-foreground">
          Quản lý ngày bắt đầu yêu và biệt danh hiển thị của cả hai bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-3">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="partner1" className="text-xs font-semibold text-muted-foreground">
                Biệt danh của bạn
              </Label>
              <Input
                id="partner1"
                value={partner1Name}
                onChange={(event) => setPartner1Name(event.target.value)}
                className="rounded-xl border-border bg-secondary/35 text-xs focus-visible:ring-primary/20"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partner2" className="text-xs font-semibold text-muted-foreground">
                Biệt danh của nửa kia
              </Label>
              <Input
                id="partner2"
                value={partner2Name}
                onChange={(event) => setPartner2Name(event.target.value)}
                className="rounded-xl border-border bg-secondary/35 text-xs focus-visible:ring-primary/20"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate" className="text-xs font-semibold text-muted-foreground">
              Ngày bắt đầu tình yêu
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border-border bg-secondary/35 text-xs focus-visible:ring-primary/20"
              disabled={isSaving}
            />
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="h-9 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/95"
          >
            Lưu thay đổi
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
