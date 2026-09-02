import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminMessaging } from "@/lib/firebaseAdmin";

export interface PushResult {
  successCount: number;
  failureCount: number;
  tokenCount: number;
  removedTokenCount: number;
}

function absoluteRoute(route: string) {
  const configured = process.env.APP_URL;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const origin = configured || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
  return new URL(route, origin).toString();
}

/** Gửi Web Push tới mọi thiết bị của một user và tự loại token FCM đã hỏng. */
export async function sendPushToUser(uid: string, title: string, body: string, route: string, extraData: Record<string, string> = {}): Promise<PushResult> {
  const database = getAdminFirestore();
  const userRef = database.doc(`users/${uid}`);
  const user = await userRef.get();
  const rawTokens = user.get("fcmTokens");
  const tokens = Array.from(new Set(Array.isArray(rawTokens) ? rawTokens.filter((token): token is string => typeof token === "string" && token.length > 0) : [])).slice(0, 500);

  if (tokens.length === 0) return { successCount: 0, failureCount: 0, tokenCount: 0, removedTokenCount: 0 };

  const destination = absoluteRoute(route);
  const response = await getAdminMessaging().sendEachForMulticast({
    tokens,
    data: { ...extraData, title, body, route, url: destination },
    webpush: {
      headers: { Urgency: extraData.type === "message" ? "high" : "normal" },
      fcmOptions: { link: destination },
    },
  });

  const invalidCodes = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
  const invalidTokens = response.responses
    .map((result, index) => ({ result, token: tokens[index] }))
    .filter(({ result }) => !result.success && invalidCodes.has(result.error?.code || ""))
    .map(({ token }) => token);

  if (invalidTokens.length > 0) {
    await userRef.update({ fcmTokens: FieldValue.arrayRemove(...invalidTokens) });
  }

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    tokenCount: tokens.length,
    removedTokenCount: invalidTokens.length,
  };
}
