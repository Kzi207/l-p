import { NextResponse } from "next/server";
import { ensureNeonSchema } from "@/lib/neon-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Đánh thức cả Next.js lẫn kết nối Neon và báo lỗi cấu hình sớm. */
export async function GET() {
  try {
    await ensureNeonSchema();
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (caught) {
    console.error("Neon health check failed:", caught);
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
