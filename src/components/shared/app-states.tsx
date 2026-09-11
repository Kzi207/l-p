"use client";

import { Heart, RefreshCw, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

export function AppLoading({ onContinue }: { onContinue?: () => void }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 3_500);
    return () => window.clearTimeout(timer);
  }, []);

  // Một số PWA/WebView tạm ngưng callback khôi phục Firebase khi ứng dụng vừa
  // thức dậy. Màn hình khởi động không được phép khóa người dùng vô thời hạn.
  useEffect(() => {
    if (!onContinue) return;
    const timer = window.setTimeout(onContinue, 6_000);
    return () => window.clearTimeout(timer);
  }, [onContinue]);

  return (
    <main className="grid min-h-dvh place-items-center px-5" aria-label="Đang tải Love Days">
      <div className="text-center">
        <Heart className="mx-auto size-12 animate-pulse fill-blush text-blush" />
        <p className="mt-4 font-handwritten text-2xl text-[#a56f78]">Đang mở Love Days...</p>
        <p className="mt-1 text-xs text-[#9b887e]">Đang khôi phục phiên đăng nhập và không gian của hai bạn.</p>
        {slow && onContinue && <button type="button" onClick={onContinue} className="secondary-button mx-auto mt-5 !min-h-11">
          <RefreshCw className="size-4" /> Tiếp tục vào ứng dụng
        </button>}
      </div>
    </main>
  );
}

export function ConfigurationMissing() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <section className="soft-card max-w-lg p-8 text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-blush/40 shadow-soft">
          <Settings2 className="size-7" />
        </div>
        <p className="font-handwritten text-2xl text-[#a56f78]">Chỉ còn một bước nhỏ</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Kết nối tổ ấm của bạn</h1>
        <p className="mt-3 text-sm leading-6 text-[#806e65]">Sao chép <code>.env.local.example</code> thành <code>.env.local</code>, sau đó điền cấu hình Firebase, Google Apps Script và Cloudinary theo README.</p>
      </section>
    </main>
  );
}
