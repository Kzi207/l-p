import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/verifyAuthToken";
import { getLocketClientForUser } from "@/lib/locket/locket-service";
import { getLocketHistory } from "@/lib/locket/locket-history";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyAuthToken(request);
    const client = await getLocketClientForUser(user.uid);
    const body = await request.json().catch(() => ({}));
    const { type = "all", username = null, pageToken = null } = body;
    const limit = Math.max(1, Math.min(100, Math.floor(Number(body.limit) || 30)));
    if (pageToken !== null && (typeof pageToken !== "string" || pageToken.length > 4096)) {
      return NextResponse.json({ ok: false, error: "Trang bản tin không hợp lệ." }, { status: 400 });
    }

    let moments = [];
    let nextPageToken: string | null = null;

    if (username) {
      moments = await client.moments.getSharedMomentsByUsername(username, limit);
    } else {
      const page = await getLocketHistory(client, { limit, pageToken, ...(type === "my" ? { userId: client.session.uid } : {}) });
      moments = page.moments;
      nextPageToken = page.nextPageToken;
    }

    return NextResponse.json({
      ok: true,
      moments: Array.isArray(moments) ? moments.map((moment: Record<string, unknown>) => ({
        ...moment,
        moment_uid: moment.moment_uid || moment.canonical_uid || moment.id,
        user_uid: moment.user_uid || moment.uploader_uid || (typeof moment.user === "string" ? moment.user : (moment.user as { uid?: string } | null)?.uid),
      })) : [],
      nextPageToken,
    });
  } catch (error) {
    console.error("Locket feed route error:", error);
    const message = error instanceof Error ? error.message : "Không thể tải bảng tin Locket.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

