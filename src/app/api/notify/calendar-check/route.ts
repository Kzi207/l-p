import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminGet } from "@/lib/neon-admin-db";
import { sendDueCalendarReminders } from "@/lib/calendar-reminders";
import { ApiAuthError, verifyAuthToken } from "@/lib/verifyAuthToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supplied = request.headers.get("x-cron-secret");
    if (supplied !== null) {
      const expected = process.env.CRON_SECRET;
      if (!expected) return NextResponse.json({ error: "Cron chưa được cấu hình." }, { status: 503 });
      const a = Buffer.from(supplied), b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.json(await sendDueCalendarReminders());
    }
    const { uid } = await verifyAuthToken(request);
    const user = await adminGet<{ coupleId?: string }>(`users/${uid}`);
    const coupleId = user.data?.coupleId;
    if (!coupleId || coupleId.includes("/")) return NextResponse.json({ sent: 0 });
    const couple = await adminGet<{ memberIds?: string[] }>(`couples/${coupleId}`);
    if (!Array.isArray(couple.data?.memberIds) || !couple.data.memberIds.includes(uid)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json(await sendDueCalendarReminders({ coupleId, uid }));
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Calendar reminder check failed", error);
    return NextResponse.json({ error: "Chưa thể kiểm tra nhắc lịch." }, { status: 500 });
  }
}
