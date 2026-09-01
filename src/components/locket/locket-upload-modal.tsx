"use client";
/* eslint-disable @next/next/no-img-element */

import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { Camera, Images, LoaderCircle, Send, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { cropImageToSquare } from "@/lib/image";
import type { UserDocument } from "@/types/firestore";

export function LocketUploadModal({ open, user, coupleId, profile, initialFiles = [], onClose }: { open: boolean; user: User; coupleId: string; profile: UserDocument | null; initialFiles?: File[]; onClose: () => void }) {
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!open || initialFiles.length === 0) return;
    const selected = initialFiles.slice(0, 6);
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
    setError("");
  }, [initialFiles, open]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 6);
    if (selected.length === 0) return;
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
    setError("");
  }

  function close(force = false) {
    if (busy && !force) return;
    setFiles([]);
    setPreviews([]);
    setCaption("");
    setProgress("");
    setError("");
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || files.length === 0) {
      setError("Hãy chọn ít nhất một ảnh.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      for (let index = 0; index < files.length; index += 1) {
        setProgress(`Đang xử lý ảnh ${index + 1}/${files.length}...`);
        const square = await cropImageToSquare(files[index], 1600);
        const compressed = await imageCompression(square, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/jpeg" });
        const upload = await uploadToCloudinary(compressed, "love-days/locket-feed");
        await addDoc(collection(db, "couples", coupleId, "locketPosts"), {
          imageUrl: upload.secure_url,
          cloudinaryPublicId: upload.public_id,
          caption: caption.trim(),
          reactions: {},
          createdAt: serverTimestamp(),
          uploaderId: user.uid,
          uploaderName: profile?.nickname || profile?.displayName || user.displayName || "Người thương",
          uploaderPhotoUrl: profile?.photoURL || user.photoURL || "",
        });
      }
      setBusy(false);
      close(true);
    } catch (caught) {
      setBusy(false);
      setProgress("");
      setError(caught instanceof Error ? caught.message : "Chưa thể đăng ảnh. Hãy thử lại nhé.");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#3f302a]/45 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="locket-upload-title" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <motion.form className="safe-bottom my-auto max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#fff8f0] p-5 shadow-2xl sm:p-6" initial={{ y: 70, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 70, opacity: 0 }} onSubmit={submit}>
            <div className="flex items-center justify-between"><div><p className="font-handwritten text-xl text-[#a56f78]">Gửi ngay lúc này</p><h2 id="locket-upload-title" className="font-display text-2xl font-bold">Locket mới</h2></div><button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" type="button" onClick={() => close()} aria-label="Đóng"><X className="size-5" /></button></div>

            {previews.length > 0 ? (
              <div className={`mt-5 grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {previews.map((preview, index) => <div className="aspect-square overflow-hidden rounded-[1.4rem] bg-[#eadbd0]" key={preview}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt={`Ảnh đã chọn ${index + 1}`} className="size-full object-cover" /></div>)}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button className="soft-card flex min-h-32 flex-col items-center justify-center gap-2 p-4 text-sm font-semibold" type="button" onClick={() => galleryInput.current?.click()}><Images className="size-8 text-[#d47c8c]" />Chọn tối đa 6 ảnh</button>
                <button className="soft-card flex min-h-32 flex-col items-center justify-center gap-2 p-4 text-sm font-semibold" type="button" onClick={() => cameraInput.current?.click()}><Camera className="size-8 text-[#d47c8c]" />Chụp ảnh mới</button>
              </div>
            )}
            <input ref={galleryInput} className="hidden" type="file" accept="image/*" multiple onChange={chooseFiles} />
            <input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={chooseFiles} />

            {files.length > 0 && <button className="mt-3 text-sm font-semibold text-[#a15f6b] underline underline-offset-4" type="button" onClick={() => galleryInput.current?.click()}>Chọn lại ảnh</button>}
            <label className="mt-5 block text-sm font-semibold">Lời nhắn <span className="font-normal text-[#9b857b]">({caption.length}/200)</span><textarea className="soft-input mt-2 min-h-24 resize-none" maxLength={200} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Hôm nay mình muốn kể..." /></label>
            {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button className="primary-button mt-5 w-full" type="submit" disabled={busy || files.length === 0}>{busy ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}{busy ? progress : `Đăng ${files.length || ""} ảnh`}</button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
