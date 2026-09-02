"use client";

import type { User } from "firebase/auth";

export type NotificationEndpoint = "/api/notify/photo" | "/api/notify/locket" | "/api/notify/memory" | "/api/notify/chat";

interface PendingNotification {
  id: string;
  endpoint: NotificationEndpoint;
  body: Record<string, unknown>;
  createdAt: number;
}

const STORAGE_KEY = "love-days-pending-push-v1";
let flushing = false;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function readQueue(): PendingNotification[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-100) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-100)));
  } catch {
    // localStorage có thể bị chặn ở chế độ riêng tư; thông báo không được phép làm hỏng thao tác chính.
  }
}

async function send(user: User, item: PendingNotification) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const token = await user.getIdToken(attempt > 0);
      const controller = new AbortController();
      // Render Free có thể cần gần một phút để khởi động lại sau khi ngủ.
      const timeout = window.setTimeout(() => controller.abort(), 65_000);
      const response = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(item.body),
        keepalive: true,
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeout));
      if (response.ok) return;
      lastError = new Error(`Notify API trả về ${response.status}.`);
    } catch (caught) {
      lastError = caught;
    }
    if (attempt < 2) await wait(2_000);
  }
  throw lastError instanceof Error ? lastError : new Error("Không thể gọi Notify API.");
}

function queueItem(item: PendingNotification) {
  const queue = readQueue();
  const duplicate = queue.some((current) => current.endpoint === item.endpoint && JSON.stringify(current.body) === JSON.stringify(item.body));
  if (!duplicate) writeQueue([...queue, item]);
}

/** Bắn request nền, retry 2 lần rồi cất localStorage nếu thiết bị đang mất mạng. */
export function sendNotificationInBackground(user: User, endpoint: NotificationEndpoint, body: Record<string, unknown>) {
  const item: PendingNotification = { id: crypto.randomUUID(), endpoint, body, createdAt: Date.now() };
  void send(user, item).catch(() => queueItem(item));
}

/** Gọi khi app mở lại để thử gửi các thông báo còn nằm trong hàng đợi cục bộ. */
export async function flushNotificationQueue(user: User) {
  if (flushing || typeof window === "undefined") return;
  flushing = true;
  try {
    const queue = readQueue();
    for (const item of queue) {
      try {
        await send(user, item);
        writeQueue(readQueue().filter((current) => current.id !== item.id));
      } catch {
        // Giữ lại item cho lần mở app tiếp theo, nhưng vẫn thử các item còn lại.
      }
    }
  } finally {
    flushing = false;
  }
}
