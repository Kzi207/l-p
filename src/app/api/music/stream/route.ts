import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://khanhduy.id.vn/api/v1";
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
    const resolver = new URL(`${API_BASE}/${source}`);
    resolver.searchParams.set("download", parsedTrack.toString());
    resolver.searchParams.set("type", "mp3");
    const resolvedResponse = await fetch(resolver, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (!resolvedResponse.ok) throw new Error("Resolve failed");
    const resolved = await resolvedResponse.json() as { status?: boolean; stream_url?: string; download_url?: string };
    const playableUrl = resolved.stream_url || resolved.download_url;
    if (!resolved.status || !playableUrl) throw new Error("No audio URL");

    const audioUrl = new URL(playableUrl);
    if (audioUrl.hostname !== "khanhduy.id.vn") throw new Error("Unexpected audio host");
    // API nguồn đã hỗ trợ HTTPS, byte-range và token 15 phút. Redirect để
    // trình duyệt đọc các range trực tiếp, tránh resolve lại từng đoạn nhạc.
    if (audioUrl.protocol === "https:") return NextResponse.redirect(audioUrl, 307);

    const range = request.headers.get("range");
    const audioResponse = await fetch(audioUrl, {
      cache: "no-store",
      headers: range ? { Range: range } : undefined,
    });
    if (!audioResponse.ok && audioResponse.status !== 206) throw new Error("Audio stream failed");

    const headers = new Headers({
      "Content-Type": audioResponse.headers.get("content-type") || "audio/mpeg",
      "Cache-Control": "private, no-store",
      "Accept-Ranges": audioResponse.headers.get("accept-ranges") || "bytes",
    });
    for (const header of ["content-length", "content-range"]) {
      const value = audioResponse.headers.get(header);
      if (value) headers.set(header, value);
    }
    return new NextResponse(audioResponse.body, { status: audioResponse.status, headers });
  } catch {
    return NextResponse.json({ error: "Chưa thể phát bài hát này. Hãy thử bài khác." }, { status: 502 });
  }
}
