import { NextRequest, NextResponse } from "next/server";
import { resolveSoundCloudAudio } from "@/lib/soundcloud";
import { extractYouTubeVideoId, getYouTubeAudioStream } from "@/lib/youtube";

const ALLOWED_TRACK_HOSTS = new Set(["youtu.be", "youtube.com", "www.youtube.com", "soundcloud.com", "www.soundcloud.com"]);

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  const trackUrl = request.nextUrl.searchParams.get("url");

  if ((source !== "youtube" && source !== "soundcloud") || !trackUrl) {
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
    if (source === "soundcloud") {
      const audio = await resolveSoundCloudAudio(parsedTrack.toString());
      return NextResponse.redirect(audio.url, 307);
    }

    const videoId = extractYouTubeVideoId(parsedTrack.toString());
    if (!videoId) return NextResponse.json({ error: "Link YouTube không hợp lệ." }, { status: 400 });

    // Pass browser's Range header through so YouTube CDN returns 206 + seeking works.
    const range = request.headers.get("range") ?? undefined;
    const audio = await getYouTubeAudioStream(parsedTrack.toString(), range);

    const headers = new Headers({
      "Content-Type": audio.contentType,
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
    });
    if (audio.contentLength) headers.set("Content-Length", audio.contentLength);
    if (audio.contentRange) headers.set("Content-Range", audio.contentRange);

    return new NextResponse(audio.body, { status: audio.status, headers });
  } catch (err) {
    console.error("[stream] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Chưa thể phát bài hát này. Hãy thử bài khác." }, { status: 502 });
  }
}
