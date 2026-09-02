import { notifyPartnerFromDocument } from "@/lib/partnerNotification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return notifyPartnerFromDocument({
    request,
    collectionName: "mediaMemories",
    itemId: body.memoryId,
    senderUid: body.senderUid,
    senderField: "uploaderId",
    type: "memory",
    route: "/map",
    content: (memory) => ({
      title: `${String(memory.uploaderName || "Người thương")} vừa lưu một kỷ niệm ✨`,
      body: String(memory.caption || (memory.mediaType === "video" ? "Có một video mới trong album." : "Có một ảnh mới trong album.")),
    }),
  });
}
