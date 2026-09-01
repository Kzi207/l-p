export async function cropImageToSquare(file: File, maximumSize = 1600): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - sourceSize) / 2;
  const sourceY = (bitmap.height - sourceSize) / 2;
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
