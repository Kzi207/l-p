"use client";

import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { CalendarDays, ImagePlus, LoaderCircle, Plus, Send, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import type { UserDocument } from "@/types/firestore";

const SUGGESTED_TAGS = ["Hẹn hò", "Du lịch", "Kỷ niệm", "Lần đầu tiên", "Sinh nhật"];

interface MemoryFormProps {
  open: boolean;
  user: User;
  coupleId: string;
  profile: UserDocument | null;
  onClose: () => void;
}

export function MemoryForm({ open, user, coupleId, profile, onClose }: MemoryFormProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function resetAndClose(force = false) {
    if (busy && !force) return;
    setTitle("");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
    setTags([]);
    setCustomTag("");
    setFile(null);
    setPreview("");
    setError("");
    onClose();
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Hãy chọn một tệp ảnh nhé.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  }

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : current.length < 8 ? [...current, tag] : current);
  }

  function addCustomTag() {
    const nextTag = customTag.trim().slice(0, 24);
    if (!nextTag || tags.includes(nextTag) || tags.length >= 8) return;
    setTags((current) => [...current, nextTag]);
    setCustomTag("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !file) {
      setError("Bạn cần chọn một ảnh cho kỷ niệm.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      setProgress("Đang nén ảnh...");
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1800,
        useWebWorker: true,
      });
      setProgress("Đang tải ảnh lên...");
      const upload = await uploadToCloudinary(compressed, "love-days/memories");
      setProgress("Đang lưu kỷ niệm...");
      await addDoc(collection(db, "couples", coupleId, "memories"), {
        title: title.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(new Date(`${date}T12:00:00`)),
        imageUrl: upload.secure_url,
        cloudinaryPublicId: upload.public_id,
        tags,
        createdAt: serverTimestamp(),
        uploaderId: user.uid,
        uploaderName: profile?.nickname || profile?.displayName || user.displayName || "Người thương",
      });
      setBusy(false);
      setProgress("");
      resetAndClose(true);
    } catch (caught) {
      setBusy(false);
      setProgress("");
      setError(caught instanceof Error ? caught.message : "Chưa thể lưu kỷ niệm. Hãy thử lại nhé.");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#4a3b34]/35 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="memory-form-title" onMouseDown={(event) => event.target === event.currentTarget && resetAndClose()}>
          <motion.form className="safe-bottom my-auto max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#fff8f0] p-5 shadow-2xl sm:p-6" initial={{ y: 80, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 80, opacity: 0 }} onSubmit={submit}>
            <div className="flex items-center justify-between">
              <div><p className="font-handwritten text-xl text-[#a56f78]">Thêm một mảnh ghép</p><h2 id="memory-form-title" className="font-display text-2xl font-bold">Kỷ niệm mới</h2></div>
              <button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" type="button" onClick={() => resetAndClose()} aria-label="Đóng"><X className="size-5" /></button>
            </div>

            <button className="mt-5 block min-h-52 w-full overflow-hidden rounded-[1.6rem] border-2 border-dashed border-[#e4b5bd] bg-white/45 shadow-insetSoft" type="button" onClick={() => fileInput.current?.click()}>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Ảnh kỷ niệm đang chọn" className="h-auto max-h-[65dvh] w-full object-contain" />
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-2 text-[#a47f78]"><ImagePlus className="size-9" /><span className="text-sm font-semibold">Chọn ảnh kỷ niệm</span></span>
              )}
            </button>
            <input ref={fileInput} className="hidden" type="file" accept="image/*" onChange={selectImage} />

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">Tiêu đề<input className="soft-input mt-2" required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Chuyến đi đầu tiên của mình" /></label>
              <label className="block text-sm font-semibold">Ngày kỷ niệm<span className="relative mt-2 block"><CalendarDays className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#a88f84]" /><input className="soft-input pl-11" required type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></span></label>
              <label className="block text-sm font-semibold">Câu chuyện <span className="font-normal text-[#9b857b]">({description.length}/1000)</span><textarea className="soft-input mt-2 min-h-28 resize-none" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Điều gì đã làm ngày hôm ấy thật đặc biệt?" /></label>

              <fieldset>
                <legend className="text-sm font-semibold">Tag <span className="font-normal text-[#9b857b]">(tối đa 8)</span></legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTED_TAGS.map((tag) => <button className={`rounded-full px-3 py-2 text-xs font-semibold transition ${tags.includes(tag) ? "bg-blush text-cocoa shadow-sm" : "bg-white/65 text-[#8b756a] shadow-soft"}`} type="button" key={tag} onClick={() => toggleTag(tag)}>{tag}</button>)}
                </div>
                <div className="mt-3 flex gap-2"><input className="soft-input min-w-0" maxLength={24} value={customTag} onChange={(event) => setCustomTag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomTag(); } }} placeholder="Tag khác..." /><button className="secondary-button shrink-0" type="button" onClick={addCustomTag}><Plus className="size-4" /></button></div>
                {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <button className="rounded-full bg-[#5e4a42] px-3 py-1.5 text-xs font-semibold text-white" type="button" key={tag} onClick={() => toggleTag(tag)}>{tag} ×</button>)}</div>}
              </fieldset>
            </div>

            {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button className="primary-button mt-5 w-full" type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
              {busy ? progress : "Lưu kỷ niệm"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
