import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentSnapshot } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

const appUrl = defineString("APP_URL", {
  description: "URL HTTPS của web Love Days đã deploy trên Vercel",
});

interface PushContent {
  title: string;
  body: string;
  path: string;
  type: "photo" | "message" | "locket" | "memory";
  itemId: string;
}

async function sendToPartner(coupleId: string, senderId: string, content: PushContent) {
  const database = getFirestore();
  const couple = await database.doc(`couples/${coupleId}`).get();
  const memberIds = (couple.get("memberIds") as string[] | undefined) || [];
  const recipientIds = memberIds.filter((uid) => uid !== senderId);
  const users = await Promise.all(recipientIds.map((uid) => database.doc(`users/${uid}`).get()));
  const recipientTokens = users.flatMap((user) => {
    const tokens = user.get("fcmTokens");
    return Array.isArray(tokens) ? tokens.filter((token): token is string => typeof token === "string") : [];
  });
  const uniqueTokens = [...new Set(recipientTokens)].slice(0, 500);

  if (uniqueTokens.length === 0) {
    logger.info("Người còn lại chưa bật thông báo Web Push.");
    return;
  }

  const destination = new URL(content.path, appUrl.value()).toString();
  const response = await getMessaging().sendEachForMulticast({
    tokens: uniqueTokens,
    data: {
      title: content.title,
      body: content.body,
      url: destination,
      type: content.type,
      itemId: content.itemId,
    },
    webpush: {
      headers: { Urgency: content.type === "message" ? "high" : "normal" },
      fcmOptions: { link: destination },
    },
  });

  await removeInvalidTokens(users, uniqueTokens, response.responses);
  logger.info(`Đã gửi ${response.successCount}/${uniqueTokens.length} thông báo ${content.type}.`);
}

async function removeInvalidTokens(users: DocumentSnapshot[], tokens: string[], responses: Awaited<ReturnType<ReturnType<typeof getMessaging>["sendEachForMulticast"]>>["responses"]) {
  const invalidTokens = responses
    .map((result, index) => ({ result, token: tokens[index] }))
    .filter(({ result }) => !result.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(result.error?.code || ""))
    .map(({ token }) => token);
  if (invalidTokens.length === 0) return;

  const batch = getFirestore().batch();
  users.forEach((user) => {
    const owned = invalidTokens.filter((token) => (user.get("fcmTokens") as unknown[] | undefined)?.includes(token));
    if (owned.length > 0) batch.update(user.ref, { fcmTokens: FieldValue.arrayRemove(...owned) });
  });
  await batch.commit();
}

export const notifyPartnerAboutPhoto = onDocumentCreated(
  { document: "couples/{coupleId}/photos/{photoId}", region: "asia-southeast1" },
  async (event) => {
    const photo = event.data?.data();
    if (!photo?.uploaderId) return;
    await sendToPartner(event.params.coupleId, photo.uploaderId, {
      title: `${photo.uploaderName || "Người thương"} vừa đổi ảnh chung 💗`,
      body: photo.caption?.trim() || "Mở Love Days để xem ngay nhé.",
      path: "/",
      type: "photo",
      itemId: event.params.photoId,
    });
  },
);

export const notifyPartnerAboutMessage = onDocumentCreated(
  { document: "couples/{coupleId}/locketMessages/{messageId}", region: "asia-southeast1" },
  async (event) => {
    const message = event.data?.data();
    if (!message?.senderId) return;
    await sendToPartner(event.params.coupleId, message.senderId, {
      title: `Tin nhắn từ ${message.senderName || "người thương"} 💌`,
      body: String(message.text || "Bạn có tin nhắn mới.").slice(0, 160),
      path: "/chat",
      type: "message",
      itemId: event.params.messageId,
    });
  },
);

export const notifyPartnerAboutLocket = onDocumentCreated(
  { document: "couples/{coupleId}/locketPosts/{postId}", region: "asia-southeast1" },
  async (event) => {
    const post = event.data?.data();
    if (!post?.uploaderId) return;
    await sendToPartner(event.params.coupleId, post.uploaderId, {
      title: `${post.uploaderName || "Người thương"} vừa gửi Locket 📸`,
      body: post.caption?.trim() || "Có một khoảnh khắc mới dành cho bạn.",
      path: "/locket",
      type: "locket",
      itemId: event.params.postId,
    });
  },
);

export const notifyPartnerAboutMemory = onDocumentCreated(
  { document: "couples/{coupleId}/mediaMemories/{mediaId}", region: "asia-southeast1" },
  async (event) => {
    const memory = event.data?.data();
    if (!memory?.uploaderId) return;
    await sendToPartner(event.params.coupleId, memory.uploaderId, {
      title: `${memory.uploaderName || "Người thương"} vừa lưu một kỷ niệm ✨`,
      body: memory.caption?.trim() || (memory.mediaType === "video" ? "Có một video mới trong album." : "Có một ảnh mới trong album."),
      path: "/map",
      type: "memory",
      itemId: event.params.mediaId,
    });
  },
);
