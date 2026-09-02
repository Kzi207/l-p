/* global self, clients */

// Đọc trực tiếp Web Push để một lỗi khởi tạo Firebase không thể làm hỏng
// toàn bộ Service Worker của PWA trên iOS/Android.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { notification: { body: event.data?.text() || "" } };
  }
  const message = payload.FCM_MSG || payload;
  const data = message.data || {};
  const notification = message.notification || {};
  const title = data.title || notification.title || "Love Days 💌";
  const options = {
    body: data.body || notification.body || "Bạn có một điều mới từ người thương.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: `${data.type || "love-days"}-${data.itemId || "new"}`,
    renotify: true,
    data: { url: data.url || data.route || message.fcmOptions?.link || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
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
