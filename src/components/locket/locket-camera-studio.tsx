"use client";

/* eslint-disable @next/next/no-img-element -- Captured images use local blob URLs for instant previews. */

import { useState, useRef, useEffect, ChangeEvent } from "react";
import {
  Camera,
  Circle,
  FlipHorizontal,
  FolderOpen,
  Heart,
  LoaderCircle,
  Palette,
  Send,
  Sparkles,
  StopCircle,
  Video,
  X,
  Search,
  Download,
  Type,
  Users,
  Check,
} from "lucide-react";
import { getLocketFriends, getLocketPresets, postLocketMoment } from "@/lib/locket/locket-client-api";
import { LOCKET_FRAMES, applyLocketFrame } from "@/lib/locket/locket-frames";
import { AvatarImage } from "@/components/shared/avatar-image";

interface PresetItem {
  id: string;
  overlay_id: string;
  type: string;
  text: string;
  icon: string | null;
  colors: string[];
  text_color: string;
  section?: string;
}

interface CategoryGroup {
  category: string;
  items: PresetItem[];
}

const POPULAR_EMOJIS = ["❤️", "💛", "💖", "🔥", "🥰", "🥺", "🌸", "☕", "🐱", "✨", "🚀", "💬", "👑", "🍕", "🥳", "😭"];

const POPULAR_GRADIENTS = [
  { name: "Hoàng hôn", colors: ["#FF512F", "#DD2476"] },
  { name: "Tình yêu", colors: ["#FF758C", "#FF7EB3"] },
  { name: "Đại dương", colors: ["#2193B0", "#6DD5ED"] },
  { name: "Neon Cyber", colors: ["#8A2387", "#E94057"] },
  { name: "Lá xanh", colors: ["#11998E", "#38EF7D"] },
  { name: "Bóng đêm", colors: ["#232526", "#414345"] },
  { name: "Mộng mơ", colors: ["#A18CD1", "#FBC2EB"] },
  { name: "Cam sáng", colors: ["#F7971E", "#FFD200"] },
];

