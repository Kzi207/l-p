import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verifyAuthToken";
import { getLocketClientForUser } from "@/lib/locket/locket-service";
import { adminGet, adminWrite } from "@/lib/neon-admin-db";
import type { UserDocument } from "@/types/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request);
    const client = await getLocketClientForUser(user.uid);

    const contentType = request.headers.get("content-type") || "";
    let caption = "";
    let noteType = "standard";
    let icon: string | null = null;
    let colors: string[] | null = null;
    let textColor: string | null = null;
    let isPrivate = false;
    let recipients: string[] | null = null;
    let imageBuffer: Buffer | null = null;
    let videoBuffer: Buffer | null = null;
    let syncCouple = true;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      caption = (formData.get("caption") as string) || "";
      noteType = (formData.get("noteType") as string) || "standard";
      icon = (formData.get("icon") as string) || null;
      textColor = (formData.get("textColor") as string) || null;
      isPrivate = formData.get("isPrivate") === "true";
      syncCouple = formData.get("syncCouple") !== "false";

      const rawColors = formData.get("colors") as string;
      if (rawColors) {
        try { colors = JSON.parse(rawColors); } catch { colors = null; }
      }
      const rawRecipients = formData.get("recipients") as string;
      if (rawRecipients) {
        try { recipients = JSON.parse(rawRecipients); } catch { recipients = null; }
      }

      const file = formData.get("file") as File | null;
      const mediaType = (formData.get("mediaType") as string) || (file?.type?.startsWith("video/") ? "video" : "image");

      if (file) {
        const arrayBuf = await file.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (mediaType === "video" || file.type.startsWith("video/")) {
          videoBuffer = buf;
        } else {
          imageBuffer = buf;
        }
      }
    } else {
      const body = await request.json();
      caption = body.caption || "";
      noteType = body.noteType || "standard";
      icon = body.icon || null;
      colors = Array.isArray(body.colors) ? body.colors : null;
      textColor = body.textColor || null;
      isPrivate = Boolean(body.isPrivate);
      recipients = Array.isArray(body.recipients) ? body.recipients : null;
      syncCouple = body.syncCouple !== false;

      if (body.imageBase64) {
        const cleanBase64 = body.imageBase64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, "");
        imageBuffer = Buffer.from(cleanBase64, "base64");
      }
      if (body.videoBase64) {
        const cleanBase64 = body.videoBase64.replace(/^data:video\/[a-zA-Z0-9.+_-]+;base64,/, "");
        videoBuffer = Buffer.from(cleanBase64, "base64");
      }
    }

    if (!imageBuffer && !videoBuffer) {
      return NextResponse.json({ ok: false, error: "Vui lòng chọn ảnh hoặc video để đăng." }, { status: 400 });
    }

    // Đăng bài qua locket.js MomentsModule
    const postResult = await client.moments.post({
      image: imageBuffer,
      video: videoBuffer,
      caption,
      noteType,
      icon,
      colors,
      textColor,
      isPrivate,
      recipients,
      autoCompress: true
    });

    // Nếu người dùng có couple trong Love Days, lưu thêm một bản sao vào feed Locket của couple
    if (syncCouple && !isPrivate && !recipients?.length) {
      try {
        const userRec = await adminGet<UserDocument>(`users/${user.uid}`);
        const coupleId = userRec?.data?.coupleId;
        if (coupleId) {
          const postId = `locket_${Date.now()}`;
          const thumbUrl = postResult?.thumbnail_url || (typeof postResult === "string" ? postResult : "");
          await adminWrite({
            type: "set",
            path: `couples/${coupleId}/locketPosts/${postId}`,
            data: {
              imageUrl: thumbUrl || "",
              videoUrl: postResult?.video_url || null,
              caption: caption || "",
              cloudinaryPublicId: "",
              reactions: {},
              createdAt: { __op: "serverTimestamp" },
              uploaderId: user.uid,
              uploaderName: userRec?.data?.displayName || "Bạn",
              uploaderPhotoUrl: userRec?.data?.photoURL || "",
              overlay: {
                noteType,
                icon,
                colors,
                textColor
              }
            }
          });
        }
      } catch (syncErr) {
        console.warn("Could not sync moment to couple feed:", syncErr);
      }
    }

    return NextResponse.json({
      ok: true,
      result: postResult,
      message: "Đăng khoảnh khắc lên Locket thành công!"
    });
  } catch (error) {
    console.error("Locket post route error:", error);
    const message = error instanceof Error ? error.message : "Đăng khoảnh khắc thất bại.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

