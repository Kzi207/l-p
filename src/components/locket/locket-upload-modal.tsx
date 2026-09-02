"use client";
/* eslint-disable @next/next/no-img-element */

import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { Camera, Crop, Images, LoaderCircle, RotateCcw, Send, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { cropImageToSquare, type SquareCrop } from "@/lib/image";
import { sendNotificationInBackground } from "@/lib/notification-client";
import type { UserDocument } from "@/types/firestore";

export function LocketUploadModal({ open, user, coupleId, profile, initialFiles = [], onClose }: { open: boolean; user: User; coupleId: string; profile: UserDocument | null; initialFiles?: File[]; onClose: () => void }) {
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const cropFrame = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ pointerId: number; clientX: number; clientY: number; crop: SquareCrop } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<Array<{ width: number; height: number }>>([]);
  const [crops, setCrops] = useState<SquareCrop[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!open || initialFiles.length === 0) return;
    const selected = initialFiles.slice(0, 6);
    void selectFiles(selected);
  }, [initialFiles, open]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 6);
    event.target.value = "";
    if (selected.length === 0) return;
    void selectFiles(selected);
  }

  async function selectFiles(selected: File[]) {
    const urls = selected.map((file) => URL.createObjectURL(file));
    const sizes = await Promise.all(urls.map((url) => new Promise<{ width: number; height: number }>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: 1, height: 1 });
      image.src = url;
    })));
    setFiles(selected);
    setPreviews(urls);
    setDimensions(sizes);
    setCrops(selected.map(() => ({ zoom: 1, x: 0.5, y: 0.5 })));
    setActiveIndex(0);
    setError("");
  }

  function updateCrop(values: Partial<SquareCrop>) {
    setCrops((current) => current.map((crop, index) => index === activeIndex ? { ...crop, ...values } : crop));
  }

  function startDragging(event: React.PointerEvent<HTMLDivElement>) {
    const crop = crops[activeIndex];
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, crop };
  }

  function dragImage(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragState.current;
    const frame = cropFrame.current;
    const size = dimensions[activeIndex];
    if (!start || start.pointerId !== event.pointerId || !frame || !size) return;
    const frameSize = frame.clientWidth;
    const landscape = size.width >= size.height;
    const renderedWidth = landscape ? frameSize * start.crop.zoom * size.width / size.height : frameSize * start.crop.zoom;
    const renderedHeight = landscape ? frameSize * start.crop.zoom : frameSize * start.crop.zoom * size.height / size.width;
    const overflowX = renderedWidth - frameSize;
    const overflowY = renderedHeight - frameSize;
    const x = overflowX > 0 ? Math.min(1, Math.max(0, start.crop.x - (event.clientX - start.clientX) / overflowX)) : 0.5;
    const y = overflowY > 0 ? Math.min(1, Math.max(0, start.crop.y - (event.clientY - start.clientY) / overflowY)) : 0.5;
    updateCrop({ x, y });
  }

  function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === event.pointerId) dragState.current = null;
  }

  function close(force = false) {
    if (busy && !force) return;
    setFiles([]);
    setPreviews([]);
    setDimensions([]);
    setCrops([]);
    setActiveIndex(0);
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
        const square = await cropImageToSquare(files[index], 1600, crops[index]);
        const compressed = await imageCompression(square, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/jpeg" });
        const upload = await uploadToCloudinary(compressed, "love-days/locket-feed");
        const locket = await addDoc(collection(db, "couples", coupleId, "locketPosts"), {
          imageUrl: upload.secure_url,
          cloudinaryPublicId: upload.public_id,
          caption: caption.trim(),
          reactions: {},
          createdAt: serverTimestamp(),
          uploaderId: user.uid,
          uploaderName: profile?.nickname || profile?.displayName || user.displayName || "Người thương",
          uploaderPhotoUrl: profile?.photoURL || user.photoURL || "",
        });
        sendNotificationInBackground(user, "/api/notify/locket", {
          senderUid: user.uid,
          locketId: locket.id,
          imageUrl: upload.secure_url,
          caption: caption.trim(),
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
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-[#8f626a]"><Crop className="size-4" />Cắt ảnh {activeIndex + 1}/{previews.length}</span>
                  <button className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#8a746b] shadow-sm" type="button" onClick={() => updateCrop({ zoom: 1, x: 0.5, y: 0.5 })}><RotateCcw className="size-3.5" />Đặt lại</button>
                </div>
                <div
                  ref={cropFrame}
                  className="relative mx-auto aspect-square w-full max-w-[26rem] cursor-grab touch-none select-none overflow-hidden rounded-[1.7rem] bg-[#eadbd0] bg-no-repeat shadow-[inset_0_0_0_1px_rgba(255,255,255,.75)] active:cursor-grabbing"
                  style={{
                    backgroundImage: `url(${previews[activeIndex]})`,
                    backgroundPosition: `${(crops[activeIndex]?.x ?? 0.5) * 100}% ${(crops[activeIndex]?.y ?? 0.5) * 100}%`,
                    backgroundSize: (dimensions[activeIndex]?.width ?? 1) >= (dimensions[activeIndex]?.height ?? 1)
                      ? `auto ${(crops[activeIndex]?.zoom ?? 1) * 100}%`
                      : `${(crops[activeIndex]?.zoom ?? 1) * 100}% auto`,
                  }}
                  role="img"
                  aria-label={`Khung cắt ảnh ${activeIndex + 1}`}
                  onPointerDown={startDragging}
                  onPointerMove={dragImage}
                  onPointerUp={stopDragging}
                  onPointerCancel={stopDragging}
                >
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-45" aria-hidden="true">
                    {Array.from({ length: 9 }).map((_, index) => <span className="border-[0.5px] border-white/80" key={index} />)}
                  </div>
                  <span className="pointer-events-none absolute inset-2 rounded-[1.3rem] border border-white/70" />
                </div>
                <div className="mt-4 space-y-3 rounded-[1.4rem] bg-white/55 p-4">
                  <label className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs font-bold text-[#806d65]">Phóng to<input className="accent-[#d96578]" type="range" min="1" max="3" step="0.01" value={crops[activeIndex]?.zoom ?? 1} onChange={(event) => updateCrop({ zoom: Number(event.target.value) })} /></label>
                  <label className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs font-bold text-[#806d65]">Ngang<input className="accent-[#d96578]" type="range" min="0" max="1" step="0.005" value={crops[activeIndex]?.x ?? 0.5} onChange={(event) => updateCrop({ x: Number(event.target.value) })} /></label>
                  <label className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs font-bold text-[#806d65]">Dọc<input className="accent-[#d96578]" type="range" min="0" max="1" step="0.005" value={crops[activeIndex]?.y ?? 0.5} onChange={(event) => updateCrop({ y: Number(event.target.value) })} /></label>
                </div>
                {previews.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{previews.map((preview, index) => <button className={`relative size-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-[#eadbd0] transition ${activeIndex === index ? "border-[#d96578] shadow-soft" : "border-transparent opacity-70"}`} type="button" key={preview} onClick={() => setActiveIndex(index)} aria-label={`Chỉnh ảnh ${index + 1}`}><img src={preview} alt="" className="size-full object-cover" /><span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full bg-black/55 text-[10px] font-bold text-white">{index + 1}</span></button>)}</div>}
                <p className="mt-3 text-center text-xs leading-5 text-[#998078]">Kéo ảnh hoặc dùng các thanh chỉnh để giữ phần đẹp nhất trong khung vuông.</p>
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
