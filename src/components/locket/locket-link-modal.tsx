"use client";

import { useState } from "react";
import { Camera, Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { linkLocketAccount } from "@/lib/locket/locket-client-api";
import type { LocketAccountInfo } from "@/types/firestore";

interface LocketLinkModalProps {
  open: boolean;
  onSuccess: (account: LocketAccountInfo) => void;
  canClose?: boolean;
  onClose?: () => void;
}

export function LocketLinkModal({ open, onSuccess, canClose = false, onClose }: LocketLinkModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu tài khoản Locket.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await linkLocketAccount(email.trim(), password);
      onSuccess(res.locketAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác thực tài khoản Locket thất bại. Kiểm tra lại email và mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="soft-card relative w-full max-w-md overflow-hidden bg-white/95 p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-gradient-to-tr from-[#FFD200] to-[#F7971E] text-white shadow-md">
            <Camera className="size-8" />
          </div>
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Bắt buộc để sử dụng Locket
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#2c221e]">
            Kết nối tài khoản Locket
          </h2>
          <p className="mt-2 text-xs leading-5 text-[#735f56]">
            Nhập tài khoản Locket của bạn để đồng bộ bảng tin, nhắn tin và đăng ảnh/video. Hệ thống sẽ lưu vào cơ sở dữ liệu để <b>lần sau đăng nhập Google không cần nhập lại</b>.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#664e46]">Email Locket</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a28d82]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 p-2.5 text-[11px] text-amber-900">
            <ShieldCheck className="size-4 shrink-0 text-amber-600" />
            <span>Xác thực an toàn qua chuẩn máy chủ Locket.</span>
          </div>

          <div className="flex gap-2 pt-2">
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="secondary-button flex-1 py-3 text-xs"
              >
                Để sau
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="primary-button flex-1 py-3 text-xs font-bold bg-gradient-to-r from-[#F7971E] to-[#FFD200] text-stone-900 hover:brightness-105"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang kiểm tra Locket...
                </>
              ) : (
                "Xác thực & Lưu liên kết"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

