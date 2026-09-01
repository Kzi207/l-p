import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { db, firebaseApp, firebaseConfig } from "@/lib/firebase";

export async function registerForPushNotifications(userId: string): Promise<"granted" | "denied" | "unsupported"> {
  if (!firebaseApp || !db || !(await isSupported()) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const query = new URLSearchParams(
    Object.entries(firebaseConfig).reduce<Record<string, string>>((result, [key, value]) => {
      if (value) result[key] = value;
      return result;
    }, {}),
  );
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query.toString()}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) return "denied";
  await setDoc(doc(db, "users", userId), { fcmTokens: arrayUnion(token) }, { merge: true });
  window.dispatchEvent(new Event("love-days-push-enabled"));
  return "granted";
}
