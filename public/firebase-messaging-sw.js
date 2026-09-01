/* global firebase, importScripts, clients */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

// Firebase Web config là thông tin công khai. Client truyền qua query string khi đăng ký SW.
const params = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || payload.notification?.title || "Love Days 💌";
  const options = {
    body: payload.data?.body || payload.notification?.body || "Bạn có một điều mới từ người thương.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: `${payload.data?.type || "love-days"}-${payload.data?.itemId || "new"}`,
    renotify: true,
    data: { url: payload.data?.url || "/" },
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(destination);
      return existing.focus();
    }
    return clients.openWindow(destination);
  })());
});
