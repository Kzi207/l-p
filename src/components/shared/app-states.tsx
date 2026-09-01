import { Heart, Settings2 } from "lucide-react";

export function AppLoading() {
  return (
    <main className="grid min-h-dvh place-items-center px-5" aria-label="Đang tải Love Days">
      <div className="text-center">
        <Heart className="mx-auto size-12 animate-pulse fill-blush text-blush" />
        <p className="mt-4 font-handwritten text-2xl text-[#a56f78]">Đang mở Love Days...</p>
        <p className="mt-1 text-xs text-[#9b887e]">Đang khôi phục phiên đăng nhập và không gian của hai bạn.</p>
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
        <p className="mt-3 text-sm leading-6 text-[#806e65]">Sao chép <code>.env.local.example</code> thành <code>.env.local</code>, sau đó điền cấu hình Firebase và Cloudinary theo README.</p>
      </section>
    </main>
  );
}
