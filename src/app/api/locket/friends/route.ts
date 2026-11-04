import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verifyAuthToken";
import { getLocketClientForUser } from "@/lib/locket/locket-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request);
    const client = await getLocketClientForUser(user.uid);
    const body = await request.json().catch(() => ({}));
    const action = body.action || "list";

    if (action === "list") {
      const friends = await client.friends.getAllFriends();
      return NextResponse.json({ ok: true, friends: Array.isArray(friends) ? friends : [] });
    }

    if (action === "send_request") {
      const { username, userUid } = body;
      let res;
      if (username) {
        res = await client.friends.sendRequestByUsername(username);
      } else if (userUid) {
        res = await client.friends.sendRequest(userUid);
      } else {
        return NextResponse.json({ ok: false, error: "Thiếu username hoặc userUid." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "remove") {
      const { userUid } = body;
      if (!userUid) return NextResponse.json({ ok: false, error: "Thiếu userUid." }, { status: 400 });
      const res = await client.friends.remove(userUid);
      return NextResponse.json({ ok: true, result: res });
    }

    return NextResponse.json({ ok: false, error: "Action không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("Locket friends route error:", error);
    const message = error instanceof Error ? error.message : "Thao tác bạn bè Locket thất bại.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

