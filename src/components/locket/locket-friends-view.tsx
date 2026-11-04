"use client";

import { useState, useEffect } from "react";
import { LoaderCircle, RefreshCw, UserPlus, Users, Search } from "lucide-react";
import { getLocketFriends } from "@/lib/locket/locket-client-api";
import { AvatarImage } from "@/components/shared/avatar-image";
import { auth } from "@/lib/firebase";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function LocketFriendsView() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [addUsername, setAddUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    setLoading(true);
    setError("");
    try {
      const data = await getLocketFriends();
      setFriends(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách bạn bè.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    if (!addUsername.trim()) return;

    setAdding(true);
    setAddMessage("");
    setAddError("");

    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/locket/friends", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "send_request", username: addUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Gửi lời mời thất bại.");

      setAddMessage(`Đã gửi lời mời kết bạn tới @${addUsername.trim()}!`);
      setAddUsername("");
      loadFriends();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Không thể gửi kết bạn.");
    } finally {
      setAdding(false);
    }
  }

  const filteredFriends = friends.filter((f) => {
    const name = [f.first_name, f.last_name].filter(Boolean).join(" ") || f.name || "";
    const username = f.username || "";
    const query = searchTerm.toLowerCase();
    return name.toLowerCase().includes(query) || username.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Add Friend Form */}
      <div className="soft-card p-4 sm:p-5">
        <h4 className="flex items-center gap-2 font-display text-sm font-bold text-stone-800">
          <UserPlus className="size-4 text-amber-500" />
          Thêm bạn bè Locket bằng Username
        </h4>
        <form onSubmit={handleAddFriend} className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Nhập username Locket..."
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            className="flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={adding || !addUsername.trim()}
            className="primary-button py-2 px-4 text-xs font-bold bg-amber-400 text-stone-900 disabled:opacity-40"
          >
            {adding ? <LoaderCircle className="size-3.5 animate-spin" /> : "Kết bạn"}
          </button>
        </form>
        {addMessage && <p className="mt-2 text-xs font-semibold text-emerald-600">{addMessage}</p>}
        {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
      </div>

      {/* Friends List Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-stone-800 flex items-center gap-2">
          <Users className="size-4 text-amber-500" />
          Bạn bè trên Locket ({friends.length})
        </h3>
        <button
          type="button"
          onClick={loadFriends}
          className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
          title="Tải lại danh sách"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Search Input */}
      {friends.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-400"
          />
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-xs text-stone-500">
          <LoaderCircle className="mx-auto size-7 animate-spin text-amber-500" />
          <p className="mt-3">Đang tải danh sách bạn bè Locket...</p>
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="soft-card flex flex-col items-center justify-center p-8 text-center text-stone-500">
          <Users className="size-10 text-stone-300" />
          <h4 className="mt-2 font-display text-sm font-bold text-stone-700">Chưa tìm thấy bạn bè nào</h4>
          <p className="mt-1 text-xs text-stone-400">Hãy nhập username ở trên để gửi lời mời kết bạn!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {filteredFriends.map((f, idx) => {
            const name = [f.first_name, f.last_name].filter(Boolean).join(" ") || f.name || "Bạn bè Locket";
            const avatar = f.profile_picture_url || "";
            const username = f.username || "";

            return (
              <div
                key={f.uid || idx}
                className="soft-card flex items-center gap-3 p-3 bg-white/95 transition hover:shadow-md"
              >
                <span className="size-11 shrink-0 overflow-hidden rounded-full bg-amber-100">
                  <AvatarImage src={avatar} alt={name} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-stone-800">{name}</p>
                  <p className="truncate text-[11px] text-stone-500">{username ? `@${username}` : "Locket user"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

