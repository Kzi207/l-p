import { NextRequest, NextResponse } from "next/server";
import { searchSoundCloud, resolveSoundCloudTrackInfo } from "@/lib/soundcloud";
const SOURCES = new Set(["soundcloud"]);

export const dynamic = "force-dynamic";

function isSoundCloudUrl(q: string) {
  try {
    const url = new URL(q);
    return url.hostname === "soundcloud.com" || url.hostname === "www.soundcloud.com" || url.hostname === "m.soundcloud.com";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "soundcloud";
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 300);

  if (!SOURCES.has(source)) return NextResponse.json({ error: "Nguồn nhạc không hợp lệ." }, { status: 400 });

  try {
    if (query && isSoundCloudUrl(query)) {
      const track = await resolveSoundCloudTrackInfo(query);
      return NextResponse.json({ status: true, type: "link", query, total: 1, data: [track] }, { headers: { "Cache-Control": "private, max-age=300" } });
    }
    return NextResponse.json(await searchSoundCloud(query), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (caught) {
    console.error("Music search failed:", caught);
    return NextResponse.json({ error: "Nguồn nhạc đang phản hồi chậm hoặc tạm ngừng hoạt động." }, { status: 502 });
  }
}
