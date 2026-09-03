import { NextRequest, NextResponse } from "next/server";
import { searchSoundCloud } from "@/lib/soundcloud";
import { searchYouTube } from "@/lib/youtube";

const SOURCES = new Set(["youtube", "soundcloud"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "youtube";
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);

  if (!SOURCES.has(source)) return NextResponse.json({ error: "Nguồn nhạc không hợp lệ." }, { status: 400 });

  try {
    if (source === "soundcloud") {
      return NextResponse.json(await searchSoundCloud(query), { headers: { "Cache-Control": "private, max-age=60" } });
    }
    return NextResponse.json(await searchYouTube(query), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "Nguồn nhạc đang phản hồi chậm hoặc tạm ngừng hoạt động." }, { status: 502 });
  }
}
