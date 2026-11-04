"use client";

import { GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from "firebase/auth";
import { Camera, Eye, EyeOff, Heart, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { loginWithLocket } from "@/lib/locket/locket-client-api";

function friendlyAuthError(code?: string) {
  if (code === "auth/popup-closed-by-user") return "Bạn đã đóng cửa sổ Google trước khi đăng nhập xong.";
  if (code === "auth/popup-blocked") return "Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.";
  if (code === "auth/unauthorized-domain") return "Domain này chưa được thêm vào Authorized domains trong Firebase.";
  if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed") {
    return "Firebase Authentication hoặc đăng nhập Google chưa được bật trong Firebase Console.";
  }
  if (code === "auth/network-request-failed") return "Không kết nối được Firebase. Hãy kiểm tra mạng rồi thử lại.";
  if (code === "auth/invalid-api-key") return "Firebase API key không hợp lệ. Hãy kiểm tra lại .env.local.";
  return "Chưa thể đăng nhập. Kiểm tra kết nối và thử lại nhé.";
}

export function LoginScreen() {
  const [method, setMethod] = useState<"google" | "locket">("google");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Locket Form State
  const [locketEmail, setLocketEmail] = useState("");
  const [locketPassword, setLocketPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleGoogleLogin() {
    if (!auth) return;
    setSubmitting(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (caught) {
      const code = typeof caught === "object" && caught && "code" in caught ? String(caught.code) : undefined;
      setError(friendlyAuthError(code));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLocketLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) {
      setError("Ứng dụng chưa cấu hình Firebase. Vui lòng kiểm tra cấu hình máy chủ.");
      return;
    }
    if (!locketEmail.trim() || !locketPassword) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu Locket.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await loginWithLocket(locketEmail.trim(), locketPassword);

      if (typeof res.customToken !== "string" || !res.customToken) {
        throw new Error("Máy chủ không tạo được phiên đăng nhập Locket. Vui lòng kiểm tra cấu hình Firebase Admin.");
      }
      await signInWithCustomToken(auth, res.customToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập Locket thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute left-[8%] top-[12%] text-5xl opacity-30 motion-safe:animate-[float-heart_4s_ease-in-out_infinite]">♡</div>
      <div className="pointer-events-none absolute bottom-[15%] right-[10%] text-7xl text-blush opacity-30 motion-safe:animate-[float-heart_5s_ease-in-out_infinite]">♥</div>

      <section className="soft-card w-full max-w-md p-6 sm:p-9 shadow-soft">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-blush/70 shadow-soft">
            <Heart className="size-9 fill-white text-white" aria-hidden="true" />
          </div>
          <p className="font-handwritten text-2xl text-[#a56f78]">Chỉ hai chúng mình</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[#2d221c]">Love Days</h1>
          <p className="mt-2 text-xs leading-5 text-[#806e65]">Đăng nhập để trở về góc nhỏ cất giữ những ngày yêu & kết nối Locket Camera.</p>
        </div>

        {/* Method Switcher Tabs */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-[#f2e6dc] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMethod("google"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition ${
              method === "google" ? "bg-white text-[#2d221c] shadow-sm" : "text-[#7f6c64] hover:text-[#2d221c]"
            }`}
          >
            <span className="grid size-4 place-items-center rounded-full bg-[#4285f4] text-[10px] font-bold text-white">G</span>
            Google
          </button>
          <button
            type="button"
            onClick={() => { setMethod("locket"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition ${
              method === "locket" ? "bg-white text-[#2d221c] shadow-sm" : "text-[#7f6c64] hover:text-[#2d221c]"
            }`}
          >
            <Camera className="size-4 text-amber-600" />
            Tài khoản Locket
          </button>
        </div>

        {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">{error}</p>}

        {method === "google" ? (
          <div>
            <button
              className="secondary-button w-full bg-white/90 py-3.5 shadow-sm hover:bg-white"
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <LoaderCircle className="size-5 animate-spin text-[#4285f4]" />
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-white font-bold text-[#4285f4] shadow-sm" aria-hidden="true">G</span>
              )}
              {submitting ? "Đang kết nối Google..." : "Tiếp tục với Google"}
            </button>

            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-900 border border-amber-200/50">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p>Nếu đây là lần đầu đăng nhập Google, bạn sẽ được yêu cầu kết nối tài khoản Locket 1 lần duy nhất để lưu vào hệ thống.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLocketLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#664e46]">Email Locket</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a28d82]" />
                <input
                  type="email"
                  required
                  value={locketEmail}
                  onChange={(e) => setLocketEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-[#eadad0] bg-white py-2.5 pl-10 pr-3 text-sm text-[#2d221c] outline-none transition focus:border-[#d97c8d] focus:ring-2 focus:ring-[#d97c8d]/20"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#664e46]">Mật khẩu Locket</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a28d82]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={locketPassword}
                  onChange={(e) => setLocketPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#eadad0] bg-white py-2.5 pl-10 pr-10 text-sm text-[#2d221c] outline-none transition focus:border-[#d97c8d] focus:ring-2 focus:ring-[#d97c8d]/20"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a28d82] hover:text-[#52413a]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="primary-button w-full py-3.5 text-xs font-bold bg-gradient-to-r from-[#F7971E] to-[#FFD200] text-stone-900 hover:brightness-105"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang đăng nhập Locket...
                </>
              ) : (
                "Đăng nhập với tài khoản Locket"
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
