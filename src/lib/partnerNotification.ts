import type { DocumentData } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { sendPushToUser } from "@/lib/sendPushNotification";
import { ApiAuthError, verifyAuthToken } from "@/lib/verifyAuthToken";

interface PartnerNotificationOptions {
  request: Request;
  collectionName: "photos" | "locketPosts" | "mediaMemories" | "locketMessages";
  itemId: unknown;
  senderUid: unknown;
  senderField: "uploaderId" | "senderId";
  type: "photo" | "locket" | "memory" | "message";
  route: "/" | "/locket" | "/map" | "/chat";
  content: (data: DocumentData) => { title: string; body: string };
}

function deepLink(route: string, type: PartnerNotificationOptions["type"], itemId: string) {
  const parameter = type === "message" ? "message" : type === "locket" ? "post" : type === "memory" ? "memory" : "photo";
  const separator = route.includes("?") ? "&" : "?";
  return `${route}${separator}${parameter}=${encodeURIComponent(itemId)}`;
}

/** Kiểm tra user, couple và document trước khi gửi để không thể giả mạo thông báo. */
export async function notifyPartnerFromDocument(options: PartnerNotificationOptions) {
  try {
    const token = await verifyAuthToken(options.request);
    if (typeof options.senderUid !== "string" || options.senderUid !== token.uid) {
      return NextResponse.json({ error: "UID người gửi không khớp tài khoản đăng nhập." }, { status: 403 });
    }
    if (typeof options.itemId !== "string" || !options.itemId) {
      return NextResponse.json({ error: "Thiếu ID nội dung vừa tạo." }, { status: 400 });
    }

    const database = getAdminFirestore();
    const user = await database.doc(`users/${token.uid}`).get();
    const coupleId = user.get("coupleId");
    if (typeof coupleId !== "string" || !coupleId) {
      return NextResponse.json({ error: "Tài khoản chưa ghép đôi." }, { status: 409 });
    }

    const [couple, item] = await Promise.all([
      database.doc(`couples/${coupleId}`).get(),
      database.doc(`couples/${coupleId}/${options.collectionName}/${options.itemId}`).get(),
    ]);
    const memberIds = couple.get("memberIds");
    if (!couple.exists || !Array.isArray(memberIds) || !memberIds.includes(token.uid)) {
      return NextResponse.json({ error: "Bạn không thuộc không gian cặp đôi này." }, { status: 403 });
    }
    if (!item.exists || item.get(options.senderField) !== token.uid) {
      return NextResponse.json({ error: "Không tìm thấy nội dung hợp lệ của người gửi." }, { status: 403 });
    }

    const recipientUid = memberIds.find((uid): uid is string => typeof uid === "string" && uid !== token.uid);
    if (!recipientUid) return NextResponse.json({ successCount: 0, failureCount: 0, tokenCount: 0 });

    const deliveryRef = database.doc(`couples/${coupleId}/notificationDeliveries/${options.type}_${options.itemId}`);
    const reserved = await database.runTransaction(async (transaction) => {
      const previous = await transaction.get(deliveryRef);
      if (previous.exists) return false;
      transaction.create(deliveryRef, {
        type: options.type,
        itemId: options.itemId,
        senderUid: token.uid,
        recipientUid,
        status: "sending",
        createdAt: new Date(),
      });
      return true;
    });
    if (!reserved) return NextResponse.json({ duplicate: true, successCount: 0, failureCount: 0, tokenCount: 0 });

    try {
      const content = options.content(item.data() || {});
      const result = await sendPushToUser(recipientUid, content.title, content.body, deepLink(options.route, options.type, options.itemId), {
        type: options.type,
        itemId: options.itemId,
      });
      await deliveryRef.update({ status: "sent", sentAt: new Date(), ...result });
      return NextResponse.json(result);
    } catch (caught) {
      // Gửi thất bại thì bỏ reservation để lần retry kế tiếp được phép thử lại.
      await deliveryRef.delete().catch(() => undefined);
      throw caught;
    }
  } catch (caught) {
    if (caught instanceof ApiAuthError) return NextResponse.json({ error: caught.message }, { status: caught.status });
    console.error("Không thể gửi thông báo cho người ghép đôi:", caught);
    return NextResponse.json({ error: "Máy chủ chưa thể gửi thông báo." }, { status: 500 });
  }
}
