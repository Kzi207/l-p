"use client";
/* eslint-disable @next/next/no-img-element */

import { motion } from "framer-motion";
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { Camera, ChevronDown, Heart, ImagePlus, LoaderCircle, MessageCircle, MessagesSquare, RefreshCw, SwitchCamera, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { LoginScreen } from "@/components/auth/login-screen";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LocketChat } from "@/components/locket/locket-chat";
import { LocketThreadModal } from "@/components/locket/locket-thread-modal";
import { LocketUploadModal } from "@/components/locket/locket-upload-modal";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { db } from "@/lib/firebase";
import type { LocketPostDocument } from "@/types/firestore";

type Post = LocketPostDocument & { id: string };
type Tab = "feed" | "chat";
const EMOJIS = ["❤️", "🥰", "😂", "😮", "😭", "😘"];

function PostCard({ coupleId, post, userId, onReply }: { coupleId: string; post: Post; userId: string; onReply: () => void }) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const reactionCounts = Object.values(post.reactions || {}).reduce<Record<string, number>>((counts, emoji) => {
    counts[emoji] = (counts[emoji] || 0) + 1;
    return counts;
  }, {});

  async function react(emoji: string) {
    if (!db) return;
    await updateDoc(doc(db, "couples", coupleId, "locketPosts", post.id), { [`reactions.${userId}`]: emoji });
    setReactionsOpen(false);
  }

  async function deletePost() {
    if (!db || post.uploaderId !== userId) return;
    if (!window.confirm("Xóa ảnh Locket này? Ảnh sẽ biến mất với cả hai người và không thể khôi phục.")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteDoc(doc(db, "couples", coupleId, "locketPosts", post.id));
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Chưa thể xóa ảnh Locket.");
      setDeleting(false);
    }
  }

  const createdAt = post.createdAt?.toDate?.();

  return (
    <motion.article className="soft-card overflow-hidden" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {post.uploaderPhotoUrl ? <span className="size-10 overflow-hidden rounded-full bg-blush/30">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={post.uploaderPhotoUrl} alt="" className="size-full object-cover" /></span> : <span className="grid size-10 place-items-center rounded-full bg-blush/45 font-bold">{post.uploaderName.slice(0, 1)}</span>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{post.uploaderName}</p><p className="text-[10px] text-[#9b857b]">{createdAt ? createdAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "Vừa đăng"}</p></div>
        {post.uploaderId === userId && <button className="grid size-9 shrink-0 place-items-center rounded-full text-[#a36f78] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50" type="button" onClick={deletePost} disabled={deleting} aria-label="Xóa ảnh Locket" title="Xóa ảnh">{deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>}
      </div>
      <div className="aspect-square overflow-hidden bg-[#eadbd0]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={post.imageUrl} alt={post.caption || "Ảnh Locket"} className="size-full object-cover" /></div>
      <div className="p-4">
        {deleteError && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{deleteError}</p>}
        {post.caption && <p className="font-handwritten text-xl leading-6 text-[#664e46]">{post.caption}</p>}
        {Object.keys(reactionCounts).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{Object.entries(reactionCounts).map(([emoji, count]) => <span className="rounded-full bg-white/75 px-2.5 py-1 text-sm shadow-sm" key={emoji}>{emoji} <b className="text-xs">{count}</b></span>)}</div>}
        <div className="relative mt-4 flex gap-2">
          <button className={`secondary-button flex-1 ${post.reactions?.[userId] ? "bg-blush/30" : ""}`} type="button" onClick={() => setReactionsOpen((current) => !current)}><Heart className="size-4" />{post.reactions?.[userId] || "Cảm xúc"}</button>
          <button className="secondary-button flex-1" type="button" onClick={onReply}><MessageCircle className="size-4" />Trả lời</button>
          {reactionsOpen && <motion.div className="absolute bottom-[calc(100%+0.6rem)] left-0 flex gap-1 rounded-full bg-white/95 p-2 shadow-soft" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{EMOJIS.map((emoji) => <button className="grid size-9 place-items-center rounded-full text-xl transition hover:scale-110 hover:bg-blush/20" type="button" key={emoji} onClick={() => react(emoji)} aria-label={`Thả ${emoji}`}>{emoji}</button>)}</motion.div>}
        </div>
      </div>
    </motion.article>
  );
}

export function LocketScreen({ initialTab = "feed" }: { initialTab?: Tab }) {
  const { user } = useAuth();
  const { couple, profile, loading: coupleLoading } = useCoupleSpace();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [initialFiles, setInitialFiles] = useState<File[]>([]);
  const [threadPost, setThreadPost] = useState<Post | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!db || !user || !couple) return;
    const postsQuery = query(collection(db, "couples", couple.id, "locketPosts"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map((post) => ({ id: post.id, ...post.data() }) as Post));
      setLoading(false);
      setError("");
    }, (caught) => {
      setLoading(false);
      setError(caught.code === "permission-denied" ? "Firestore Rules chưa mở Locket. Hãy deploy rules mới." : `Không thể tải Locket (${caught.code}).`);
    });
  }, [couple, user]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (tab === "chat") stopCamera();
  }, [tab]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  async function startCamera(mode = facingMode) {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Trình duyệt này không hỗ trợ mở camera.");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Chưa thể mở camera. Hãy cho phép quyền camera trong trình duyệt.");
    }
  }

  async function switchCamera() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    await startCamera(nextMode);
  }

  function openUpload(files: File[] = []) {
    stopCamera();
    setInitialFiles(files);
    setUploadOpen(true);
  }

  function chooseGallery(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 6);
    event.target.value = "";
    if (files.length > 0) openUpload(files);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraActive || video.videoWidth === 0 || video.videoHeight === 0) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);
    canvas.toBlob((blob) => {
      if (!blob) return;
      openUpload([new File([blob], `locket-${Date.now()}.jpg`, { type: "image/jpeg" })]);
    }, "image/jpeg", 0.94);
  }

  if (!user) return <LoginScreen />;
  if (coupleLoading) return <main className="grid min-h-dvh place-items-center"><Heart className="size-9 animate-pulse fill-blush text-blush" /></main>;
  if (!couple) return <PairingScreen user={user} />;

  return (
    <main className="min-h-dvh px-4 pb-32 pt-6 sm:px-6 sm:pt-9">
      <div className="app-frame">
        <header className="text-center"><p className="font-handwritten text-xl text-[#a56f78] sm:text-2xl">Ngay lúc này, chỉ hai mình</p><h1 className="flex items-center justify-center gap-2 font-display text-3xl font-extrabold sm:text-4xl"><Camera className="size-7 text-[#d17485]" />Locket đôi</h1></header>

        <div className="soft-card mt-6 grid grid-cols-2 gap-1 p-1.5">
          <button className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition ${tab === "feed" ? "bg-blush/55 shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => setTab("feed")}><Camera className="size-4" />Camera</button>
          <button className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition ${tab === "chat" ? "bg-blush/55 shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => setTab("chat")}><MessagesSquare className="size-4" />Nhắn tin</button>
        </div>

        {tab === "chat" ? <div className="mt-5"><LocketChat coupleId={couple.id} user={user} profile={profile} /></div> : <>
          <section className="mt-5 overflow-hidden rounded-[2rem] bg-[#211d1c] p-2 shadow-[0_18px_45px_rgba(61,45,39,.24)]">
            <div className="relative aspect-square overflow-hidden rounded-[1.55rem] bg-[#302a28]">
              <video ref={videoRef} className={`size-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`} muted playsInline aria-label="Hình ảnh camera trực tiếp" />
              {!cameraActive && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,#4a3e3a,#211d1c)] px-8 text-center text-white"><span className="grid size-20 place-items-center rounded-full border border-white/20 bg-white/10"><Camera className="size-9" /></span><h2 className="mt-5 font-display text-2xl font-bold">Chụp khoảnh khắc ngay lúc này</h2><p className="mt-2 text-sm leading-6 text-white/65">Mở camera để chụp ảnh vuông giống Locket.</p></div>}
              {cameraActive && <button className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md" type="button" onClick={switchCamera} aria-label="Đổi camera trước sau"><SwitchCamera className="size-5" /></button>}
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="primary-button min-h-14" type="button" onClick={cameraActive ? capturePhoto : () => startCamera()}><Camera className="size-5" />{cameraActive ? "Chụp ảnh" : "Mở camera"}</button>
            <button className="secondary-button min-h-14" type="button" onClick={() => galleryInputRef.current?.click()}><Upload className="size-5" />Tải ảnh lên</button>
          </div>
          <input ref={galleryInputRef} className="hidden" type="file" accept="image/*" multiple onChange={chooseGallery} />
          {cameraError && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-center text-sm text-red-700">{cameraError}</p>}

          <div className="mt-8 flex flex-col items-center text-center"><ChevronDown className="size-5 animate-bounce text-[#c87887]" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7f75]">Kéo lên xem ảnh đã đăng</p></div>
          <div className="mt-4 flex items-end justify-between gap-3"><div><p className="font-handwritten text-xl text-[#a56f78]">Khoảnh khắc của hai mình</p><h2 className="font-display text-2xl font-extrabold">Ảnh đã đăng</h2></div><span className="rounded-full bg-blush/25 px-3 py-1 text-xs font-bold text-[#9b6570]">{posts.length} ảnh</span></div>

          {loading ? (
            <div className="py-24 text-center"><Heart className="mx-auto size-10 animate-pulse fill-blush text-blush" /><p className="mt-3 font-handwritten text-xl text-[#a56f78]">Đang lấy ảnh mới nhất...</p></div>
          ) : error ? (
            <div className="soft-card mt-6 p-8 text-center"><p className="text-sm text-red-700">{error}</p><button className="secondary-button mt-4" type="button" onClick={() => window.location.reload()}><RefreshCw className="size-4" />Thử lại</button></div>
          ) : posts.length === 0 ? (
            <div className="soft-card mt-6 flex min-h-72 flex-col items-center justify-center px-7 text-center"><ImagePlus className="size-12 text-[#d48a96]" /><h2 className="mt-4 font-display text-2xl font-bold">Chưa có ảnh nào</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#806e65]">Chụp ảnh hoặc tải ảnh từ máy để gửi Locket đầu tiên.</p></div>
          ) : (
            <div className="mt-6 space-y-6">{posts.map((post) => <PostCard coupleId={couple.id} key={post.id} post={post} userId={user.uid} onReply={() => setThreadPost(post)} />)}</div>
          )}
        </>}
      </div>

      <BottomNav />
      <LocketUploadModal coupleId={couple.id} open={uploadOpen} user={user} profile={profile} initialFiles={initialFiles} onClose={() => { setUploadOpen(false); setInitialFiles([]); }} />
      <LocketThreadModal coupleId={couple.id} post={threadPost} user={user} profile={profile} onClose={() => setThreadPost(null)} />
    </main>
  );
}
