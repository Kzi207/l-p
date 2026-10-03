import { NextResponse } from "next/server";
import { getIdTokenVerifier } from "@/lib/firebaseAdmin";
import { executeDatabaseAction, type DatabaseUser, type JsonRecord } from "@/lib/neon-database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authenticate(token: unknown): Promise<DatabaseUser> {
  if (typeof token !== "string" || !token) throw new Error("Bạn cần đăng nhập lại.");
  try {
    const decoded = await getIdTokenVerifier().verifyIdToken(token);
    return { uid: decoded.uid };
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