const FRAMES = LOCKET_FRAMES;
export function LocketCameraStudio({ onPostSuccess, onPreviewChange, compact = false }: { onPostSuccess?: () => void; onPreviewChange?: (preview: boolean) => void; compact?: boolean }) {
  // Camera & Media State
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Styling & Overlays State
  const [activeTab, setActiveTab] = useState<"presets" | "custom" | "frames">("presets");
  const [selectedFrame, setSelectedFrame] = useState("none");
  const [captionText, setCaptionText] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<PresetItem | null>(null);
  const [customColors, setCustomColors] = useState<string[]>(["#d991a3", "#ac697e"]);
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [customTextColor, setCustomTextColor] = useState("#FFFFFF");
  const [isPrivate, setIsPrivate] = useState(false);
  const [decorationOpen, setDecorationOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ uid: string; first_name?: string; last_name?: string; username?: string; profile_picture_url?: string }>>([]);
  const [friendError, setFriendError] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [captionEditing, setCaptionEditing] = useState(false);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const captionSheetRef = useRef<HTMLElement>(null);
  const resumeCamera = useRef(false);
  const startCameraCallback = useRef<() => Promise<void>>(async () => {});
  startCameraCallback.current = () => startCamera();

  // Preset Data State
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [presetSearch, setPresetSearch] = useState("");
  const [loadingPresets, setLoadingPresets] = useState(true);

  // Submission State
  const [posting, setPosting] = useState(false);
  const [postProgress, setPostProgress] = useState("");
  const [postError, setPostError] = useState("");
  const [postSuccessMessage, setPostSuccessMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { onPreviewChange?.(!!previewUrl); return () => onPreviewChange?.(false); }, [previewUrl, onPreviewChange]);
  useEffect(() => {
    if (!previewUrl && resumeCamera.current) { resumeCamera.current = false; void startCameraCallback.current(); }
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  useEffect(() => {
    let active = true;
    getLocketFriends().then(data => { if (active) setFriends(data); }).catch(() => { if (active) setFriendError("Chưa tải được bạn bè. Bạn vẫn có thể gửi đến tất cả."); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!decorationOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    captionSheetRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDecorationOpen(false);
      if (event.key === "Tab") {
        const controls = Array.from(captionSheetRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled)") || []);
        const first = controls[0]; const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("keydown", close); previousFocus?.focus(); };
  }, [decorationOpen]);

  // Load Presets on Mount
  useEffect(() => {
    getLocketPresets()
      .then((data) => {
        if (data.categorized) setCategories(data.categorized);
      })
      .catch((e) => console.warn("Failed to load presets:", e))
      .finally(() => setLoadingPresets(false));
  }, []);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      stopCamera();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  async function startCamera(mode = facingMode) {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Trình duyệt không hỗ trợ mở camera.");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Không thể mở camera. Vui lòng cho phép quyền truy cập camera và micro.");
    }
  }

  async function switchCamera() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    await startCamera(nextMode);
  }

  // Snap photo
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraActive || video.videoWidth === 0) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `locket-${Date.now()}.jpg`, { type: "image/jpeg" });
      setMediaFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMediaType("image");
      stopCamera();
    }, "image/jpeg", 0.95);
  }

  // Record video
  function startVideoRecording() {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    setRecordDuration(0);

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/mp4" });
        const file = new File([blob], `locket-video-${Date.now()}.mp4`, { type: "video/mp4" });
        setMediaFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setMediaType("video");
        stopCamera();
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 60) {
            stopVideoRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.error("Recording start error:", e);
    }
  }

  function stopVideoRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
  }

  // Handle Gallery Selection
  function handleGallerySelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith("video/");
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMediaType(isVid ? "video" : "image");
    if (isVid) setSelectedFrame("none");
    stopCamera();
  }

  function resetCapture() {
    if (posting) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setDecorationOpen(false);
    setCaptionEditing(false);
    setMediaFile(null);
    setPreviewUrl(null);
    setPostError("");
    setPostSuccessMessage("");
    resumeCamera.current = true;
  }

  // Handle Preset Select
  function selectPreset(preset: PresetItem) {
    setSelectedPreset(preset);
    setCaptionText(preset.text || "");
    setCustomColors(preset.colors && preset.colors.length ? preset.colors : ["#1A2980", "#26D0CE"]);
    setCustomIcon(preset.icon || null);
    setCustomTextColor(preset.text_color || "#FFFFFF");
  }

  // Submit Post
  async function handlePost() {
    if (!mediaFile || posting || postSuccessMessage) return;

    setPosting(true);
    setPostProgress(mediaType === "video" ? "Đang tối ưu & nén video chuẩn H.265..." : "Đang xử lý & tải ảnh lên Locket...");
    setPostError("");
    setPostSuccessMessage("");

    try {
      await postLocketMoment({
        file: await applyLocketFrame(mediaFile, selectedFrame),
        caption: captionText,
        noteType: selectedPreset ? selectedPreset.id : "colors",
        icon: customIcon,
        colors: customColors,
        textColor: customTextColor,
        isPrivate,
        recipients: recipients.length ? recipients : null,
      });

      setPostSuccessMessage("Đã đăng lên Locket thành công! 🎉");
      successTimerRef.current = setTimeout(() => {
        if (onPostSuccess) onPostSuccess();
        else { setMediaFile(null); setPreviewUrl(null); }
      }, 1500);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Đăng lên Locket thất bại.");
    } finally {
      setPosting(false);
    }
  }

  // Filter Presets
  const filteredCategories = categories.map((cat) => ({
    category: cat.category,
    items: cat.items.filter((item) =>
      presetSearch ? item.text.toLowerCase().includes(presetSearch.toLowerCase()) : true
    ),
  })).filter((cat) => cat.items.length > 0);

  // Compute Current Gradient Style
  const gradientStyle = customColors.length >= 2
    ? `linear-gradient(135deg, ${customColors[0]}, ${customColors[1]})`
    : customColors[0] || "rgba(0,0,0,0.65)";

  if (compact && previewUrl) {
    const locked = posting || !!postSuccessMessage;
    return <div className="locket-send-preview" data-gesture-scroll>
      <header className="locket-send-heading"><span /> <h2>Gửi đến…</h2><a href={previewUrl} download={mediaFile?.name || "locket.jpg"} aria-label="Lưu ảnh hoặc video" className="locket-reference-icon"><Download className="size-5" /></a></header>
      <div className={`locket-send-photo locket-frame-${selectedFrame}`}>
        {mediaType === "video" ? <video src={previewUrl} autoPlay loop playsInline muted className="size-full object-cover" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={previewUrl} alt="Ảnh vừa chụp" className="size-full object-cover" />}
        <div className="locket-send-caption">
          {captionEditing ? <input ref={captionInputRef} autoFocus maxLength={200} aria-label="Chú thích ảnh" value={captionText} placeholder="Thêm một tin nhắn" onChange={event => { setCaptionText(event.target.value); setSelectedPreset(null); }} onBlur={() => setCaptionEditing(false)} onKeyDown={event => { if (event.key === "Enter") setCaptionEditing(false); }} style={{ background: gradientStyle, color: customTextColor }} disabled={locked} /> : <button type="button" disabled={locked} onClick={() => setCaptionEditing(true)} style={{ background: gradientStyle, color: customTextColor }}>{captionText ? <>{customIcon && <span>{customIcon} </span>}{captionText}</> : "Thêm một tin nhắn"}</button>}
        </div>
      </div>
      <div className="locket-send-styles" aria-label="Màu chú thích">{POPULAR_GRADIENTS.map((style, index) => <button key={style.name} type="button" disabled={locked} aria-label={style.name} aria-pressed={customColors[0] === style.colors[0]} onClick={() => { setCustomColors(style.colors); setSelectedPreset(null); }} style={{ background: `linear-gradient(135deg,${style.colors.join(",")})` }}><span className="sr-only">Màu {index + 1}</span></button>)}</div>
      <div className="locket-send-actions">
        <button type="button" disabled={locked} onClick={resetCapture} aria-label="Hủy và chụp lại"><X className="size-8" /></button>
        <button type="button" disabled={locked} onClick={handlePost} aria-label="Gửi khoảnh khắc" className="locket-send-submit">{posting ? <LoaderCircle className="size-8 animate-spin" /> : postSuccessMessage ? <Check className="size-8" /> : <Send className="size-8" />}</button>
        <button type="button" disabled={locked} onClick={() => { setActiveTab("presets"); setDecorationOpen(true); }} aria-label="Aa: trang trí chú thích" className="locket-send-aa"><span>Aa</span><Sparkles className="size-4" /></button>
      </div>
      {(postError || postSuccessMessage || posting) && <p role={postError ? "alert" : "status"} className={`px-4 text-center text-xs ${postError ? "text-red-600" : "locket-muted"}`}>{postError || postSuccessMessage || postProgress}</p>}
      <div className="locket-send-recipients" aria-label="Chọn người nhận">
        <button type="button" disabled={locked} aria-pressed={!isPrivate && !recipients.length} onClick={() => { setRecipients([]); setIsPrivate(false); }}><span className={!isPrivate && !recipients.length ? "selected" : ""}><Users className="size-6" /></span><b>Tất cả</b></button>
        {friends.filter(friend => friend.uid).map(friend => { const selected = recipients.includes(friend.uid); const name = [friend.first_name, friend.last_name].filter(Boolean).join(" ") || friend.username || "Bạn bè"; return <button key={friend.uid} type="button" disabled={locked} aria-pressed={selected} onClick={() => { setIsPrivate(false); setRecipients(previous => selected ? previous.filter(uid => uid !== friend.uid) : [...previous, friend.uid]); }}><span className={selected ? "selected" : ""}><AvatarImage src={friend.profile_picture_url || ""} alt={name} />{selected && <i><Check className="size-3" /></i>}</span><b>{name}</b></button>; })}
        <button type="button" disabled={locked} aria-pressed={isPrivate} onClick={() => { setRecipients([]); setIsPrivate(true); }}><span className={isPrivate ? "selected" : ""}><Heart className="size-6" /></span><b>Chỉ mình tôi</b></button>
      </div>
      <p className="text-center text-[11px] locket-muted">{isPrivate ? "Chỉ bạn nhìn thấy khoảnh khắc này" : recipients.length ? `Gửi cho ${recipients.length} người bạn đã chọn` : "Gửi cho tất cả bạn bè Locket"}</p>
      {friendError && <p role="status" className="px-5 text-center text-xs locket-muted">{friendError}</p>}
      {decorationOpen && <div className="locket-caption-backdrop" onClick={() => setDecorationOpen(false)}>
        <section ref={captionSheetRef} role="dialog" aria-modal="true" aria-label="Chú thích" className="locket-caption-sheet" onClick={event => event.stopPropagation()} data-gesture-scroll>
          <div className="locket-caption-handle" /><header><h3>Chú thích</h3><button type="button" onClick={() => setDecorationOpen(false)} aria-label="Xong, đóng chú thích"><Check className="size-5" /></button></header>
          <div className="locket-caption-tools"><button type="button" aria-pressed={activeTab === "frames"} onClick={() => setActiveTab("frames")}><Heart className="size-5" />Khung ảnh</button><button type="button" aria-pressed={activeTab === "custom"} onClick={() => { setActiveTab("custom"); setSelectedPreset(null); }}><Type className="size-5" />Văn bản</button><button type="button" aria-pressed={activeTab === "custom"} onClick={() => setActiveTab("custom")}><Palette className="size-5" />Màu sắc</button><button type="button" aria-pressed={activeTab === "presets"} onClick={() => setActiveTab("presets")}><Sparkles className="size-5" />Nhãn cảm xúc</button></div>
          {activeTab === "frames" ? <div className="locket-frame-picker">{FRAMES.map(frame => <button key={frame.id} type="button" aria-pressed={selectedFrame === frame.id} disabled={mediaType === "video" && frame.id !== "none"} onClick={() => setSelectedFrame(frame.id)}><span className={`locket-frame-sample locket-frame-${frame.id}`}><span /></span><b>{frame.name}</b><small>{frame.desc}</small></button>)}{mediaType === "video" && <p>Khung ảnh chỉ áp dụng cho ảnh.</p>}</div> : activeTab === "custom" ? <div className="space-y-5 py-4">
            <input autoFocus maxLength={200} aria-label="Nội dung chú thích" className="soft-input" placeholder="Viết một điều dễ thương…" value={captionText} onChange={event => { setCaptionText(event.target.value); setSelectedPreset(null); }} />
            <div className="flex flex-wrap gap-2">{POPULAR_GRADIENTS.map(style => <button key={style.name} type="button" aria-label={style.name} aria-pressed={customColors[0] === style.colors[0]} style={{ background: `linear-gradient(135deg,${style.colors.join(",")})` }} className={`h-10 w-14 rounded-full ${customColors[0] === style.colors[0] ? "ring-2 ring-[#b5687d] ring-offset-2" : ""}`} onClick={() => { setCustomColors(style.colors); setSelectedPreset(null); }} />)}</div>
            <div className="flex flex-wrap gap-1">{POPULAR_EMOJIS.map(emoji => <button key={emoji} type="button" aria-label={`Biểu tượng ${emoji}`} aria-pressed={customIcon === emoji} onClick={() => { setCustomIcon(emoji); setSelectedPreset(null); }} className={`grid size-10 place-items-center rounded-full text-xl ${customIcon === emoji ? "bg-[#f7dce3]" : ""}`}>{emoji}</button>)}<button type="button" onClick={() => { setCustomIcon(null); setSelectedPreset(null); }} className="px-3 text-xs locket-muted">Bỏ biểu tượng</button></div>
            <label className="flex items-center gap-3 text-xs locket-muted">Màu chữ<input aria-label="Màu chữ chú thích" type="color" value={customTextColor} onChange={event => { setCustomTextColor(event.target.value); setSelectedPreset(null); }} /></label>
          </div> : <>
            <div className="relative my-4"><Search className="absolute left-3 top-3 size-4 locket-muted" /><input aria-label="Tìm chú thích" className="soft-input pl-10 text-sm" value={presetSearch} onChange={event => setPresetSearch(event.target.value)} placeholder="Tìm một tâm trạng…" /></div>
            {loadingPresets ? <p role="status" className="py-6 text-center text-xs locket-muted">Đang tải chú thích…</p> : filteredCategories.length ? filteredCategories.map(category => <div key={category.category} className="mb-5"><h4 className="mb-3 text-sm font-semibold locket-muted">{category.category}</h4><div className="flex flex-wrap gap-2">{category.items.map(preset => <button key={preset.id} type="button" onClick={() => { selectPreset(preset); setDecorationOpen(false); }} style={{ background: preset.colors?.length > 1 ? `linear-gradient(135deg,${preset.colors.join(",")})` : preset.colors?.[0] || "#6b5250", color: preset.text_color || "#fff" }} className="rounded-full px-4 py-3 text-sm font-bold">{preset.icon} {preset.text}</button>)}</div></div>) : <p className="py-6 text-center text-xs locket-muted">Chưa có nhãn phù hợp. Bạn có thể chọn Văn bản để tự viết.</p>}
          </>}
        </section>
      </div>}
    </div>;
  }

  return (
    <div className={compact ? `locket-reference-studio ${previewUrl ? "has-preview" : ""}` : "space-y-6"}>
      {/* Viewfinder / Preview Card */}
      <div style={{ touchAction: compact ? "pan-x" : "auto" }} className={compact ? "locket-reference-viewfinder" : "relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2.5rem] bg-[#1e1917] p-2.5 shadow-2xl"}>
        <div
          className={`relative size-full overflow-hidden rounded-[2rem] transition duration-300 ${
            selectedFrame === "polaroid"
              ? "border-[14px] border-b-[48px] border-white bg-stone-900 shadow-md"
              : selectedFrame === "hearts"
              ? "border-8 border-dashed border-pink-300 bg-pink-50/20"
              : selectedFrame === "film"
              ? "border-y-[16px] border-x-4 border-stone-900 ring-2 ring-amber-500/50"
              : selectedFrame === "neon"
              ? "border-4 border-[#00f2fe] shadow-[0_0_20px_#00f2fe]"
              : selectedFrame === "rounded"
              ? "border-4 border-white/20 ring-4 ring-black/40"
              : ""
          }`}
        >
          {previewUrl ? (
            mediaType === "video" ? (
              <video src={previewUrl} className="size-full object-cover" autoPlay loop playsInline muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="size-full object-cover" />
            )
          ) : (
            <div className="relative size-full bg-[#29221f]">
              <video
                ref={videoRef}
                className={`size-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                muted
                playsInline
              />
              {!cameraActive && !compact && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                  <span className="grid size-16 place-items-center rounded-3xl bg-white/10 text-white backdrop-blur-md">
                    <Camera className="size-8" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold">Giữ lại một chút hôm nay</h3>
                  <p className="mt-1 text-xs text-white/60">Mở máy ảnh hoặc chọn một tấm hình từ thư viện</p>
                </div>
              )}
            </div>
          )}

          {/* Floating Pill Overlay (Badge) Live Preview */}
          {(previewUrl || !compact) && (captionText || customIcon) && (
            <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 px-4 w-full flex justify-center">
              <div
                style={{
                  background: gradientStyle,
                  color: customTextColor,
                }}
                className="flex max-w-[90%] items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-lg backdrop-blur-md animate-in fade-in zoom-in duration-200"
              >
                {customIcon && <span className="text-base leading-none">{customIcon}</span>}
                <span className="truncate">{captionText || "Gõ caption..."}</span>
              </div>
            </div>
          )}

          {/* Top Controls Overlay */}
          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
            {previewUrl ? (
              <button
                type="button"
                onClick={resetCapture}
                className="grid size-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
                title="Hủy chụp lại"
              >
                <X className="size-5" />
              </button>
            ) : cameraActive ? (
              <button
                type="button"
                onClick={switchCamera}
                className="grid size-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
                title="Đổi camera trước/sau"
              >
                <FlipHorizontal className="size-5" />
              </button>
            ) : (
              <span />
            )}

            {isRecording && (
              <div className="flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-bold text-white shadow-md animate-pulse">
                <Circle className="size-2.5 fill-white text-white" />
                <span>00:{recordDuration < 10 ? `0${recordDuration}` : recordDuration}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {cameraError && <p className="text-center text-xs text-red-600 font-medium">{cameraError}</p>}
      {postError && <p className="rounded-xl bg-red-50 p-3 text-center text-xs text-red-700">{postError}</p>}
      {postSuccessMessage && (
        <p className="rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
          {postSuccessMessage}
        </p>
      )}

      {/* Shutter & Capture Bar (When no media preview) */}
      {!previewUrl && (
        <div className={compact ? "locket-reference-shutterbar" : "flex items-center justify-center gap-6"}>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className={compact ? "locket-reference-gallery" : "grid size-12 place-items-center rounded-2xl bg-white shadow-soft text-[#685348] hover:bg-stone-50"}
            title="Tải ảnh hoặc video từ máy"
          >
            <FolderOpen className="size-5" />
          </button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleGallerySelect}
          />

          {!cameraActive ? (
            <button
              type="button"
              onClick={() => startCamera()}
              aria-label="Mở máy ảnh để chụp"
              className={compact ? "locket-reference-shutter" : "primary-button min-h-14 rounded-full px-8 text-sm font-bold"}
            >
              {!compact && <Camera className="size-5" />}
              {!compact && "Mở Camera"}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {/* Photo snap button */}
              <button
                type="button"
                onClick={capturePhoto}
                disabled={isRecording}
                className={compact ? "locket-reference-shutter" : "grid size-16 place-items-center rounded-full border-4 border-white bg-amber-400 p-1 shadow-lg transition active:scale-95 hover:bg-amber-300 disabled:opacity-50"}
                title="Chụp ảnh vuông"
              >
                <div className="size-11 rounded-full bg-white shadow-inner" />
              </button>

              {/* Video record button */}
              {!compact && <button
                type="button"
                onClick={isRecording ? stopVideoRecording : startVideoRecording}
                className={`grid size-14 place-items-center rounded-full border-4 border-white shadow-lg transition active:scale-95 ${
                  isRecording ? "bg-red-600 text-white animate-pulse" : "bg-red-500 text-white hover:bg-red-600"
                }`}
                title={isRecording ? "Dừng quay video" : "Bấm để quay video Locket"}
              >
                {isRecording ? <StopCircle className="size-7" /> : <Video className="size-6" />}
              </button>}
            </div>
          )}

          {compact ? <button type="button" onClick={switchCamera} aria-label="Đổi camera trước sau" className="locket-reference-flip"><FlipHorizontal className="size-7" /></button> : cameraActive && (
            <button
              type="button"
              onClick={stopCamera}
              className="grid size-12 place-items-center rounded-2xl bg-white shadow-soft text-[#685348] hover:bg-stone-50"
              title="Tắt Camera"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      )}

      {/* Editor & Customization Controls (Available after capturing or before) */}
      {(!compact || previewUrl) && <div className="soft-card p-4 sm:p-5">
        <p className="mb-4 text-center font-handwritten text-xl text-[#b37b85]">Thêm một chút tâm trạng</p>
        {/* Tab Selection */}
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-[#f4ebe3] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
              activeTab === "presets" ? "bg-white text-stone-900 shadow-sm" : "text-[#857167]"
            }`}
          >
            <Sparkles className="size-3.5 text-amber-500" />
            Nhãn cảm xúc
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
              activeTab === "custom" ? "bg-white text-stone-900 shadow-sm" : "text-[#857167]"
            }`}
          >
            <Palette className="size-3.5 text-pink-500" />
            Tự pha màu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("frames")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
              activeTab === "frames" ? "bg-white text-stone-900 shadow-sm" : "text-[#857167]"
            }`}
          >
            <Heart className="size-3.5 text-rose-500" />
            Khung hình
          </button>
        </div>

        {/* Tab 1: 158+ Preset Pills */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Tìm nhãn (ví dụ: Tương tư, Dỗi, Muốn ôm, Deadline...)"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-400"
              />
            </div>

            {loadingPresets ? (
              <div className="py-8 text-center text-xs text-stone-500">
                <LoaderCircle className="mx-auto size-5 animate-spin" />
                Đang tải các nhãn Locket...
              </div>
            ) : (
              <div className="max-h-60 space-y-4 overflow-y-auto pr-1">
                {filteredCategories.map((cat) => (
                  <div key={cat.category}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      {cat.category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map((preset) => {
                        const isSelected = selectedPreset?.id === preset.id;
                        const bg =
                          preset.colors && preset.colors.length >= 2
                            ? `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`
                            : preset.colors?.[0] || "#333";
                        return (
                          <button
                            type="button"
                            key={preset.id}
                            onClick={() => selectPreset(preset)}
                            style={{ background: bg, color: preset.text_color || "#FFF" }}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition hover:scale-105 active:scale-95 ${
                              isSelected ? "ring-2 ring-stone-900 ring-offset-2" : "opacity-90"
                            }`}
                          >
                            {preset.icon && <span>{preset.icon}</span>}
                            <span>{preset.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Custom Gradient & Icon */}
        {activeTab === "custom" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Chữ Caption</label>
              <input
                type="text"
                placeholder="Gõ caption tùy ý của bạn..."
                value={captionText}
                onChange={(e) => {
                  setCaptionText(e.target.value);
                  setSelectedPreset(null);
                }}
                className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Biểu tượng Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setCustomIcon(emoji)}
                    className={`grid size-9 place-items-center rounded-xl text-base transition ${
                      customIcon === emoji ? "bg-amber-100 ring-2 ring-amber-400" : "bg-white hover:bg-stone-50"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomIcon(null)}
                  className={`px-2.5 text-xs rounded-xl font-medium ${
                    customIcon === null ? "bg-stone-200 font-bold" : "bg-white text-stone-500"
                  }`}
                >
                  Không icon
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Dải màu Gradient</label>
              <div className="grid grid-cols-4 gap-2">
                {POPULAR_GRADIENTS.map((grad) => (
                  <button
                    type="button"
                    key={grad.name}
                    onClick={() => {
                      setCustomColors(grad.colors);
                      setSelectedPreset(null);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${grad.colors[0]}, ${grad.colors[1]})`,
                    }}
                    className="h-8 rounded-xl text-[10px] font-bold text-white shadow-sm transition hover:scale-105 active:scale-95"
                  >
                    {grad.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Frames */}
        {activeTab === "frames" && (
          <div className="grid grid-cols-3 gap-2">
            {FRAMES.map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setSelectedFrame(f.id)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                  selectedFrame === f.id
                    ? "border-amber-500 bg-amber-50/50 shadow-sm"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <span className="text-xs font-bold text-stone-800">{f.name}</span>
                <span className="text-[10px] text-stone-500">{f.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action Button: Post Moment */}
        {previewUrl && (
          <div className="mt-5 border-t border-stone-200/60 pt-4">
            <div className="mb-3 flex items-center justify-between text-xs text-stone-600">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                Chỉ đăng riêng tư (chỉ mình tôi)
              </label>
              <span className="text-[11px] text-stone-400">
                {mediaType === "video" ? "Video Locket" : "Ảnh Locket"}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePost}
              disabled={posting}
              className="primary-button w-full rounded-full py-3.5 text-xs font-bold"
            >
              {posting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  {postProgress || "Đang đăng khoảnh khắc..."}
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Gửi khoảnh khắc
                </>
              )}
            </button>
          </div>
        )}
      </div>}
    </div>
  );
}

