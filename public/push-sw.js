/* global self, clients */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { body: event.data ? event.data.text() : "" } };
  }

  const message = payload.FCM_MSG || payload;
  const data = message.data || {};
  const notification = message.notification || {};
  event.waitUntil(self.registration.showNotification(
    data.title || notification.title || "Love Days 💌",
    {
      body: data.body || notification.body || "Bạn có một điều mới từ người thương.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: `${data.type || "love-days"}-${data.itemId || "new"}`,
      renotify: true,
      data: { url: data.url || data.route || message.fcmOptions?.link || "/" },
    },
  ));
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

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
