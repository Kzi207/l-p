import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

/** Khởi tạo Admin SDK đúng một lần trong mỗi Vercel Serverless instance. */
export function getFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: cert({
      projectId: requiredEnvironment("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requiredEnvironment("FIREBASE_ADMIN_CLIENT_EMAIL"),
      // Vercel lưu xuống dòng dưới dạng chuỗi \\n, cần đổi lại trước khi tạo credential.
      privateKey: requiredEnvironment("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
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
