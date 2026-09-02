import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { db, firebaseApp } from "@/lib/firebase";

const PUSH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = PUSH_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function getFCMToken(): Promise<string> {
  if (typeof window === "undefined" || !firebaseApp || !(await isSupported()) || !("serviceWorker" in navigator)) {
    throw new Error("Trình duyệt này chưa hỗ trợ thông báo đẩy.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Người dùng chưa cho phép thông báo.");
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error("Thiếu NEXT_PUBLIC_FIREBASE_VAPID_KEY.");

  // Gỡ registration scope cũ để notification luôn thuộc chính PWA đã cài trên màn hình chính.
  const registrations = await withTimeout(
    navigator.serviceWorker.getRegistrations(),
    "Không thể kiểm tra Service Worker. Hãy đóng và mở lại ứng dụng.",
  );
  await Promise.all(registrations
    .filter((item) => new URL(item.scope).pathname.startsWith("/firebase-cloud-messaging-push-scope"))
    .map((item) => item.unregister()));

  const registration = await withTimeout(
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }),
    "Service Worker phản hồi quá lâu. Hãy tải lại ứng dụng rồi thử lại.",
  );
  // Không chờ navigator.serviceWorker.ready: trên một số PWA điện thoại promise
  // này có thể treo dù PushManager của registration đã sử dụng được.
  const token = await withTimeout(getToken(getMessaging(firebaseApp), {
    vapidKey,
    serviceWorkerRegistration: registration,
  }), "Firebase không trả FCM token. Hãy kiểm tra VAPID key và kết nối mạng.", 20_000);

  if (!token) throw new Error("Firebase không trả về FCM token.");
  return token;
}

export async function registerForPushNotifications(userId: string): Promise<"granted" | "denied" | "unsupported"> {
  if (!firebaseApp || !db || typeof window === "undefined" || !(await isSupported()) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }

  let token: string;
  try {
    token = await getFCMToken();
  } catch (error) {
    if (Notification.permission === "denied") return "denied";
    throw error;
  }

  await withTimeout(
    setDoc(doc(db, "users", userId), { fcmTokens: arrayUnion(token) }, { merge: true }),
    "Đã lấy token nhưng chưa lưu được vào Firestore. Hãy kiểm tra mạng và Firestore Rules.",
  );
  window.dispatchEvent(new Event("love-days-push-enabled"));
  return "granted";
}
