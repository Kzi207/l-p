export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type?: "image" | "video" | "raw";
}

export async function uploadToCloudinary(file: File, folder = "love-days/locket"): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary chưa được cấu hình.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    const cloudinaryMessage = payload?.error?.message || "";
    if (cloudinaryMessage.toLowerCase().includes("unsigned")) {
      throw new Error("Upload preset Cloudinary chưa bật Unsigned. Hãy đổi Signing mode thành Unsigned trong Cloudinary Console.");
    }
    if (cloudinaryMessage.toLowerCase().includes("preset")) {
      throw new Error(`Cloudinary preset không hợp lệ: ${cloudinaryMessage}`);
    }
    throw new Error(cloudinaryMessage ? `Cloudinary: ${cloudinaryMessage}` : "Không thể tải ảnh lên. Hãy thử lại nhé.");
  }

  return (await response.json()) as CloudinaryUploadResult;
}

export async function uploadMediaToCloudinary(file: File, folder = "love-days/media-memories"): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) throw new Error("Cloudinary chưa được cấu hình.");

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ? `Cloudinary: ${payload.error.message}` : "Không thể tải ảnh/video lên.");
  }
  return await response.json() as CloudinaryUploadResult;
}
