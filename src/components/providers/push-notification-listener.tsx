"use client";

import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { registerForPushNotifications } from "@/lib/fcm";
import { db, firebaseApp } from "@/lib/firebase";
import { flushNotificationQueue } from "@/lib/notification-client";

async function showSystemNotification(title: string, body: string, url: string, tag: string) {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return;
  await registration.showNotification(title, {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag,
    data: { url },
  });
}

export function PushNotificationListener() {
  const { user } = useAuth();
  const { couple } = useCoupleSpace();

  useEffect(() => {
    if (!user) return;
    void flushNotificationQueue(user);
    const flush = () => void flushNotificationQueue(user);
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [user]);

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
        const title = payload.data?.title || payload.notification?.title || "Love Days 💌";
        const body = payload.data?.body || payload.notification?.body || "Bạn có một điều mới từ người thương.";
        const url = payload.data?.url || "/";
        await showSystemNotification(title, body, url, `${payload.data?.type || "love-days"}-${payload.data?.itemId || "new"}`);
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

  useEffect(() => {
    if (!db || !user || !couple || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const database = db;
    const subscriptions: Array<() => void> = [];

    function watch(collectionName: string, type: string, notify: (data: Record<string, unknown>, id: string) => { title: string; body: string; url: string } | null) {
      let initialSnapshot = true;
      const recent = query(collection(database, "couples", couple!.id, collectionName), orderBy("createdAt", "desc"), limit(1));
      subscriptions.push(onSnapshot(recent, (snapshot) => {
        if (initialSnapshot) {
          initialSnapshot = false;
          return;
        }
        snapshot.docChanges().filter((change) => change.type === "added").forEach((change) => {
          const content = notify(change.doc.data(), change.doc.id);
          if (content) showSystemNotification(content.title, content.body, content.url, `${type}-${change.doc.id}`).catch(() => undefined);
        });
      }));
    }

    watch("locketMessages", "message", (data, id) => data.senderId === user.uid ? null : ({
      title: `Tin nhắn từ ${String(data.senderName || "người thương")} 💌`,
      body: String(data.text || "Bạn có tin nhắn mới.").slice(0, 160),
      url: `/chat?message=${encodeURIComponent(id)}`,
    }));
    watch("locketPosts", "locket", (data, id) => data.uploaderId === user.uid ? null : ({
      title: `${String(data.uploaderName || "Người thương")} vừa gửi Locket 📸`,
      body: String(data.caption || "Có một khoảnh khắc mới dành cho bạn."),
      url: `/locket?post=${encodeURIComponent(id)}`,
    }));
    watch("mediaMemories", "memory", (data, id) => data.uploaderId === user.uid ? null : ({
      title: `${String(data.uploaderName || "Người thương")} vừa lưu một kỷ niệm ✨`,
      body: String(data.caption || (data.mediaType === "video" ? "Có một video mới trong album." : "Có một ảnh mới trong album.")),
      url: `/map?memory=${encodeURIComponent(id)}`,
    }));
    watch("photos", "photo", (data, id) => data.uploaderId === user.uid ? null : ({
      title: `${String(data.uploaderName || "Người thương")} vừa đổi ảnh chung 💗`,
      body: String(data.caption || "Mở Love Days để xem ngay nhé."),
      url: `/?photo=${encodeURIComponent(id)}`,
    }));

    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [couple, user]);

  return null;
}
