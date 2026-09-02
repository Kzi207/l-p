import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

interface RenderServiceAccount {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function decodeServiceAccount() {
  try {
    const encoded = requiredEnvironment("FIREBASE_ADMIN_SA_BASE64").trim();
    const account = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as RenderServiceAccount;
    if (!account.project_id || !account.client_email || !account.private_key) throw new Error("Service Account thiếu trường bắt buộc.");
    return {
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    };
  } catch (caught) {
    if (caught instanceof Error && caught.message.startsWith("Thiếu biến")) throw caught;
    throw new Error("FIREBASE_ADMIN_SA_BASE64 không phải Service Account JSON base64 hợp lệ.");
  }
}

/** Khởi tạo Admin SDK đúng một lần trong tiến trình Next.js chạy trên Render. */
export function getFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    // Encode cả JSON giúp private_key giữ nguyên xuống dòng khi nhập Environment trên Render.
    credential: cert(decodeServiceAccount()),
  });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminMessaging() {
  return getMessaging(getFirebaseAdminApp());
}
