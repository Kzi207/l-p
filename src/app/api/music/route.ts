import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://khanhduy.id.vn/api/v1";
const SOURCES = new Set(["youtube", "soundcloud"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "youtube";
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);

  if (!SOURCES.has(source)) return NextResponse.json({ error: "Nguồn nhạc không hợp lệ." }, { status: 400 });

  const endpoint = new URL(`${API_BASE}/${source}`);
  if (query) endpoint.searchParams.set("search", query);

  try {
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Music API ${response.status}`);
    const payload = await response.json() as { status?: boolean; data?: unknown[]; query?: string; total?: number };
    if (!payload.status || !Array.isArray(payload.data)) throw new Error("Music API response invalid");
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "Nguồn nhạc đang phản hồi chậm hoặc tạm ngừng hoạt động." }, { status: 502 });
  }
}
