import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { db, firebaseApp, firebaseConfig } from "@/lib/firebase";

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

  const firebaseParams = new URLSearchParams(
    Object.entries(firebaseConfig).reduce<Record<string, string>>((result, [key, value]) => {
      if (value) result[key] = value;
      return result;
    }, {}),
  );
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${firebaseParams.toString()}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

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
  } catch {
    return Notification.permission === "denied" ? "denied" : "unsupported";
  }

  await setDoc(doc(db, "users", userId), { fcmTokens: arrayUnion(token) }, { merge: true });
  window.dispatchEvent(new Event("love-days-push-enabled"));
  return "granted";
}
