"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import type { User } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Check, LoaderCircle, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type { UserDocument } from "@/types/firestore";

export function ProfileModal({ open, user, profile, partner, onClose }: { open: boolean; user: User; profile: UserDocument | null; partner: UserDocument | null; onClose: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || "");
    setNickname(profile.nickname || "");
    setBirthday(profile.birthday || "");
    setBio(profile.bio || "");
    setPhotoURL(profile.photoURL || "");
  }, [profile, open]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: displayName.trim(), nickname: nickname.trim(), birthday, bio: bio.trim(), photoURL: photoURL.trim() });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể lưu hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#3f302a]/45 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <motion.form className="safe-bottom my-auto max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#fff8f0] p-5 shadow-2xl sm:p-6" initial={{ y: 70, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 70, opacity: 0 }} onSubmit={save}>
          <div className="flex items-center justify-between"><div><p className="font-handwritten text-xl text-[#a56f78]">Chỉ hai mình nhìn thấy</p><h2 id="profile-title" className="font-display text-2xl font-bold">Thông tin cá nhân</h2></div><button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" type="button" onClick={onClose} aria-label="Đóng"><X className="size-5" /></button></div>

          {partner && <section className="mt-5 flex items-center gap-3 rounded-2xl bg-blush/20 p-4">{partner.photoURL ? <span className="size-12 overflow-hidden rounded-full">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="size-full object-cover" src={partner.photoURL} alt="" /></span> : <span className="grid size-12 place-items-center rounded-full bg-white/70"><UserRound className="size-5" /></span>}<div><p className="text-xs text-[#98757c]">Người thương của bạn</p><p className="font-bold">{partner.nickname || partner.displayName}</p>{partner.bio && <p className="mt-0.5 text-xs text-[#806e65]">{partner.bio}</p>}</div></section>}

          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold">Tên hiển thị<input className="soft-input mt-1.5" required maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Tên gọi thân mật<input className="soft-input mt-1.5" maxLength={30} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Ngày sinh<input className="soft-input mt-1.5" type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Giới thiệu<textarea className="soft-input mt-1.5 min-h-20 resize-none" maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Link ảnh đại diện<input className="soft-input mt-1.5" type="url" value={photoURL} onChange={(event) => setPhotoURL(event.target.value)} /></label>
          </div>
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="primary-button mt-5 w-full" disabled={saving} type="submit">{saving ? <LoaderCircle className="size-5 animate-spin" /> : <Check className="size-5" />}{saving ? "Đang lưu..." : "Lưu hồ sơ của tôi"}</button>
        </motion.form>
      </motion.div>}
    </AnimatePresence>
  );
}
