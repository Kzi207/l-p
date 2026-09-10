import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import type { DatabaseMarker } from "@/lib/database";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);
export const isDatabaseConfigured = Boolean(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim());

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
}

export const firebaseApp = app;
export const auth = authInstance;
// Dữ liệu ứng dụng nằm trong Google Sheets qua Apps Script. Giữ một marker
// truthy để các màn hình cũ vẫn có thể kiểm tra cấu hình trước khi gọi API.
export const db: DatabaseMarker | null = isFirebaseConfigured && isDatabaseConfigured
  ? ({ __googleSheetsDatabase: true } as const)
  : null;
