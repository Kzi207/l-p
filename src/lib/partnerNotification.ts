import { NextResponse } from "next/server";
import { adminGet, adminWrite, adminServerTimestamp } from "@/lib/appsScriptAdminDb";
import { sendPushToUser } from "@/lib/sendPushNotification";
import { ApiAuthError, verifyAuthToken } from "@/lib/verifyAuthToken";

interface PartnerNotificationOptions {
  request: Request;
  collectionName: "photos" | "locketPosts" | "mediaMemories" | "locketMessages" | "coupleEvents" | "timeCapsules";
  itemId: unknown;
  senderUid: unknown;
  senderField: "uploaderId" | "senderId" | "authorId" | "creatorId";
  type: "photo" | "locket" | "memory" | "message" | "calendar" | "timecapsule";
  route: "/" | "/locket" | "/map" | "/chat" | "/calendar" | "/timecapsule";
  content: (data: Record<string, unknown>) => { title: string; body: string };
}

function deepLink(route: string, type: PartnerNotificationOptions["type"], itemId: string) {
  const parameter = type === "message" ? "message" : type === "locket" ? "post" : type === "memory" ? "memory" : type === "calendar" ? "event" : type === "timecapsule" ? "capsule" : "photo";
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

    const user = await adminGet<{ coupleId?: unknown }>(`users/${token.uid}`);
    const coupleId = user.data?.coupleId;
    if (typeof coupleId !== "string" || !coupleId) {
      return NextResponse.json({ error: "Tài khoản chưa ghép đôi." }, { status: 409 });
    }

    const [couple, item] = await Promise.all([
      adminGet<{ memberIds?: unknown[] }>(`couples/${coupleId}`),
      adminGet<Record<string, unknown>>(`couples/${coupleId}/${options.collectionName}/${options.itemId}`),
    ]);
    const memberIds = couple.data?.memberIds;
    if (!couple.data || !Array.isArray(memberIds) || !memberIds.includes(token.uid)) {
      return NextResponse.json({ error: "Bạn không thuộc không gian cặp đôi này." }, { status: 403 });
    }
    if (!item.data || item.data[options.senderField] !== token.uid) {
      return NextResponse.json({ error: "Không tìm thấy nội dung hợp lệ của người gửi." }, { status: 403 });
    }

    const recipientUid = memberIds.find((uid): uid is string => typeof uid === "string" && uid !== token.uid);
    if (!recipientUid) return NextResponse.json({ successCount: 0, failureCount: 0, tokenCount: 0 });

    const deliveryPath = `couples/${coupleId}/notificationDeliveries/${options.type}_${options.itemId}`;
    try {
      await adminWrite({
        type: "create",
        path: deliveryPath,
        data: {
        type: options.type,
        itemId: options.itemId,
        senderUid: token.uid,
        recipientUid,
        status: "sending",
          createdAt: adminServerTimestamp(),
        },
      });
    } catch (caught) {
      if (caught instanceof Error && caught.message.includes("RECORD_ALREADY_EXISTS")) {
        return NextResponse.json({ duplicate: true, successCount: 0, failureCount: 0, tokenCount: 0 });
      }
      throw caught;
    }

    try {
      const content = options.content(item.data || {});
      const result = await sendPushToUser(recipientUid, content.title, content.body, deepLink(options.route, options.type, options.itemId), {
        type: options.type,
        itemId: options.itemId,
      });
      await adminWrite({ type: "update", path: deliveryPath, data: { status: "sent", sentAt: adminServerTimestamp(), ...result } });
      return NextResponse.json(result);
    } catch (caught) {
      // Gửi thất bại thì bỏ reservation để lần retry kế tiếp được phép thử lại.
      await adminWrite({ type: "delete", path: deliveryPath }).catch(() => undefined);
      throw caught;
    }
  } catch (caught) {
    if (caught instanceof ApiAuthError) return NextResponse.json({ error: caught.message }, { status: caught.status });
    console.error("Không thể gửi thông báo cho người ghép đôi:", caught);
    return NextResponse.json({ error: "Máy chủ chưa thể gửi thông báo." }, { status: 500 });
  }
}
