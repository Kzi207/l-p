import { NextRequest, NextResponse } from "next/server";
import { resolveSoundCloudAudio } from "@/lib/soundcloud";
import { getYouTubeAudioStream } from "@/lib/youtube";

const ALLOWED_TRACK_HOSTS = new Set(["youtu.be", "youtube.com", "www.youtube.com", "soundcloud.com", "www.soundcloud.com"]);

export const dynamic = "force-dynamic";

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
    const audioStream = await getYouTubeAudioStream(parsedTrack.toString());
    return new NextResponse(audioStream, {
      headers: { "Content-Type": "audio/mp4", "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Chưa thể phát bài hát này. Hãy thử bài khác." }, { status: 502 });
  }
}
