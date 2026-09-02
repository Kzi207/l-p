"use client";
/* eslint-disable @next/next/no-img-element */

import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import type { User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { CalendarDays, Film, ImagePlus, Images, LoaderCircle, Pencil, Play, Save, Send, Trash2, Upload, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { LoginScreen } from "@/components/auth/login-screen";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { sendNotificationInBackground } from "@/lib/notification-client";
import type { MediaMemoryDocument, UserDocument } from "@/types/firestore";

type MediaMemory = MediaMemoryDocument & { id: string };

function MediaUploadModal({ open, user, coupleId, profile, onClose }: { open: boolean; user: User; coupleId: string; profile: UserDocument | null; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/")).slice(0, 6);
    const oversized = selected.find((file) => file.type.startsWith("video/") && file.size > 100 * 1024 * 1024);
    if (oversized) {
      setError(`Video ${oversized.name} lớn hơn 100 MB.`);
      return;
    }
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
    setError(selected.length ? "" : "Hãy chọn ảnh hoặc video.");
  }

  function close(force = false) {
    if (busy && !force) return;
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setCaption("");
    setProgress("");
    setError("");
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const uploaderName = profile?.nickname || profile?.displayName || user.displayName || "Người thương";
      for (let index = 0; index < files.length; index += 1) {
        const original = files[index];
        const mediaType: "image" | "video" = original.type.startsWith("video/") ? "video" : "image";
        setProgress(`Đang tải ${index + 1}/${files.length}...`);
        const uploadFile = mediaType === "image" ? await imageCompression(original, { maxSizeMB: 2, maxWidthOrHeight: 2200, useWebWorker: true }) : original;
        const upload = await uploadMediaToCloudinary(uploadFile);
        const memory = await addDoc(collection(db, "couples", coupleId, "mediaMemories"), {
          mediaUrl: upload.secure_url,
          cloudinaryPublicId: upload.public_id,
          mediaType,
          caption: caption.trim(),
          takenAt: Timestamp.fromDate(new Date(`${takenAt}T12:00:00`)),
          createdAt: serverTimestamp(),
          uploaderId: user.uid,
          uploaderName,
        });
        sendNotificationInBackground(user, "/api/notify/memory", {
          senderUid: user.uid,
          memoryId: memory.id,
          mediaUrl: upload.secure_url,
          caption: caption.trim(),
        });
      }
      setBusy(false);
      close(true);
    } catch (caught) {
      setBusy(false);
      setProgress("");
      setError(caught instanceof Error ? caught.message : "Chưa thể lưu kỷ niệm.");
    }
  }

  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#3f302a]/50 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="media-upload-title" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <motion.form className="safe-bottom my-auto max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#fff8f0] p-5 shadow-2xl sm:p-6" initial={{ y: 70, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 70, opacity: 0 }} onSubmit={submit}>
      <div className="flex items-center justify-between"><div><p className="font-handwritten text-xl text-[#a56f78]">Cất giữ một ngày đáng nhớ</p><h2 id="media-upload-title" className="font-display text-2xl font-bold">Thêm ảnh hoặc video</h2></div><button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" type="button" onClick={() => close()} aria-label="Đóng"><X className="size-5" /></button></div>

      {previews.length > 0 ? <div className={`mt-5 grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{previews.map((preview, index) => <div className="aspect-square overflow-hidden rounded-[1.4rem] bg-[#eadbd0]" key={preview}>{files[index]?.type.startsWith("video/") ? <video className="size-full object-cover" src={preview} controls playsInline /> : <img className="size-full object-cover" src={preview} alt={`Kỷ niệm ${index + 1}`} />}</div>)}</div> : <button className="mt-5 flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-[1.7rem] border-2 border-dashed border-[#e2abb5] bg-white/40 text-[#9d6c75]" type="button" onClick={() => inputRef.current?.click()}><span className="grid size-16 place-items-center rounded-full bg-blush/35"><ImagePlus className="size-7" /></span><span className="font-semibold">Chọn tối đa 6 ảnh hoặc video</span><span className="text-xs">Video tối đa 100 MB</span></button>}
      <input ref={inputRef} className="hidden" type="file" accept="image/*,video/*" multiple onChange={chooseFiles} />
      {files.length > 0 && <button className="mt-3 text-sm font-semibold text-[#a15f6b] underline underline-offset-4" type="button" onClick={() => inputRef.current?.click()}>Chọn lại</button>}

      <div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Ngày kỷ niệm<span className="relative mt-2 block"><CalendarDays className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#a88f84]" /><input className="soft-input pl-11" required type="date" max={new Date().toISOString().slice(0, 10)} value={takenAt} onChange={(event) => setTakenAt(event.target.value)} /></span></label><label className="block text-sm font-semibold">Ghi chú <span className="font-normal text-[#9b857b]">({caption.length}/300)</span><textarea className="soft-input mt-2 min-h-24 resize-none" maxLength={300} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Điều mình muốn nhớ về khoảnh khắc này..." /></label></div>
      {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <button className="primary-button mt-5 w-full" type="submit" disabled={busy || files.length === 0}>{busy ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}{busy ? progress : `Lưu ${files.length || ""} kỷ niệm`}</button>
    </motion.form>
  </motion.div>}</AnimatePresence>;
}

export function MediaMemoriesScreen() {
  const { user } = useAuth();
  const { couple, profile, loading: coupleLoading } = useCoupleSpace();
  const [items, setItems] = useState<MediaMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<MediaMemory | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editTakenAt, setEditTakenAt] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db || !couple) return;
    const mediaQuery = query(collection(db, "couples", couple.id, "mediaMemories"), orderBy("takenAt", "desc"));
    return onSnapshot(mediaQuery, (snapshot) => {
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as MediaMemory));
      setLoading(false);
      setError("");
    }, (caught) => {
      setLoading(false);
      setError(`Không thể tải kỷ niệm (${caught.code}).`);
    });
  }, [couple]);

  function openEditor() {
    if (!selected || selected.uploaderId !== user?.uid) return;
    setEditCaption(selected.caption || "");
    setEditTakenAt(selected.takenAt.toDate().toISOString().slice(0, 10));
    setActionError("");
    setEditOpen(true);
  }

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !couple || !selected || selected.uploaderId !== user?.uid) return;
    setActionBusy(true);
    setActionError("");
    try {
      const nextTakenAt = Timestamp.fromDate(new Date(`${editTakenAt}T12:00:00`));
      await updateDoc(doc(db, "couples", couple.id, "mediaMemories", selected.id), {
        caption: editCaption.trim(),
        takenAt: nextTakenAt,
      });
      setSelected({ ...selected, caption: editCaption.trim(), takenAt: nextTakenAt });
      setEditOpen(false);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Chưa thể cập nhật kỷ niệm.");
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteMemory() {
    if (!db || !couple || !selected || selected.uploaderId !== user?.uid) return;
    setActionBusy(true);
    setActionError("");
    try {
      await deleteDoc(doc(db, "couples", couple.id, "mediaMemories", selected.id));
      setDeleteConfirmOpen(false);
      setEditOpen(false);
      setSelected(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Chưa thể xóa kỷ niệm.");
      setDeleteConfirmOpen(false);
    } finally {
      setActionBusy(false);
    }
  }

  if (!user) return <LoginScreen />;
  if (coupleLoading) return <main className="grid min-h-dvh place-items-center"><Images className="size-10 animate-pulse text-blush" /></main>;
  if (!couple) return <PairingScreen user={user} />;

  return <main className="min-h-dvh px-4 pb-32 pt-6 sm:px-6 sm:pt-9"><div className="app-frame">
    <header className="flex items-start justify-between gap-3"><div><p className="font-handwritten text-xl text-[#a56f78] sm:text-2xl">Album chỉ của hai mình</p><h1 className="font-display text-3xl font-extrabold sm:text-4xl">Ảnh &amp; video kỷ niệm</h1><p className="mt-1 text-sm text-[#8b756a]">{items.length} khoảnh khắc đã được cất giữ</p></div><button className="primary-button shrink-0 px-4" type="button" onClick={() => setUploadOpen(true)}><Upload className="size-5" /><span className="hidden sm:inline">Tải lên</span></button></header>

    {loading ? <div className="py-24 text-center"><LoaderCircle className="mx-auto size-9 animate-spin text-[#d17485]" /><p className="mt-3 text-sm text-[#8b756a]">Đang mở album...</p></div> : error ? <div className="soft-card mt-7 p-7 text-center text-sm text-red-700">{error}</div> : items.length === 0 ? <section className="soft-card mt-7 flex min-h-96 flex-col items-center justify-center px-7 text-center"><span className="grid size-20 place-items-center rounded-[1.7rem] bg-blush/25 shadow-insetSoft"><Images className="size-9 text-[#d07a8a]" /></span><h2 className="mt-5 font-display text-2xl font-bold">Album đang chờ khoảnh khắc đầu tiên</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#806e65]">Lưu ảnh và video của hai bạn theo ngày kỷ niệm, xem lại bất cứ lúc nào.</p><button className="primary-button mt-5" type="button" onClick={() => setUploadOpen(true)}><ImagePlus className="size-5" />Thêm kỷ niệm</button></section> : <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item, index) => <motion.button className={`group relative overflow-hidden rounded-[1.35rem] bg-[#eadbd0] text-left shadow-soft ${index % 5 === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`} type="button" key={item.id} onClick={() => setSelected(item)} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.25) }}>{item.mediaType === "video" ? <><video className="size-full object-cover" src={item.mediaUrl} preload="metadata" /><span className="absolute inset-0 grid place-items-center bg-black/10"><span className="grid size-12 place-items-center rounded-full bg-white/85"><Play className="ml-0.5 size-5 fill-[#c86d7e] text-[#c86d7e]" /></span></span></> : <img className="size-full object-cover transition duration-500 group-hover:scale-105" src={item.mediaUrl} alt={item.caption || "Ảnh kỷ niệm"} />}<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-8 text-white"><span className="block text-[10px] font-semibold">{item.takenAt?.toDate?.().toLocaleDateString("vi-VN")}</span>{item.caption && <span className="mt-0.5 block truncate text-xs">{item.caption}</span>}</span></motion.button>)}</section>}
  </div><BottomNav /><MediaUploadModal open={uploadOpen} user={user} coupleId={couple.id} profile={profile} onClose={() => setUploadOpen(false)} />

  <AnimatePresence>{selected && <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><motion.article className="relative max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-[1.6rem] bg-[#fff8f0]" initial={{ scale: 0.95 }} animate={{ scale: 1 }}>{selected.mediaType === "video" ? <video className="max-h-[72dvh] w-full rounded-t-[1.6rem] bg-black object-contain" src={selected.mediaUrl} controls autoPlay playsInline /> : <img className="max-h-[72dvh] w-full rounded-t-[1.6rem] bg-black object-contain" src={selected.mediaUrl} alt={selected.caption || "Ảnh kỷ niệm"} />}<button className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 shadow-soft" type="button" onClick={() => setSelected(null)} aria-label="Đóng"><X className="size-5" /></button><div className="p-5"><p className="flex items-center gap-2 text-xs font-bold text-[#a16f78]"><CalendarDays className="size-4" />{selected.takenAt?.toDate?.().toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}</p>{selected.caption && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#6e5a51]">{selected.caption}</p>}<p className="mt-3 text-xs text-[#9b857b]">Được lưu bởi {selected.uploaderName} {selected.mediaType === "video" && <><Film className="ml-1 inline size-3" /> video</>}</p>{actionError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{actionError}</p>}{selected.uploaderId === user.uid && <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#eadbd0] pt-4"><button className="secondary-button" type="button" disabled={actionBusy} onClick={openEditor}><Pencil className="size-4" />Chỉnh sửa</button><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50" type="button" disabled={actionBusy} onClick={() => setDeleteConfirmOpen(true)}><Trash2 className="size-4" />Xóa</button></div>}</div></motion.article></motion.div>}</AnimatePresence>

  <AnimatePresence>{editOpen && selected && <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#3f302a]/50 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="edit-memory-title" onMouseDown={(event) => event.target === event.currentTarget && !actionBusy && setEditOpen(false)}><motion.form className="safe-bottom w-full max-w-lg rounded-[2rem] bg-[#fff8f0] p-5 shadow-2xl sm:p-6" initial={{ y: 60, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 45, opacity: 0 }} onSubmit={saveChanges}><div className="flex items-center justify-between"><div><p className="font-handwritten text-xl text-[#a56f78]">Viết lại một chút</p><h2 id="edit-memory-title" className="font-display text-2xl font-bold">Chỉnh sửa kỷ niệm</h2></div><button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" type="button" disabled={actionBusy} onClick={() => setEditOpen(false)} aria-label="Đóng"><X className="size-5" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Ngày kỷ niệm<span className="relative mt-2 block"><CalendarDays className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#a88f84]" /><input className="soft-input pl-11" required type="date" max={new Date().toISOString().slice(0, 10)} value={editTakenAt} onChange={(event) => setEditTakenAt(event.target.value)} /></span></label><label className="block text-sm font-semibold">Ghi chú <span className="font-normal text-[#9b857b]">({editCaption.length}/300)</span><textarea className="soft-input mt-2 min-h-28 resize-none" maxLength={300} value={editCaption} onChange={(event) => setEditCaption(event.target.value)} placeholder="Điều mình muốn nhớ về khoảnh khắc này..." /></label></div>{actionError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">{actionError}</p>}<button className="primary-button mt-5 w-full" type="submit" disabled={actionBusy}>{actionBusy ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}{actionBusy ? "Đang lưu..." : "Lưu thay đổi"}</button></motion.form></motion.div>}</AnimatePresence>

  <ConfirmDialog open={deleteConfirmOpen} title="Xóa kỷ niệm này?" description="Ảnh hoặc video sẽ biến mất với cả hai người và không thể khôi phục." confirmLabel="Xóa kỷ niệm" busy={actionBusy} onCancel={() => setDeleteConfirmOpen(false)} onConfirm={deleteMemory} />
  </main>;
}
