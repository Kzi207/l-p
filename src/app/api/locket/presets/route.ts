import { NextResponse } from "next/server";
import { getCaptionPresets } from "@/lib/locket/locket-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = getCaptionPresets();
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("Locket presets route error:", error);
    return NextResponse.json({ ok: false, error: "Không thể lấy danh sách preset." }, { status: 500 });
  }
}

