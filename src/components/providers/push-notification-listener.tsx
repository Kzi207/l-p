"use client";

import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { registerForPushNotifications } from "@/lib/fcm";
import { firebaseApp } from "@/lib/firebase";

export function PushNotificationListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    registerForPushNotifications(user.uid).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    async function listen() {
      if (!firebaseApp || typeof Notification === "undefined" || Notification.permission !== "granted" || !(await isSupported())) return;
      unsubscribe();
      unsubscribe = onMessage(getMessaging(firebaseApp), async (payload) => {
        const registration = await navigator.serviceWorker.getRegistration("/firebase-cloud-messaging-push-scope");
        const title = payload.data?.title || payload.notification?.title || "Love Days 💌";
        const body = payload.data?.body || payload.notification?.body || "Bạn có một điều mới từ người thương.";
        const url = payload.data?.url || "/";
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: `${payload.data?.type || "love-days"}-${payload.data?.itemId || "new"}`,
            data: { url },
          });
        }
      });
    }

    const start = () => {
      if (active) listen().catch(() => undefined);
    };
    start();
    window.addEventListener("love-days-push-enabled", start);
    return () => {
      active = false;
      window.removeEventListener("love-days-push-enabled", start);
      unsubscribe();
    };
  }, []);

  return null;
}
