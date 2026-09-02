"use client";
/* eslint-disable @next/next/no-img-element */

import { signOut } from "firebase/auth";
import { doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { Bell, Check, Copy, Heart, LoaderCircle, LogOut, Unlink, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { LoginScreen } from "@/components/auth/login-screen";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { registerForPushNotifications } from "@/lib/fcm";
import { auth, db } from "@/lib/firebase";

export function ProfileScreen() {
  const { user } = useAuth();
  const { profile, partner, couple, loading, error: profileError } = useCoupleSpace();
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPartner, setChangingPartner] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<"idle" | "loading" | "granted" | "denied" | "unsupported">("idle");
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || "");
    setNickname(profile.nickname || "");
    setBirthday(profile.birthday || "");
    setBio(profile.bio || "");
    setPhotoURL(profile.photoURL || "");
  }, [profile]);

  useEffect(() => {
    if (typeof Notification === "undefined") setNotificationStatus("unsupported");
    else if (Notification.permission === "granted") setNotificationStatus("granted");
    else if (Notification.permission === "denied") setNotificationStatus("denied");
  }, []);

  if (!user) return <LoginScreen />;
  if (loading) return <main className="grid min-h-dvh place-items-center"><LoaderCircle className="size-8 animate-spin text-[#d17485]" /></main>;
  if (!couple) return <PairingScreen user={user} openPersonalInitially />;
  const userId = user.uid;
  const currentCouple = couple;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateDoc(doc(db, "users", userId), {
        displayName: displayName.trim(),
        nickname: nickname.trim(),
        birthday,
        bio: bio.trim(),
        photoURL: photoURL.trim(),
      });
      setMessage("Đã lưu thông tin cá nhân.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể lưu hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  async function copyUid() {
    await navigator.clipboard.writeText(userId);
    setMessage("Đã sao chép UID.");
  }

  async function enableNotifications() {
    setNotificationStatus("loading");
    setNotificationError("");
    try {
      setNotificationStatus(await registerForPushNotifications(userId));
    } catch (caught) {
      setNotificationStatus("idle");
      setNotificationError(caught instanceof Error ? caught.message : "Chưa thể bật thông báo. Hãy thử lại.");
    }
  }

  async function changePartner() {
    if (!db || !partner) return;
    const confirmed = window.confirm(
      `Bạn chắc chắn muốn ngừng ghép đôi với ${partner.nickname || partner.displayName}?\n\nCả hai sẽ được ngắt kết nối. Kỷ niệm cũ vẫn được giữ riêng tư nhưng sẽ không thể mở lại trong ứng dụng.`,
    );
    if (!confirmed) return;

    const partnerId = currentCouple.memberIds.find((memberId) => memberId !== userId);
    if (!partnerId) {
      setError("Không tìm thấy tài khoản người đang ghép đôi.");
      return;
    }

    setChangingPartner(true);
    setError("");
    setMessage("");
    try {
      const database = db;
      await runTransaction(database, async (transaction) => {
        const coupleRef = doc(database, "couples", currentCouple.id);
        const selfRef = doc(database, "users", userId);
        const partnerRef = doc(database, "users", partnerId);
        const [coupleSnapshot, selfSnapshot, partnerSnapshot] = await Promise.all([
          transaction.get(coupleRef),
          transaction.get(selfRef),
          transaction.get(partnerRef),
        ]);

        if (!coupleSnapshot.exists()) throw new Error("Không tìm thấy liên kết ghép đôi.");
        if (selfSnapshot.data()?.coupleId !== currentCouple.id || partnerSnapshot.data()?.coupleId !== currentCouple.id) {
          throw new Error("Thông tin ghép đôi đã thay đổi. Hãy tải lại trang.");
        }

        transaction.update(selfRef, { coupleId: null });
        transaction.update(partnerRef, { coupleId: null });
        transaction.update(coupleRef, { endedAt: serverTimestamp() });
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể đổi người ghép đôi.");
      setChangingPartner(false);
    }
  }

  return (
    <main className="min-h-dvh px-4 pb-28 pt-7 sm:px-6">
      <div className="app-frame">
        <header className="flex items-center justify-between gap-3">
          <div><p className="font-handwritten text-xl text-[#a56f78]">Góc riêng của bạn</p><h1 className="font-display text-3xl font-extrabold">Cá nhân</h1></div>
          <button className="secondary-button px-3" type="button" onClick={() => auth && signOut(auth)}><LogOut className="size-4" />Đăng xuất</button>
        </header>

        {partner && <section className="soft-card mt-6 p-4">
          <div className="flex items-center gap-4">
            {partner.photoURL ? <span className="size-14 shrink-0 overflow-hidden rounded-full"><img className="size-full object-cover" src={partner.photoURL} alt="Ảnh người thương" /></span> : <span className="grid size-14 shrink-0 place-items-center rounded-full bg-blush/30"><Heart className="size-6 text-[#cc7484]" /></span>}
            <div className="min-w-0"><p className="text-xs text-[#98757c]">Đã ghép đôi với</p><p className="truncate font-display text-xl font-bold">{partner.nickname || partner.displayName}</p>{partner.bio && <p className="mt-0.5 line-clamp-2 text-xs text-[#806e65]">{partner.bio}</p>}</div>
          </div>
          <button className="secondary-button mt-4 w-full text-red-700" type="button" disabled={changingPartner} onClick={changePartner}>{changingPartner ? <LoaderCircle className="size-4 animate-spin" /> : <Unlink className="size-4" />}{changingPartner ? "Đang ngắt kết nối..." : "Đổi người ghép đôi"}</button>
        </section>}

        <form className="soft-card mt-5 p-5 sm:p-6" onSubmit={saveProfile}>
          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-blush/30">{photoURL ? <img className="size-full object-cover" src={photoURL} alt="Ảnh đại diện" /> : <UserRound className="size-6 text-[#ce7787]" />}</span>
            <div><h2 className="font-display text-xl font-bold">Thông tin của tôi</h2><p className="text-xs text-[#8b756a]">Chỉ bạn và người đã ghép đôi mới xem được.</p></div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold">Tên hiển thị<input className="soft-input mt-1.5" required maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Tên gọi thân mật<input className="soft-input mt-1.5" maxLength={30} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Ngày sinh<input className="soft-input mt-1.5" type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Giới thiệu<textarea className="soft-input mt-1.5 min-h-20 resize-none" maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} /></label>
            <label className="block text-sm font-semibold">Link ảnh đại diện<input className="soft-input mt-1.5" type="url" value={photoURL} onChange={(event) => setPhotoURL(event.target.value)} /></label>
          </div>

          {(error || profileError) && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error || profileError}</p>}
          {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <button className="primary-button mt-5 w-full" disabled={saving} type="submit">{saving ? <LoaderCircle className="size-5 animate-spin" /> : <Check className="size-5" />}{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button>
        </form>

        <section className="soft-card mt-5 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9b7780]">UID của bạn</p>
          <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{userId}</code><button className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush/35" type="button" onClick={copyUid} aria-label="Sao chép UID"><Copy className="size-4" /></button></div>
          <button className="secondary-button mt-4 w-full" type="button" disabled={notificationStatus === "loading" || notificationStatus === "granted"} onClick={enableNotifications}><Bell className="size-4" />{notificationStatus === "granted" ? "Đã bật thông báo" : notificationStatus === "loading" ? "Đang bật..." : "Bật thông báo ảnh và tin nhắn"}</button>
          {(notificationStatus === "denied" || notificationStatus === "unsupported") && <p className="mt-2 text-xs text-red-700">Trình duyệt chưa cho phép hoặc không hỗ trợ thông báo.</p>}
          {notificationError && <p className="mt-2 text-xs text-red-700">{notificationError}</p>}
        </section>

        <section className="soft-card mt-5 p-5 text-center">
          <button className="secondary-button w-full justify-center text-red-700 hover:bg-red-50" type="button" onClick={() => auth && signOut(auth)}>
            <LogOut className="size-4" />
            Đăng xuất khỏi tài khoản
          </button>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
