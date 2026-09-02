export interface SquareCrop {
  zoom: number;
  x: number;
  y: number;
}

const DEFAULT_CROP: SquareCrop = { zoom: 1, x: 0.5, y: 0.5 };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export async function cropImageToSquare(file: File, maximumSize = 1600, crop: SquareCrop = DEFAULT_CROP): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const zoom = clamp(crop.zoom, 1, 3);
  const sourceSize = Math.min(bitmap.width, bitmap.height) / zoom;
  const sourceX = (bitmap.width - sourceSize) * clamp(crop.x, 0, 1);
  const sourceY = (bitmap.height - sourceSize) * clamp(crop.y, 0, 1);
  const outputSize = Math.min(sourceSize, maximumSize);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Trình duyệt không thể xử lý ảnh này.");
  }

  context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Không thể tạo ảnh vuông.")), "image/jpeg", 0.92);
  });
  const baseName = file.name.replace(/\.[^.]+$/, "") || "locket";
  return new File([blob], `${baseName}-square.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
