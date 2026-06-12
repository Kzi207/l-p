"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users } from "lucide-react";
import { toast } from "sonner";

interface InviteCodeCardProps {
  code: string;
}

export function InviteCodeCard({ code }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Đã sao chép mã ghép đôi!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="rounded-[24px] border border-border/80 bg-card shadow-sm overflow-hidden select-none">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Users className="size-4.5 text-primary" />
          Kết nối nửa kia
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Sử dụng mã ghép đôi này để mời hoặc kết nối tài khoản của nửa kia vào không gian chung.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-3 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-center font-mono text-sm font-bold tracking-wider text-foreground">
            {code}
          </div>
          <Button
            onClick={handleCopy}
            variant="secondary"
            className="rounded-xl border border-border hover:bg-secondary size-10 p-0 flex items-center justify-center flex-shrink-0"
            aria-label="Copy invite code"
          >
            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4 text-muted-foreground" />}
          </Button>
        </div>
        <div className="bg-secondary/20 border border-border/40 rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-bold text-foreground mb-1">Hướng dẫn:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Người ấy tải app LoveSpace và đăng ký tài khoản.</li>
            <li>Tại màn hình chào mừng, nhập mã này vào phần ghép đôi.</li>
            <li>Sau khi ghép đôi thành công, hai bạn sẽ dùng chung không gian này!</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
