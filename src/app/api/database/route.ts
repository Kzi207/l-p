import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { executeDatabaseAction, type DatabaseUser, type JsonRecord } from "@/lib/neon-database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authenticate(token: unknown): Promise<DatabaseUser> {
  if (typeof token !== "string" || !token) throw new Error("Bạn cần đăng nhập lại.");
  try {
    if (process.env.FIREBASE_ADMIN_SA_BASE64?.trim()) {
      const decoded = await getAdminAuth().verifyIdToken(token, true);
      return { uid: decoded.uid };
    }
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
    if (!apiKey) throw new Error("Thiếu Firebase API key.");
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json() as { users?: Array<{ localId?: string }> };
    const uid = payload.users?.[0]?.localId;
    if (!response.ok || !uid) throw new Error("Token không hợp lệ.");
    return { uid };
  } catch {
    throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
  }
}

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (!text || text.length > 5_000_000) throw new Error("Dữ liệu gửi lên không hợp lệ.");
    const body = JSON.parse(text) as JsonRecord;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Dữ liệu gửi lên không hợp lệ.");
    const user = await authenticate(body.token);
    const data = await executeDatabaseAction(body, user);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Không thể xử lý dữ liệu.";
    const authenticationError = /đăng nhập|phiên đăng nhập/i.test(message);
    console.error("Neon database request failed:", caught);
    return NextResponse.json({ ok: false, error: message }, { status: authenticationError ? 401 : 400 });
  }
}
