import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";


interface RenderServiceAccount {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function decodeServiceAccount() {
  const encoded = process.env.FIREBASE_ADMIN_SA_BASE64?.trim();
  if (encoded) {
    try {
      const account = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as RenderServiceAccount;
      if (!account.project_id || !account.client_email || !account.private_key) throw new Error("Service Account thiếu trường bắt buộc.");
      return {
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      };
    } catch (caught) {
      if (caught instanceof Error && caught.message.startsWith("Service Account")) throw caught;
      throw new Error("FIREBASE_ADMIN_SA_BASE64 không phải Service Account JSON base64 hợp lệ.");
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path");
    const localFile = path.resolve(process.cwd(), "serviceAccountKey.json");
    if (fs.existsSync(localFile)) {
      const account = JSON.parse(fs.readFileSync(localFile, "utf8")) as RenderServiceAccount;
      if (account.project_id && account.client_email && account.private_key) {
        return {
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: account.private_key,
        };
      }
    }
  } catch { /* ignore fallback errors */ }

  throw new Error("Thiếu biến môi trường FIREBASE_ADMIN_SA_BASE64.");
}

/** Khởi tạo Admin SDK đúng một lần trong tiến trình Next.js chạy trên Render. */
export function getFirebaseAdminApp(): App {
  const existing = getApps().find((entry) => entry.name === "[DEFAULT]");
  if (existing) return existing;

  return initializeApp({
    // Encode cả JSON giúp private_key giữ nguyên xuống dòng khi nhập Environment trên Render.
    credential: cert(decodeServiceAccount()),
  });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

// ID-token verification only needs the project ID and Google's public keys.
// The Admin SDK caches those keys; no account lookup is needed per data request.
export function getIdTokenVerifier() {
  if (process.env.FIREBASE_ADMIN_SA_BASE64?.trim()) return getAdminAuth();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) throw new Error("Thiếu Firebase project ID.");
  const name = "love-days-token-verifier";
  const app = getApps().find((entry) => entry.name === name) ?? initializeApp({ projectId }, name);
  return getAuth(app);
}

export function getAdminMessaging() {
  return getMessaging(getFirebaseAdminApp());
}
