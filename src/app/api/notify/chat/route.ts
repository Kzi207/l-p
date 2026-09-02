import { notifyPartnerFromDocument } from "@/lib/partnerNotification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return notifyPartnerFromDocument({
    request,
    collectionName: "locketMessages",
    itemId: body.messageId,
    senderUid: body.senderUid,
    senderField: "senderId",
    type: "message",
    route: "/chat",
    content: (message) => ({
      title: `Tin nhắn từ ${String(message.senderName || "người thương")} 💌`,
      body: String(message.text || "Bạn có tin nhắn mới.").slice(0, 50),
    }),
  });
}
