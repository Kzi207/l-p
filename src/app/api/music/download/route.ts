import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://khanhduy.id.vn/api/v1";
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
    const resolver = new URL(`${API_BASE}/${source}`);
    resolver.searchParams.set("download", parsedTrack.toString());
    resolver.searchParams.set("type", "mp3");
    const resolvedResponse = await fetch(resolver, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (!resolvedResponse.ok) throw new Error("Resolve failed");
    const resolved = await resolvedResponse.json() as { status?: boolean; download_url?: string };
    if (!resolved.status || !resolved.download_url) throw new Error("No download URL");

    const audioUrl = new URL(resolved.download_url);
    if (audioUrl.hostname !== "khanhduy.id.vn") throw new Error("Unexpected audio host");
    // download_url chứa dl=2 và header attachment. Redirect giúp file lớn
    // không bị ngắt vì giới hạn thời gian chạy của server Next.js.
    if (audioUrl.protocol === "https:") return NextResponse.redirect(audioUrl, 307);

    const audioResponse = await fetch(audioUrl, { cache: "no-store" });
    if (!audioResponse.ok) throw new Error("Download failed");

    const headers = new Headers({
      "Content-Type": audioResponse.headers.get("content-type") || "audio/mpeg",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${title}.mp3`)}`,
      "Cache-Control": "private, no-store",
    });
    const contentLength = audioResponse.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    return new NextResponse(audioResponse.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Chưa thể tải bài hát này. Hãy thử lại sau." }, { status: 502 });
  }
}
