import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export class ApiAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

/** Xác thực Firebase ID token gửi trong Authorization: Bearer <token>. */
export async function verifyAuthToken(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiAuthError("Thiếu Firebase ID token.");

  try {
    return await getAdminAuth().verifyIdToken(match[1], true);
  } catch {
    throw new ApiAuthError("Firebase ID token không hợp lệ hoặc đã hết hạn.");
  }
}
