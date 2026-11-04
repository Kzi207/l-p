import { auth } from "@/lib/firebase";

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!auth?.currentUser) return {};
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function linkLocketAccount(email: string, password: string) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/auth", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "link", email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể liên kết tài khoản Locket.");
  return data;
}

export async function loginWithLocket(email: string, password: string) {
  const res = await fetch("/api/locket/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Đăng nhập Locket thất bại.");
  return data;
}

export async function checkLocketStatus() {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/auth", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status" }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể kiểm tra trạng thái Locket.");
  return data;
}

export async function unlinkLocketAccount() {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/auth", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unlink" }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể hủy liên kết Locket.");
  return data;
}

export async function getLocketFeed(type: "all" | "my" = "all", username?: string, pageToken?: string | null, signal?: AbortSignal) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/feed", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ type, username, pageToken, limit: 30 }),
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể tải khoảnh khắc Locket.");
  return { moments: data.moments || [], nextPageToken: data.nextPageToken || null };
}

export async function postLocketMoment(params: {
  file?: File;
  imageBase64?: string;
  videoBase64?: string;
  caption?: string;
  noteType?: string;
  icon?: string | null;
  colors?: string[] | null;
  textColor?: string | null;
  isPrivate?: boolean;
  recipients?: string[] | null;
}) {
  const headers = await getAuthHeader();

  if (params.file) {
    const formData = new FormData();
    formData.append("file", params.file);
    if (params.caption) formData.append("caption", params.caption);
    if (params.noteType) formData.append("noteType", params.noteType);
    if (params.icon) formData.append("icon", params.icon);
    if (params.textColor) formData.append("textColor", params.textColor);
    if (params.colors) formData.append("colors", JSON.stringify(params.colors));
    if (params.recipients) formData.append("recipients", JSON.stringify(params.recipients));
    formData.append("isPrivate", String(Boolean(params.isPrivate)));

    const res = await fetch("/api/locket/post", {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Không thể đăng lên Locket.");
    return data;
  }

  const res = await fetch("/api/locket/post", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể đăng lên Locket.");
  return data;
}

export async function interactLocketMoment(
  action: "react" | "comment" | "delete" | "views",
  momentUid: string,
  extra: { emoji?: string; text?: string; receiverUid?: string } = {}
) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/interact", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action, momentUid, ...extra }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Thao tác trên khoảnh khắc thất bại.");
  return data;
}

export async function getLocketConversations() {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/chat", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "conversations" }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể lấy danh sách chat Locket.");
  return data;
}

export async function getLocketMessages(otherUserId?: string, conversationId?: string) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/chat", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "messages", otherUserId, conversationId }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể lấy tin nhắn Locket.");
  return data.messages || [];
}

export async function sendLocketChatMessage(receiverUid: string, text?: string, momentUid?: string) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/chat", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "send", receiverUid, text, momentUid }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể gửi tin nhắn Locket.");
  return data;
}

export async function reactLocketChatMessage(conversationId: string, messageId: string, emoji: string) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/chat", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "react", conversationId, messageId, emoji }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể thả cảm xúc tin nhắn.");
  return data;
}

export async function deleteLocketChatMessage(conversationId: string, messageId: string) {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/chat", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", conversationId, messageId }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể thu hồi tin nhắn.");
  return data;
}

export async function markLocketChatRead(otherUserId?: string, conversationId?: string) {
  const headers = await getAuthHeader();
  await fetch("/api/locket/chat", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "read", otherUserId, conversationId }),
  }).catch(() => {});
}

export async function getLocketFriends() {
  const headers = await getAuthHeader();
  const res = await fetch("/api/locket/friends", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list" }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể lấy danh sách bạn bè.");
  return data.friends || [];
}

export async function getLocketPresets() {
  const res = await fetch("/api/locket/presets");
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Không thể lấy preset.");
  return data;
}

