"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Trash, LogOut } from "lucide-react";
import { toast } from "sonner";

export function DangerZone() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDisconnect = () => {
    if (confirm("Cảnh báo: Bạn có chắc chắn muốn rời khỏi cặp đôi hiện tại? Mọi thông tin chung sẽ tạm thời bị ẩn đi.")) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        toast.success("Đã ngắt kết nối cặp đôi thành công!");
      }, 1000);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của mình? Thao tác này không thể hoàn tác.")) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        toast.error("Yêu cầu xóa tài khoản đã được tiếp nhận.");
      }, 1000);
    }
  };

  return (
    <Card className="rounded-[24px] border border-red-200/60 bg-red-50/5 shadow-sm overflow-hidden select-none">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="text-base font-semibold text-red-600 flex items-center gap-2">
          <ShieldAlert className="size-4.5 text-red-500" />
          Vùng nguy hiểm
        </CardTitle>
        <CardDescription className="text-xs text-red-500/80 mt-0.5">
          Các thao tác nhạy cảm liên quan đến tài khoản và quyền riêng tư cặp đôi. Hãy cân nhắc kĩ!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-3 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-100/30 pb-4">
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground">Hủy kết nối cặp đôi</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Bạn sẽ ngắt kết nối với đối phương và quay lại không gian độc thân.</p>
          </div>
          <Button
            onClick={handleDisconnect}
            disabled={isProcessing}
            variant="secondary"
            className="rounded-xl border-red-200/50 hover:bg-red-50 text-red-600 text-xs font-semibold px-4 h-9 self-start sm:self-center"
          >
            <LogOut className="size-3.5 mr-1.5" />
            Hủy kết nối
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-red-600">Xóa tài khoản vĩnh viễn</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Xóa hoàn toàn thông tin cá nhân và tài khoản của bạn khỏi hệ thống.</p>
          </div>
          <Button
            onClick={handleDeleteAccount}
            disabled={isProcessing}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 h-9 self-start sm:self-center"
          >
            <Trash className="size-3.5 mr-1.5" />
            Xóa tài khoản
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
