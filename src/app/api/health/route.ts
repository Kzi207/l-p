import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Route nhẹ để GitHub Actions hoặc dịch vụ uptime đánh thức Render. */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
