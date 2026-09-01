"use client";

import { HeartCrack, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Giữ chi tiết trong console để debug, không làm người dùng thấy màn hình trắng.
    console.error("Love Days runtime error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fff8f0] px-5 text-[#4a3b34]">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/55 p-8 text-center shadow-lg">
        <HeartCrack className="mx-auto size-11 text-[#d87889]" />
        <h1 className="mt-4 font-display text-3xl font-bold">Love Days vừa vấp một chút</h1>
        <p className="mt-3 text-sm leading-6 text-[#806e65]">Hãy tải lại phần này. Nếu lỗi lặp lại, xóa cache của trang rồi mở lại.</p>
        <button className="primary-button mt-6 w-full" type="button" onClick={reset}>
          <RefreshCw className="size-4" /> Thử lại
        </button>
      </section>
    </main>
  );
}
