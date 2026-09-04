import { NextRequest, NextResponse } from "next/server";
import { resolveSoundCloudAudio } from "@/lib/soundcloud";

const ALLOWED_TRACK_HOSTS = new Set(["soundcloud.com", "www.soundcloud.com"]);

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  const trackUrl = request.nextUrl.searchParams.get("url");

  if (source !== "soundcloud" || !trackUrl) {
    return NextResponse.json({ error: "Bài hát không hợp lệ." }, { status: 400 });
  }

  let parsedTrack: URL;
  try {
    parsedTrack = new URL(trackUrl);
  } catch {
    return NextResponse.json({ error: "Link bài hát không hợp lệ." }, { status: 400 });
  }
  if (parsedTrack.protocol !== "https:" || !ALLOWED_TRACK_HOSTS.has(parsedTrack.hostname)) {
    return NextResponse.json({ error: "Nguồn bài hát không được hỗ trợ." }, { status: 400 });
  }

  try {
    const audio = await resolveSoundCloudAudio(parsedTrack.toString());
    return NextResponse.redirect(audio.url, 307);
  } catch (err) {
    console.error("[stream] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Chưa thể phát bài hát này. Hãy thử bài khác." }, { status: 502 });
  }
}
