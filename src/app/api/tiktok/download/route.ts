import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_MEDIA_HOSTS = ["tikwm.com", "tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "byteoversea.com", "byteoversea.net", "ibytedtos.com", "muscdn.com", "akamaized.net"];

function isAllowedMediaUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_MEDIA_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "tiktok-media";
}

async function fetchAllowedMedia(initialUrl: string, signal: AbortSignal) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= 4; redirectCount += 1) {
    if (!isAllowedMediaUrl(currentUrl)) throw new Error("Unsafe media redirect");
    const response = await fetch(currentUrl, {
      headers: { Accept: "video/*,image/*,audio/*;q=0.9,*/*;q=0.1", Referer: "https://www.tikwm.com/", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" },
      cache: "no-store",
      redirect: "manual",
      signal,
    });

    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Media redirect is missing a location");
    currentUrl = new URL(location, currentUrl).href;
  }

  throw new Error("Too many media redirects");
}

export async function GET(request: NextRequest) {
  const mediaUrl = request.nextUrl.searchParams.get("url") || "";
  const filename = safeFilename(request.nextUrl.searchParams.get("filename") || "tiktok-media");
  if (!isAllowedMediaUrl(mediaUrl)) return NextResponse.json({ error: "Đường dẫn tệp TikTok không hợp lệ." }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetchAllowedMedia(mediaUrl, controller.signal);
    if (!response.ok || !response.body) throw new Error(`Media server returned HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    if (!/^(video|image|audio)\//i.test(contentType) && contentType !== "application/octet-stream") throw new Error(`Unexpected media type: ${contentType}`);
    const headers = new Headers({ "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Type": contentType, "X-Content-Type-Options": "nosniff" });
    const contentLength = response.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    return new NextResponse(response.body, { status: 200, headers });
  } catch (error) {
    console.error("TikTok media download failed:", error);
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "Tệp phản hồi quá lâu. Hãy thử lại." : "Không thể tải tệp TikTok lúc này." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
