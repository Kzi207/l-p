"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Heart, Sparkles, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/Logo";

export function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password || (mode === "register" && !name)) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "register") {
        const registerResponse = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password }),
        });

        if (!registerResponse.ok) {
          const body = (await registerResponse.json()) as { message?: string };
          throw new Error(body.message || "Không thể đăng ký tài khoản");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Email hoặc mật khẩu không chính xác");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] px-4 py-8 md:py-16 flex items-center justify-center relative overflow-hidden select-none">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-10 size-72 rounded-full bg-primary/10 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 size-80 rounded-full bg-primary/8 blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />

      <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row items-center w-full z-10">
        {/* Left Side: Branding and info */}
        <motion.div 
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex-1 text-center lg:text-left select-none max-w-xl"
        >
          <div className="flex justify-center lg:justify-start">
            <Logo size="xl" className="mb-6 hover:scale-105 transition-transform duration-300" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-4">
            <Sparkles className="size-3 text-primary animate-spin" style={{ animationDuration: "3s" }} />
            LoveSpace
          </div>

          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
            Không gian riêng tư cho <span className="bg-gradient-to-r from-primary to-[#ff80a4] bg-clip-text text-transparent">hai người</span>
          </h1>

          <p className="mt-5 text-sm md:text-base leading-relaxed text-muted-foreground">
            Lưu trữ từng bức hình kỷ niệm ngọt ngào, viết nhật ký chung mỗi ngày, lên lịch trình sự kiện và chia sẻ ghi chú bí mật trong một không gian tuyệt đẹp, riêng tư dành riêng cho cặp đôi của bạn.
          </p>

          <div className="mt-8 hidden lg:flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">100%</span>
              <span className="text-xs text-muted-foreground">Bảo mật riêng tư</span>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">Realtime</span>
              <span className="text-xs text-muted-foreground">Đồng bộ tức thì</span>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">Lưu trữ</span>
              <span className="text-xs text-muted-foreground">Không giới hạn</span>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Glassmorphism Login/Register Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="w-full max-w-[440px]"
        >
          <Card className="border border-border/40 bg-white/75 backdrop-blur-md p-6 md:p-8 shadow-panel rounded-[32px] overflow-hidden">
            {/* Sliding switcher tabs */}
            <div className="relative flex gap-1 rounded-2xl bg-secondary/30 p-1 border border-border/30">
              <button
                type="button"
                className={`relative z-10 flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "login" 
                    ? "bg-white text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setError(null);
                  setMode("login");
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={`relative z-10 flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  mode === "register" 
                    ? "bg-white text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setError(null);
                  setMode("register");
                }}
              >
                Tạo tài khoản
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "register" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Họ và tên</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Tên của bạn..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl pl-10 border-border/80 bg-secondary/20 focus-visible:ring-primary/20 text-xs py-5"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Địa chỉ Email</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl pl-10 border-border/80 bg-secondary/20 focus-visible:ring-primary/20 text-xs py-5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mật khẩu</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl pl-10 border-border/80 bg-secondary/20 focus-visible:ring-primary/20 text-xs py-5"
                  />
                </div>
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-[11px] text-red-500 font-semibold mt-1"
                >
                  ⚠️ {error}
                </motion.p>
              )}

              <Button 
                type="submit" 
                className="w-full rounded-xl bg-gradient-to-r from-primary to-[#ff80a4] hover:opacity-95 text-xs font-bold text-primary-foreground py-5 shadow-md shadow-primary/15 transition-all duration-300 mt-2 flex items-center justify-center gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    {mode === "login" ? "Đăng nhập ngay" : "Đăng ký tài khoản"}
                    <ArrowRight className="size-3.5 ml-1" />
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
