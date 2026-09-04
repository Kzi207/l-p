import { NextRequest, NextResponse } from "next/server";
import { searchSoundCloud } from "@/lib/soundcloud";
const SOURCES = new Set(["soundcloud"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "soundcloud";
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);

  if (!SOURCES.has(source)) return NextResponse.json({ error: "Nguồn nhạc không hợp lệ." }, { status: 400 });

  try {
    return NextResponse.json(await searchSoundCloud(query), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (caught) {
    console.error("Music search failed:", caught);
    return NextResponse.json({ error: "Nguồn nhạc đang phản hồi chậm hoặc tạm ngừng hoạt động." }, { status: 502 });
  }
}
