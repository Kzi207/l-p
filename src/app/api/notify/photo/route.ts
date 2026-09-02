import { notifyPartnerFromDocument } from "@/lib/partnerNotification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return notifyPartnerFromDocument({
    request,
    collectionName: "photos",
    itemId: body.photoId,
    senderUid: body.senderUid,
    senderField: "uploaderId",
    type: "photo",
    route: "/",
    content: (photo) => ({
      title: `${String(photo.uploaderName || "Người thương")} vừa đổi ảnh chung 💗`,
      body: String(photo.caption || "Mở Love Days để xem ngay nhé."),
    }),
  });
}
