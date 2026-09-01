"use client";

import { motion } from "framer-motion";
import { Camera, Heart } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "@/lib/firebase";
import type { PhotoDocument } from "@/types/firestore";

const REACTIONS = ["❤️", "🥰", "😘", "✨"];

export function LocketPhoto({ coupleId, photo, onChangePhoto }: { coupleId: string; photo: (PhotoDocument & { id: string }) | null; onChangePhoto: () => void }) {
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function react(emoji: string) {
    if (!db || !photo) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "couples", coupleId, "photos", photo.id), { reaction: emoji });
      setChoosing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-frame relative z-10 mt-7 flex flex-col items-center pb-32">
      <div className="relative">
        <div className="absolute -inset-2 overflow-hidden rounded-[2.65rem]">
          <div className="absolute -inset-[50%] bg-[conic-gradient(from_90deg,#ff9daf,#ffd7aa,#fff,#ff9daf)] motion-safe:animate-[gradient-spin_4s_linear_infinite]" />
        </div>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative size-64 overflow-hidden rounded-[2.25rem] border-[5px] border-[#fff8f0] bg-[#f3e7dd] shadow-soft sm:size-80"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.imageUrl} alt={photo.caption || "Khoảnh khắc Locket mới nhất"} className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 text-[#ad968b]">
              <Camera className="size-10" />
              <p className="max-w-36 text-center text-sm leading-5">Khoảnh khắc đầu tiên đang chờ hai bạn</p>
            </div>
          )}
        </motion.div>
        {photo?.reaction && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute bottom-3 right-1 grid size-14 place-items-center rounded-full bg-white text-3xl shadow-soft">
            {photo.reaction}
          </motion.span>
        )}
        <button
          className="absolute bottom-2 left-1 grid size-12 place-items-center rounded-full border-4 border-[#fff8f0] bg-[#ed8799] text-white shadow-soft transition hover:scale-105 active:scale-95"
          type="button"
          onClick={onChangePhoto}
          aria-label={photo ? "Đổi ảnh chung" : "Thêm ảnh chung"}
          title={photo ? "Đổi ảnh chung" : "Thêm ảnh chung"}
        >
          <Camera className="size-5" />
        </button>
      </div>

      {photo && (
        <div className="mt-5 text-center">
          {photo.caption && <p className="font-handwritten text-2xl text-[#694f47]">{photo.caption}</p>}
          <p className="mt-1 text-xs text-[#9b857b]">Từ {photo.uploaderName} · {photo.createdAt?.toDate ? photo.createdAt.toDate().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "vừa xong"}</p>
          <div className="relative mt-3 inline-flex">
            <button className="secondary-button" type="button" onClick={() => setChoosing((value) => !value)} aria-expanded={choosing}>
              <Heart className="size-4" /> Thả cảm xúc
            </button>
            {choosing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-[calc(100%+0.6rem)] left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/95 p-2 shadow-soft">
                {REACTIONS.map((emoji) => <button className="grid size-10 place-items-center rounded-full text-2xl transition hover:bg-blush/20 hover:scale-110 disabled:opacity-50" type="button" disabled={saving} key={emoji} onClick={() => react(emoji)} aria-label={`Thả cảm xúc ${emoji}`}>{emoji}</button>)}
              </motion.div>
            )}
          </div>
        </div>
      )}
      {!photo && (
        <button className="primary-button mt-5" type="button" onClick={onChangePhoto}>
          <Camera className="size-5" /> Thêm ảnh chung
        </button>
      )}
    </section>
  );
}
