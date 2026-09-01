"use client";

import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ChangeEvent, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { cropImageToSquare } from "@/lib/image";
import type { UserDocument } from "@/types/firestore";

interface UploadModalProps {
  open: boolean;
  user: User;
  coupleId: string;
  profile: UserDocument | null;
  onClose: () => void;
}

export function UploadModal({ open, user, coupleId, profile, onClose }: UploadModalProps) {
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading" | "saving">("idle");
  const [error, setError] = useState("");

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      setError("Hãy chọn một tệp ảnh nhé.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setError("");
  }

  function close(force = false) {
    if (!force && status !== "idle") return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setCaption("");
    setError("");
    onClose();
  }

  async function submit() {
    if (!db || !file) return;
    setError("");
    try {
      setStatus("compressing");
      const squareImage = await cropImageToSquare(file);
      const compressed = await imageCompression(squareImage, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/jpeg",
      });

      setStatus("uploading");
      const upload = await uploadToCloudinary(compressed);
      setStatus("saving");

      const uploaderName = profile?.nickname || profile?.displayName || user.displayName || "Người thương";
      await addDoc(collection(db, "couples", coupleId, "photos"), {
        imageUrl: upload.secure_url,
        cloudinaryPublicId: upload.public_id,
        caption: caption.trim(),
        reaction: null,
        createdAt: serverTimestamp(),
        uploaderId: user.uid,
        uploaderName,
      });
      setStatus("idle");
      close(true);
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "Có lỗi xảy ra khi gửi ảnh.");
    }
  }

  const busyLabel = status === "compressing" ? "Đang nén ảnh..." : status === "uploading" ? "Đang gửi lên mây..." : "Đang cất khoảnh khắc...";

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#4a3b34]/35 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <motion.section className="safe-bottom w-full max-w-md rounded-[2rem] bg-[#fff8f0] p-5 shadow-2xl" initial={{ y: 80, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 80, opacity: 0 }}>
            <div className="flex items-center justify-between">
              <div><p className="font-handwritten text-xl text-[#a56f78]">Gửi người thương</p><h2 id="upload-title" className="font-display text-2xl font-bold">Khoảnh khắc hôm nay</h2></div>
              <button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" onClick={() => close()} type="button" aria-label="Đóng"><X className="size-5" /></button>
            </div>

            {preview ? (
              <div className="mx-auto mt-5 aspect-square w-full max-w-72 overflow-hidden rounded-[2rem] border-4 border-white shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Ảnh đang chọn" className="size-full object-cover" />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button className="soft-card flex min-h-32 flex-col items-center justify-center gap-2 p-4 font-semibold" type="button" onClick={() => galleryInput.current?.click()}><ImagePlus className="size-8 text-[#d47c8c]" />Chọn từ thư viện</button>
                <button className="soft-card flex min-h-32 flex-col items-center justify-center gap-2 p-4 font-semibold" type="button" onClick={() => cameraInput.current?.click()}><Camera className="size-8 text-[#d47c8c]" />Chụp ảnh mới</button>
              </div>
            )}
            <input ref={galleryInput} className="hidden" type="file" accept="image/*" onChange={chooseFile} />
            <input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={chooseFile} />

            {file && (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-semibold">Một lời nhắn nhỏ <span className="font-normal text-[#9b857b]">({caption.length}/100)</span>
                  <textarea className="soft-input mt-2 min-h-20 resize-none" maxLength={100} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Hôm nay mình..." />
                </label>
                <button className="text-sm font-semibold text-[#a15f6b] underline underline-offset-4" type="button" onClick={() => galleryInput.current?.click()}>Chọn ảnh khác</button>
              </div>
            )}
            {error && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button className="primary-button mt-5 w-full" type="button" disabled={!file || status !== "idle"} onClick={submit}>
              {status === "idle" ? <Send className="size-5" /> : <LoaderCircle className="size-5 animate-spin" />}
              {status === "idle" ? "Gửi khoảnh khắc" : busyLabel}
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
