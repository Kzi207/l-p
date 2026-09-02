import { notifyPartnerFromDocument } from "@/lib/partnerNotification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return notifyPartnerFromDocument({
    request,
    collectionName: "locketPosts",
    itemId: body.locketId,
    senderUid: body.senderUid,
    senderField: "uploaderId",
    type: "locket",
    route: "/locket",
    content: (locket) => ({
      title: `${String(locket.uploaderName || "Người thương")} vừa gửi Locket 📸`,
      body: String(locket.caption || "Có một khoảnh khắc mới dành cho bạn."),
    }),
  });
}
