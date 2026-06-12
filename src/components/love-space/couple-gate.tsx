"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Calendar, Link, Sparkles, Send } from "lucide-react";

import { useCouple } from "@/hooks/useCouple";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CoupleGate() {
  const router = useRouter();
  const { createCouple, joinCouple } = useCouple();
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [startDate, setStartDate] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createCouple(startDate ? { startDate: new Date(startDate).toISOString() } : {});
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể tạo không gian cặp đôi");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Vui lòng nhập mã ghép đôi.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await joinCouple({ code });
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể kết nối mã ghép đôi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-[480px] select-none mx-auto p-2"
    >
      <Card className="border border-border/40 bg-white/75 backdrop-blur-md p-6 md:p-8 shadow-panel rounded-[32px] overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Heart className="size-32 fill-primary text-primary" />
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Heart className="size-6 fill-primary text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Bắt đầu không gian yêu thương
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Tạo không gian riêng tư mới hoặc tham gia bằng mã kết nối được chia sẻ từ đối phương.
          </p>
        </div>

        {/* Custom Tab Switcher */}
        <div className="relative flex gap-1 rounded-2xl bg-secondary/30 p-1 border border-border/30 mb-6">
          <button
            type="button"
            className={`relative z-10 flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
              activeTab === "create" 
                ? "bg-white text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setError(null);
              setActiveTab("create");
            }}
          >
            Khởi tạo không gian
          </button>
          <button
            type="button"
            className={`relative z-10 flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
              activeTab === "join" 
                ? "bg-white text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setError(null);
              setActiveTab("join");
            }}
          >
            Nhập mã ghép đôi
          </button>
        </div>

        {activeTab === "create" ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" /> Ngày bắt đầu yêu nhau (tùy chọn)
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border-border bg-secondary/20 focus-visible:ring-primary/20 text-xs py-5"
              />
              <p className="text-[10px] text-muted-foreground/85 leading-normal">
                Để hệ thống đếm số ngày bên nhau của hai bạn. Bạn có thể thay đổi ngày này bất cứ lúc nào trong mục Cài đặt.
              </p>
            </div>

            {error && (
              <p className="text-[11px] text-red-500 font-semibold mt-1">
                ⚠️ {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-primary to-[#ff80a4] hover:opacity-95 text-xs font-bold text-primary-foreground py-5 shadow-md shadow-primary/15 transition-all duration-300 flex items-center justify-center gap-1.5"
              disabled={loading}
            >
              {loading ? (
                <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  Tạo không gian chung
                  <Sparkles className="size-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Link className="size-3" /> Mã ghép đôi từ đối phương
              </label>
              <Input
                placeholder="Ví dụ: LOVE-ABCDEF"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="rounded-xl border-border bg-secondary/20 focus-visible:ring-primary/20 text-xs py-5"
              />
              <p className="text-[10px] text-muted-foreground/85 leading-normal">
                Yêu cầu người ấy của bạn gửi mã ghép đôi từ màn hình Cài đặt của họ và nhập vào đây để kết nối không gian chung.
              </p>
            </div>

            {error && (
              <p className="text-[11px] text-red-500 font-semibold mt-1">
                ⚠️ {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground py-5 shadow-md shadow-primary/15 transition-all duration-300 flex items-center justify-center gap-1.5 hover:bg-primary/95"
              disabled={loading}
            >
              {loading ? (
                <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  Kết nối ngay
                  <Send className="size-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </motion.div>
  );
}
