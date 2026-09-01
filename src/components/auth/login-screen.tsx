"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Heart, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { auth } from "@/lib/firebase";

function friendlyAuthError(code?: string) {
  if (code === "auth/popup-closed-by-user") return "Bạn đã đóng cửa sổ Google trước khi đăng nhập xong.";
  if (code === "auth/popup-blocked") return "Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.";
  if (code === "auth/unauthorized-domain") return "Domain này chưa được thêm vào Authorized domains trong Firebase.";
  if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed") {
    return "Firebase Authentication hoặc đăng nhập Google chưa được bật trong Firebase Console.";
  }
  if (code === "auth/network-request-failed") return "Không kết nối được Firebase. Hãy kiểm tra mạng rồi thử lại.";
  if (code === "auth/invalid-api-key") return "Firebase API key không hợp lệ. Hãy kiểm tra lại .env.local.";
  return "Chưa thể đăng nhập với Google. Kiểm tra kết nối và thử lại nhé.";
}

export function LoginScreen() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute left-[8%] top-[12%] text-5xl opacity-30 motion-safe:animate-[float-heart_4s_ease-in-out_infinite]">♡</div>
      <div className="pointer-events-none absolute bottom-[15%] right-[10%] text-7xl text-blush opacity-30 motion-safe:animate-[float-heart_5s_ease-in-out_infinite]">♥</div>

      <section className="soft-card w-full max-w-md p-6 sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-blush/70 shadow-soft">
            <Heart className="size-9 fill-white text-white" aria-hidden="true" />
          </div>
          <p className="font-handwritten text-2xl text-[#a56f78]">Chỉ hai chúng mình</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Love Days</h1>
          <p className="mt-2 text-sm leading-6 text-[#806e65]">Đăng nhập để trở về góc nhỏ cất giữ những ngày yêu.</p>
        </div>

        {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        <button className="secondary-button w-full bg-white/80 py-3.5" type="button" onClick={handleGoogleLogin} disabled={submitting}>
          {submitting ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <span className="grid size-6 place-items-center rounded-full bg-white font-bold text-[#4285f4] shadow-sm" aria-hidden="true">G</span>
          )}
          {submitting ? "Đang kết nối Google..." : "Tiếp tục với Google"}
        </button>

        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-blush/15 px-4 py-3 text-xs leading-5 text-[#806e65]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#c66f80]" />
          <p>Dữ liệu chỉ mở sau khi bạn đăng nhập thành công bằng tài khoản Google.</p>
        </div>
      </section>
    </main>
  );
}
