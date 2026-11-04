"use client";

import { useState } from "react";
import { Camera, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import { unlinkLocketAccount } from "@/lib/locket/locket-client-api";
import { LocketLinkModal } from "@/components/locket/locket-link-modal";
import { AvatarImage } from "@/components/shared/avatar-image";
import { useCoupleSpace } from "@/components/providers/couple-provider";

export function LocketAccountView() {
  const { profile } = useCoupleSpace();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const locket = profile?.locketAccount;

  async function handleUnlink() {
    if (!confirm("Bạn có chắc muốn hủy liên kết tài khoản Locket này?")) return;
    setUnlinking(true);
    setError("");
    setMessage("");

    try {
      await unlinkLocketAccount();
      setMessage("Đã hủy liên kết Locket thành công. Bạn có thể kết nối tài khoản khác.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hủy liên kết thất bại.");
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="soft-card p-6 sm:p-7 bg-white/95 shadow-soft">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-[#FFD200] to-[#F7971E] text-stone-900 shadow-md">
            <Camera className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-stone-800">Tài khoản Locket đã liên kết</h3>
            <p className="text-xs text-stone-500">Tự động kết nối với API Locket Camera chính thức</p>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{message}</p>}

        {locket ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4">
              <div className="flex items-center gap-3">
                <span className="size-12 shrink-0 overflow-hidden rounded-full bg-amber-200">
                  <AvatarImage src={locket.avatarUrl} alt={locket.displayName || locket.email} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-stone-900">
                      {locket.displayName || locket.email.split("@")[0]}
                    </p>
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  </div>
                  <p className="truncate text-xs text-stone-500">{locket.email}</p>
                </div>
              </div>

              <div className="mt-3.5 border-t border-stone-200/60 pt-3 text-[11px] text-stone-500 space-y-1">
                <p><b>UID:</b> {locket.uid}</p>
                <p>
                  <b>Ngày liên kết:</b>{" "}
                  {locket.linkedAt
                    ? new Date(locket.linkedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
                    : "Đã lưu"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 p-3 text-xs text-amber-900">
              <ShieldCheck className="size-4 shrink-0 text-amber-600" />
              <span>Thông tin được lưu trong cơ sở dữ liệu. Lần sau đăng nhập bằng Google sẽ không hỏi lại.</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="secondary-button flex-1 py-3 text-xs font-bold"
              >
                <RefreshCw className="size-4" />
                Đổi tài khoản Locket
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={unlinking}
                className="secondary-button py-3 px-4 text-xs font-bold text-red-600 hover:bg-red-50"
              >
                {unlinking ? <LoaderCircle className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                Ngắt kết nối
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-xs text-stone-500 mb-4">Chưa có tài khoản Locket nào được liên kết.</p>
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="primary-button py-3 px-6 text-xs font-bold bg-amber-400 text-stone-900"
            >
              Kết nối ngay
            </button>
          </div>
        )}
      </div>

      <LocketLinkModal
        open={showLinkModal}
        canClose={true}
        onClose={() => setShowLinkModal(false)}
        onSuccess={() => {
          setShowLinkModal(false);
          window.location.reload();
        }}
      />
    </div>
  );
}

