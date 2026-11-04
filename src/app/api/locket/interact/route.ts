import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verifyAuthToken";
import { getLocketClientForUser } from "@/lib/locket/locket-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request);
    const client = await getLocketClientForUser(user.uid);
    const body = await request.json();
    const { action, momentUid } = body;

    if (!momentUid) {
      return NextResponse.json({ ok: false, error: "Thiếu momentUid." }, { status: 400 });
    }

    if (action === "react") {
      const emoji = body.emoji || "❤️";
      const res = await client.moments.react(momentUid, emoji);
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "comment") {
      const { text, receiverUid } = body;
      if (!text || !receiverUid) {
        return NextResponse.json({ ok: false, error: "Thiếu nội dung bình luận hoặc receiverUid." }, { status: 400 });
      }
      const res = await client.moments.comment(momentUid, receiverUid, text);
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "delete") {
      const res = await client.moments.delete(momentUid);
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "views") {
      const res = await client.moments.getViews(momentUid);
      return NextResponse.json({ ok: true, views: res });
    }

    return NextResponse.json({ ok: false, error: "Action không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("Locket interact route error:", error);
    const message = error instanceof Error ? error.message : "Thao tác trên khoảnh khắc thất bại.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

