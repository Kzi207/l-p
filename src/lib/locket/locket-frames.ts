export const LOCKET_FRAMES = [
  { id: "none", name: "Nguyên bản", desc: "Không khung viền" },
  { id: "polaroid", name: "Polaroid", desc: "Một tấm ảnh kỷ niệm" },
  { id: "hearts", name: "Trái tim", desc: "Gửi một chút yêu thương" },
  { id: "film", name: "Film 35mm", desc: "Thước phim hoài niệm" },
  { id: "neon", name: "Ánh hồng", desc: "Viền hồng nổi bật" },
  { id: "rounded", name: "Mây hồng", desc: "Khung pastel mềm mại" },
] as const;

export async function applyLocketFrame(file: File, frame: string): Promise<File> {
  if (frame === "none") return file;
  if (!file.type.startsWith("image/")) throw new Error("Khung ảnh chỉ áp dụng cho ảnh. Hãy bỏ khung khi gửi video.");
  if (!LOCKET_FRAMES.some(item => item.id === frame)) throw new Error("Khung ảnh không hợp lệ.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("Không thể đọc ảnh để tạo khung.")); img.src = url;
    });
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ tạo khung ảnh.");
    const edge = frame === "polaroid" ? 43 : frame === "film" ? 54 : frame === "neon" ? 32 : 54;
    const top = frame === "film" ? 97 : edge;
    const bottom = frame === "polaroid" ? 130 : top;
    ctx.fillStyle = frame === "film" ? "#29221f" : frame === "polaroid" ? "#fffaf2" : frame === "neon" ? "#d881a0" : "#f7dce6";
    ctx.fillRect(0, 0, 1080, 1080);
    const width = 1080 - edge * 2; const height = 1080 - top - bottom;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    ctx.save(); ctx.beginPath(); ctx.roundRect(edge, top, width, height, frame === "rounded" ? 100 : 8); ctx.clip();
    ctx.drawImage(image, edge + (width - image.naturalWidth * scale) / 2, top + (height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale); ctx.restore();
    if (frame === "hearts") {
      ctx.fillStyle = "#ce7a94"; ctx.font = "38px sans-serif"; ctx.textAlign = "center";
      for (let position = 90; position < 1080; position += 150) { ctx.fillText("♥", position, 42); ctx.fillText("♥", position, 1065); }
    }
    if (frame === "film") {
      ctx.fillStyle = "#f8e4b9";
      for (let position = 25; position < 1080; position += 85) { ctx.fillRect(position, 24, 40, 38); ctx.fillRect(position, 1018, 40, 38); }
    }
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Không thể lưu ảnh có khung.")), "image/jpeg", .95));
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-${frame}.jpg`, { type: "image/jpeg" });
  } finally { URL.revokeObjectURL(url); }
}
