import { NextRequest, NextResponse } from "next/server";
import { resolveSoundCloudAudio } from "@/lib/soundcloud";
import { createYouTubeMp3Stream } from "@/lib/youtube";

const ALLOWED_TRACK_HOSTS = new Set(["youtu.be", "youtube.com", "www.youtube.com", "soundcloud.com", "www.soundcloud.com"]);

export const dynamic = "force-dynamic";

function safeFilename(value: string) {
  const cleaned = value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return cleaned || "love-days-music";
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  const trackUrl = request.nextUrl.searchParams.get("url");
  const title = safeFilename(request.nextUrl.searchParams.get("title") || "love-days-music");
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
      const audioResponse = await fetch(audio.url, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
      if (!audioResponse.ok || !audioResponse.body) throw new Error("SoundCloud download failed");
      const headers = new Headers({
        "Content-Type": audioResponse.headers.get("content-type") || audio.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${title}.mp3`)}`,
        "Cache-Control": "private, no-store",
      });
      const contentLength = audioResponse.headers.get("content-length");
      if (contentLength) headers.set("Content-Length", contentLength);
      return new NextResponse(audioResponse.body, { status: 200, headers });
    }

    const mp3 = await createYouTubeMp3Stream(parsedTrack.toString());
    request.signal.addEventListener("abort", () => mp3.process.kill(), { once: true });
    return new NextResponse(mp3.stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${title}.mp3`)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Chưa thể tải bài hát này. Hãy thử lại sau." }, { status: 502 });
  }
}
