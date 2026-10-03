import { NextResponse } from "next/server";
import { notifyPartnerFromDocument } from "@/lib/partnerNotification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const common = { request, itemId: body.itemId, senderUid: body.senderUid };
  if (body.kind === "calendar") return notifyPartnerFromDocument({ ...common, collectionName: "coupleEvents", senderField: "creatorId", type: "calendar", route: "/calendar", content: (item) => ({ title: "Lịch đôi có sự kiện mới 📅", body: String(item.title || "Mở Love Days để xem nhé.") }) });
  return NextResponse.json({ error: "Loại thông báo không hợp lệ." }, { status: 400 });
}
