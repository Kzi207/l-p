export function squareCrop(width: number, height: number, zoom: number, x: number, y: number) {
  if (!(width > 0 && height > 0)) throw new Error("Kích thước ảnh không hợp lệ.");
  const size = Math.min(width, height) / Math.max(1, Math.min(4, zoom));
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return { x: (width - size) * clamp(x), y: (height - size) * clamp(y), size };
}
