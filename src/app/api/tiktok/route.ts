import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isTikTokUrl(input: string) {
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && (host === "tiktok.com" || host.endsWith(".tiktok.com"));
  } catch {
    return false;
  }
}

function safeMediaUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!isTikTokUrl(url)) return NextResponse.json({ error: "Hãy nhập đúng liên kết TikTok." }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Love-Days/1.0" },
      body: new URLSearchParams({ url, hd: "1" }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`TikWM HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) throw new Error("TikWM returned a non-JSON response");
    const result = await response.json() as { code?: number; msg?: string; data?: Record<string, unknown> };
    const data = result.data;
    if (result.code !== 0 || !data) return NextResponse.json({ error: result.msg || "TikWM chưa đọc được nội dung này." }, { status: 422 });
    const author = typeof data.author === "object" && data.author ? data.author as Record<string, unknown> : {};
    const images = Array.isArray(data.images) ? data.images.map(safeMediaUrl).filter(Boolean) : [];
    const videoUrl = safeMediaUrl(data.hdplay) || safeMediaUrl(data.play);
    const mediaType = images.length > 0 ? "images" : "video";
    if (mediaType === "video" && !videoUrl) return NextResponse.json({ error: "Không tìm thấy ảnh hoặc video để tải." }, { status: 502 });
    return NextResponse.json({
      id: String(data.id || "tiktok-video"),
      mediaType,
      title: String(data.title || (mediaType === "images" ? "Bài ảnh TikTok" : "Video TikTok")),
      cover: safeMediaUrl(data.cover) || safeMediaUrl(data.origin_cover),
      videoUrl,
      images,
      musicUrl: safeMediaUrl(data.music),
      author: String(author.nickname || author.unique_id || "TikTok"),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("TikWM request failed:", error);
    return NextResponse.json({ error: error instanceof Error && error.name === "AbortError" ? "TikWM phản hồi quá lâu. Hãy thử lại." : "Không thể kết nối TikWM lúc này." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
