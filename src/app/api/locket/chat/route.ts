import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verifyAuthToken";
import { getLocketClientForUser } from "@/lib/locket/locket-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request);
    const client = await getLocketClientForUser(user.uid);
    const body = await request.json();
    const action = body.action || "conversations";

    // 1. Danh sách cuộc hội thoại
    if (action === "conversations") {
      const [convs, friends] = await Promise.all([
        client.chat.getConversations().catch(() => []),
        client.friends.getAllFriends().catch(() => []),
      ]);

      const friendMap = new Map<string, any>();
      for (const f of friends) {
        if (f.uid) friendMap.set(f.uid, f);
      }

      const enhancedConvs = (convs || []).map((c: any) => {
        const peer = c.peer_uid ? friendMap.get(c.peer_uid) : null;
        return {
          ...c,
          peer: peer ? {
            uid: peer.uid,
            name: [peer.first_name, peer.last_name].filter(Boolean).join(" ").trim() || peer.name || peer.username || "Bạn bè Locket",
            username: peer.username || "",
            avatar: peer.profile_picture_url || "",
          } : null
        };
      });

      return NextResponse.json({ ok: true, conversations: enhancedConvs, friends });
    }

    // 2. Lấy tin nhắn chi tiết
    if (action === "messages") {
      const { otherUserId = null, conversationId = null } = body;
      const messages = await client.chat.getMessages({ otherUserId, conversationId, fetchServer: true });
      return NextResponse.json({ ok: true, messages: Array.isArray(messages) ? messages : [] });
    }

    // 3. Gửi tin nhắn hoặc gửi khoảnh khắc vào chat
    if (action === "send") {
      const { receiverUid, text = null, momentUid = null } = body;
      if (!receiverUid) {
        return NextResponse.json({ ok: false, error: "Thiếu receiverUid." }, { status: 400 });
      }
      const res = await client.chat.sendMessage({ receiverUid, text, momentUid });
      return NextResponse.json({ ok: true, result: res });
    }

    // 4. Thả cảm xúc vào tin nhắn
    if (action === "react") {
      const { conversationId, messageId, emoji } = body;
      if (!conversationId || !messageId || !emoji) {
        return NextResponse.json({ ok: false, error: "Thiếu tham số thả cảm xúc." }, { status: 400 });
      }
      const res = await client.chat.sendReaction(conversationId, messageId, emoji);
      return NextResponse.json({ ok: true, result: res });
    }

    // 5. Gỡ cảm xúc
    if (action === "unreact") {
      const { conversationId, messageId } = body;
      if (!conversationId || !messageId) {
        return NextResponse.json({ ok: false, error: "Thiếu tham số." }, { status: 400 });
      }
      const res = await client.chat.removeReaction(conversationId, messageId);
      return NextResponse.json({ ok: true, result: res });
    }

    // 6. Xóa / thu hồi tin nhắn
    if (action === "delete") {
      const { conversationId, messageId } = body;
      if (!conversationId || !messageId) {
        return NextResponse.json({ ok: false, error: "Thiếu tham số." }, { status: 400 });
      }
      const res = await client.chat.deleteMessage(conversationId, messageId);
      return NextResponse.json({ ok: true, result: res });
    }

    // 7. Đánh dấu đã đọc
    if (action === "read") {
      const { otherUserId = null, conversationId = null, sendReadReceipt = true } = body;
      const res = await client.chat.markAsRead({
        otherUserId,
        conversationUid: conversationId,
        sendReadReceipt,
      });
      return NextResponse.json({ ok: true, result: res });
    }

    return NextResponse.json({ ok: false, error: "Action không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("Locket chat route error:", error);
    const message = error instanceof Error ? error.message : "Thao tác chat Locket thất bại.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

