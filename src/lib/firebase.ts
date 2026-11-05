import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, browserPopupRedirectResolver, getAuth, indexedDBLocalPersistence, initializeAuth, type Auth } from "firebase/auth";
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
// Neon is accessed only by the internal Next.js API, so DATABASE_URL must never
// be exposed through a NEXT_PUBLIC variable in the browser bundle.
export const isDatabaseConfigured = true;

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  if (typeof window === "undefined") {
    authInstance = getAuth(app);
  } else {
    try {
      // Restore existing sessions before authStateReady resolves. Both stores
      // survive closing the browser; localStorage covers browsers without IDB.
      // Firebase persists refresh tokens and renews ID tokens automatically.
      authInstance = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch (error) {
      // Next.js Fast Refresh can evaluate this module after Auth already exists.
      if ((error as { code?: string }).code !== "auth/already-initialized") throw error;
      authInstance = getAuth(app);
    }
  }
}

export const firebaseApp = app;
export const auth = authInstance;
// Dữ liệu ứng dụng nằm trong Neon qua API nội bộ. Giữ một marker để các màn hình
// hiện tại tiếp tục dùng lớp tương thích Firestore mà không cần biết driver server.
export const db: DatabaseMarker | null = isFirebaseConfigured && isDatabaseConfigured
  ? ({ __googleSheetsDatabase: true } as const)
  : null;
