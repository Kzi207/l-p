"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Heart,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  UserCheck,
  Smile,
  CheckCheck,
} from "lucide-react";
import {
  deleteLocketChatMessage,
  getLocketConversations,
  getLocketMessages,
  markLocketChatRead,
  reactLocketChatMessage,
  sendLocketChatMessage,
} from "@/lib/locket/locket-client-api";
import { AvatarImage } from "@/components/shared/avatar-image";

/* eslint-disable @typescript-eslint/no-explicit-any */

const QUICK_REACTIONS = ["💛", "🔥", "🥰", "😂", "❤️", "😍", "💋", "🫶"];

export function LocketChatView() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [reactingMsgId, setReactingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadInbox();
  }, []);

  async function loadInbox() {
    setLoading(true);
    setError("");
    try {
      const data = await getLocketConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách chat.");
    } finally {
      setLoading(false);
    }
  }

  // Open conversation
  async function selectConversation(conv: any) {
    setActiveConv(conv);
    setLoadingMessages(true);
    setMessages([]);

    try {
      const msgs = await getLocketMessages(conv.peer_uid, conv.conversation_id);
      setMessages(msgs);
      void markLocketChatRead(conv.peer_uid, conv.conversation_id);
    } catch (err) {
      console.warn("Could not load messages:", err);
    } finally {
      setLoadingMessages(false);
      scrollToBottom();
    }
  }

  // Live polling for active conversation
  useEffect(() => {
    if (!activeConv) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const msgs = await getLocketMessages(activeConv.peer_uid, activeConv.conversation_id);
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        }
      } catch {}
    }, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeConv]);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }

  // Send message
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeConv?.peer_uid || sending) return;

    const textToSend = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      await sendLocketChatMessage(activeConv.peer_uid, textToSend);
      // Reload messages
      const msgs = await getLocketMessages(activeConv.peer_uid, activeConv.conversation_id);
      setMessages(msgs);
      scrollToBottom();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gửi tin nhắn thất bại.");
    } finally {
      setSending(false);
    }
  }

  // React to message
  async function handleReact(msgId: string, emoji: string) {
    if (!activeConv?.conversation_id) return;
    try {
      await reactLocketChatMessage(activeConv.conversation_id, msgId, emoji);
      setReactingMsgId(null);
      const msgs = await getLocketMessages(activeConv.peer_uid, activeConv.conversation_id);
      setMessages(msgs);
    } catch (err) {
      console.warn("React message error:", err);
    }
  }

  // Delete / Recall message
  async function handleDeleteMessage(msgId: string) {
    if (!activeConv?.conversation_id || !confirm("Bạn muốn thu hồi tin nhắn này?")) return;
    try {
      await deleteLocketChatMessage(activeConv.conversation_id, msgId);
      setMessages((prev) => prev.filter((m) => m.message_id !== msgId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể thu hồi tin nhắn.");
    }
  }

  // Render Conversation Thread
  if (activeConv) {
    const peerName = activeConv.peer?.name || activeConv.peer_uid || "Bạn bè Locket";
    const peerAvatar = activeConv.peer?.avatar || "";

    return (
      <div className="soft-card flex h-[72vh] flex-col overflow-hidden bg-white/95 shadow-soft">
        {/* Thread Header */}
        <div className="flex items-center gap-3 border-b border-stone-200/70 p-3.5 bg-stone-50/50">
          <button
            type="button"
            onClick={() => {
              setActiveConv(null);
              loadInbox();
            }}
            className="grid size-9 place-items-center rounded-full text-stone-600 hover:bg-stone-200/60"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="size-5" />
          </button>

          <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-amber-100">
            <AvatarImage src={peerAvatar} alt={peerName} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-stone-800">{peerName}</p>
            <p className="truncate text-[11px] text-stone-500">
              {activeConv.peer?.username ? `@${activeConv.peer.username}` : "Locket Friend"}
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              const msgs = await getLocketMessages(activeConv.peer_uid, activeConv.conversation_id);
              setMessages(msgs);
            }}
            className="grid size-9 place-items-center rounded-full text-stone-600 hover:bg-stone-200/60"
            title="Làm mới tin nhắn"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loadingMessages ? (
            <div className="py-20 text-center text-xs text-stone-500">
              <LoaderCircle className="mx-auto size-6 animate-spin text-amber-500" />
              Đang tải tin nhắn Locket...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-20 text-center text-xs text-stone-500">
              <MessageCircle className="mx-auto size-8 text-stone-300" />
              <p className="mt-2 font-medium">Chưa có tin nhắn nào</p>
              <p className="text-[11px]">Gửi lời chào hoặc chia sẻ khoảnh khắc đầu tiên!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.is_me;
              const hasReaction = Boolean(msg.reaction || (msg.reactions && msg.reactions.length > 0));
              const reactionEmoji = msg.reaction || msg.reactions?.[0]?.emoji;

              return (
                <div
                  key={msg.message_id || msg.client_token || idx}
                  className={`group relative flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="relative flex max-w-[80%] items-end gap-1.5">
                    {/* Reaction trigger for friend messages */}
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() =>
                          setReactingMsgId(reactingMsgId === msg.message_id ? null : msg.message_id)
                        }
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-amber-500 transition"
                        title="Thả cảm xúc"
                      >
                        <Smile className="size-4" />
                      </button>
                    )}

                    {/* Bubble */}
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                        isMe
                          ? "bg-gradient-to-r from-[#F7971E] to-[#FFD200] text-stone-900 font-medium rounded-br-xs"
                          : "bg-stone-100 text-stone-800 rounded-bl-xs border border-stone-200/40"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                      {/* Display reaction badge */}
                      {hasReaction && (
                        <span className="absolute -bottom-2.5 right-1 flex items-center rounded-full bg-white px-1.5 py-0.5 text-[11px] shadow-md border border-stone-100">
                          {reactionEmoji}
                        </span>
                      )}
                    </div>

                    {/* Delete button for own messages */}
                    {isMe && msg.message_id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.message_id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition"
                        title="Thu hồi tin nhắn"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Reaction Drawer */}
                  {reactingMsgId === msg.message_id && (
                    <div className="mt-1 flex items-center gap-1 rounded-full bg-white p-1.5 shadow-lg border border-stone-200 animate-in fade-in zoom-in duration-150 z-10">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => handleReact(msg.message_id, emoji)}
                          className="grid size-7 place-items-center rounded-full text-sm hover:scale-125 transition"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.timestamp && (
                    <span className="mt-1 text-[9px] text-stone-400 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="border-t border-stone-200/70 p-3 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập tin nhắn tới Locket..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs text-stone-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              disabled={sending}
            />

            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="grid size-10 place-items-center rounded-2xl bg-gradient-to-r from-[#F7971E] to-[#FFD200] text-stone-900 shadow-md transition disabled:opacity-40"
              title="Gửi"
            >
              {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Render Inbox List
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-stone-800">Hộp thư Locket</h3>
        <button
          type="button"
          onClick={loadInbox}
          className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
          title="Tải lại danh sách"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-xs text-stone-500">
          <LoaderCircle className="mx-auto size-7 animate-spin text-amber-500" />
          <p className="mt-3">Đang đồng bộ hộp thư đến từ Locket...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="soft-card flex flex-col items-center justify-center p-8 text-center text-stone-500">
          <MessageCircle className="size-12 text-stone-300" />
          <h4 className="mt-3 font-display text-base font-bold text-stone-700">Chưa có cuộc trò chuyện nào</h4>
          <p className="mt-1 max-w-xs text-xs text-stone-500">
            Bạn bè Locket sẽ xuất hiện ở đây khi họ gửi tin nhắn hoặc phản hồi khoảnh khắc của bạn.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const peerName = conv.peer?.name || conv.peer_uid || "Bạn bè Locket";
            const peerAvatar = conv.peer?.avatar || "";
            const latestText = conv.latest_message?.text || "Khoảnh khắc mới";
            const hasUnread = conv.unread_count > 0;

            return (
              <button
                type="button"
                key={conv.conversation_id}
                onClick={() => selectConversation(conv)}
                className="soft-card flex w-full items-center gap-3.5 p-3.5 text-left transition hover:bg-amber-50/40 active:scale-[0.99]"
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-amber-100">
                  <AvatarImage src={peerAvatar} alt={peerName} />
                  {hasUnread && (
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-bold text-stone-800">{peerName}</p>
                    {conv.latest_message?.timestamp && (
                      <span className="text-[10px] text-stone-400">
                        {new Date(conv.latest_message.timestamp).toLocaleDateString("vi-VN", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  <p className={`mt-0.5 truncate text-xs ${hasUnread ? "font-bold text-stone-900" : "text-stone-500"}`}>
                    {latestText}
                  </p>
                </div>

                {hasUnread && (
                  <span className="grid size-5 place-items-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

