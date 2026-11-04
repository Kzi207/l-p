"use client";
/* eslint-disable @next/next/no-img-element -- Crop previews use local blob URLs. */
import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, RotateCcw, X, ZoomIn } from "lucide-react";
import { squareCrop } from "@/lib/locket/locket-crop";

export function LocketImageCropper({ file, onApply, onCancel }: { file: File; onApply: (file: File) => void; onCancel: () => void }) {
  const [url, setUrl] = useState("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: .5, y: .5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const image = useRef<HTMLImageElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; width: number } | null>(null);
  useEffect(() => { const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; viewport.current?.focus(); return () => previous?.focus(); }, []);
  const crop = dimensions.width ? squareCrop(dimensions.width, dimensions.height, zoom, position.x, position.y) : null;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  async function save() {
    if (!crop || !image.current || saving) return;
    setSaving(true); setError("");
    try {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = Math.max(1, Math.min(1080, Math.round(crop.size)));
      const context = canvas.getContext("2d"); if (!context) throw new Error("Trình duyệt không hỗ trợ cắt ảnh.");
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image.current, crop.x, crop.y, crop.size, crop.size, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Không thể lưu ảnh đã cắt.")), "image/jpeg", .95));
      onApply(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.jpg`, { type: "image/jpeg" }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể cắt ảnh."); setSaving(false); }
  }
  return <div className="locket-crop-editor" data-mouse-drag-scroll="off" data-gesture-scroll>
    <header><button type="button" disabled={saving} onClick={onCancel} aria-label="Hủy cắt ảnh"><X className="size-5" /></button><h2>Căn chỉnh ảnh</h2><button type="button" disabled={saving} onClick={() => { setZoom(1); setPosition({ x: .5, y: .5 }); }} aria-label="Đặt lại vùng cắt"><RotateCcw className="size-4" /></button></header>
    <p className="locket-muted text-center text-xs">Kéo ảnh để căn vị trí · Phóng to để chọn vùng yêu thích</p>
    <div ref={viewport} className="locket-crop-viewport" tabIndex={0} role="group" aria-label="Vùng cắt ảnh vuông, dùng phím mũi tên để căn chỉnh" onKeyDown={event => {
      if (!event.key.startsWith("Arrow") || saving) return; event.preventDefault();
      setPosition(previous => ({ x: clamp(previous.x + (event.key === "ArrowRight" ? .03 : event.key === "ArrowLeft" ? -.03 : 0)), y: clamp(previous.y + (event.key === "ArrowDown" ? .03 : event.key === "ArrowUp" ? -.03 : 0)) }));
    }} onPointerDown={event => { if (saving || !crop || (event.pointerType === "mouse" && event.button !== 0)) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y, width: event.currentTarget.clientWidth }; }} onPointerMove={event => {
      const start = drag.current; if (!start || start.id !== event.pointerId || !crop) return;
      setPosition({ x: dimensions.width <= crop.size ? .5 : clamp(start.startX - (event.clientX - start.x) / (start.width * (dimensions.width / crop.size - 1))), y: dimensions.height <= crop.size ? .5 : clamp(start.startY - (event.clientY - start.y) / (start.width * (dimensions.height / crop.size - 1))) });
    }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {url && <img ref={image} src={url} alt="Ảnh đang cắt" draggable={false} onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setError("Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP.")} style={crop ? { width: `${dimensions.width / crop.size * 100}%`, height: `${dimensions.height / crop.size * 100}%`, left: `${-crop.x / crop.size * 100}%`, top: `${-crop.y / crop.size * 100}%` } : { opacity: 0 }} />}
      {!crop && !error && <LoaderCircle className="absolute left-1/2 top-1/2 size-6 animate-spin text-[#c87890]" />}
      <div className="locket-crop-grid" aria-hidden="true"><i /><i /><i /><i /></div>
    </div>
    <label className="locket-crop-zoom"><ZoomIn className="size-4" /><span className="sr-only">Phóng to ảnh</span><input type="range" min="1" max="4" step="0.01" value={zoom} disabled={!crop || saving} onChange={event => { drag.current = null; setZoom(Number(event.target.value)); }} /><span>{zoom.toFixed(1)}×</span></label>
    {error && <p role="alert" className="text-center text-xs text-red-600">{error}</p>}
    <button type="button" onClick={save} disabled={!crop || saving || !!error} className="primary-button mx-auto flex w-full max-w-xs text-sm">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{saving ? "Đang cắt ảnh…" : "Dùng ảnh này"}</button>
  </div>;
}
