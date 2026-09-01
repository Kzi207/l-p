"use client";
/* eslint-disable @next/next/no-img-element */

import { signOut, type User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Check, Clock3, Copy, HeartHandshake, Link2, LoaderCircle, LogOut, Send, UserRound, UsersRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { auth, db } from "@/lib/firebase";
import type { PairInviteDocument } from "@/types/firestore";

type Invite = PairInviteDocument & { id: string };
type PersonalTab = "profile" | "invite" | "pending";

export function PairingScreen({ user, openPersonalInitially = false }: { user: User; openPersonalInitially?: boolean }) {
  const { profile, loading, error: profileError } = useCoupleSpace();
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [targetUid, setTargetUid] = useState("");
  const [incoming, setIncoming] = useState<Invite[]>([]);
  const [outgoing, setOutgoing] = useState<Invite[]>([]);
  const [linkInvite, setLinkInvite] = useState<Invite | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [personalOpen, setPersonalOpen] = useState(openPersonalInitially);
  const [activeTab, setActiveTab] = useState<PersonalTab>("profile");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || "");
    setNickname(profile.nickname || "");
    setBirthday(profile.birthday || "");
    setBio(profile.bio || "");
    setPhotoURL(profile.photoURL || "");
  }, [profile]);

  useEffect(() => {
    if (!db) return;
    const inviteQuery = query(collection(db, "pairInvites"), where("targetUid", "==", user.uid));
    return onSnapshot(inviteQuery, (snapshot) => {
      setIncoming(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Invite).filter((item) => item.status === "active"));
    });
  }, [user.uid]);

  useEffect(() => {
    if (!db) return;
    const inviteQuery = query(collection(db, "pairInvites"), where("ownerId", "==", user.uid));
    return onSnapshot(inviteQuery, (snapshot) => {
      setOutgoing(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Invite).filter((item) => item.status === "active"));
    });
  }, [user.uid]);

  useEffect(() => {
    if (!db) return;
    const inviteId = new URLSearchParams(window.location.search).get("invite");
    if (!inviteId) return;
    getDoc(doc(db, "pairInvites", inviteId)).then((snapshot) => {
      if (snapshot.exists()) {
        setLinkInvite({ id: snapshot.id, ...snapshot.data() } as Invite);
        setActiveTab("pending");
        setPersonalOpen(true);
      }
    }).catch(() => setError("Link mời không hợp lệ hoặc đã hết hiệu lực."));
  }, []);

  const invitations = useMemo(() => {
    const all = linkInvite ? [linkInvite, ...incoming] : incoming;
    return Array.from(new Map(all.filter((item) => item.status === "active").map((item) => [item.id, item])).values());
  }, [incoming, linkInvite]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    setBusy("profile");
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
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
      setBusy("");
    }
  }

  async function createInvite(target = "") {
    if (!db || !profile) return;
    const cleanTarget = target.trim();
    if (cleanTarget === user.uid) {
      setError("Bạn không thể tự ghép đôi với chính mình.");
      return;
    }
    setBusy(target ? "uid" : "link");
    setError("");
    try {
      const invitation = await addDoc(collection(db, "pairInvites"), {
        ownerId: user.uid,
        ownerName: profile.nickname || profile.displayName,
        targetUid: cleanTarget,
        status: "active",
        createdAt: serverTimestamp(),
      });
      const link = `${window.location.origin}/?invite=${invitation.id}`;
      setShareLink(link);
      setTargetUid("");
      setMessage(cleanTarget ? "Đã gửi lời mời tới UID này." : "Đã tạo link ghép đôi.");
      if (cleanTarget) setActiveTab("pending");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể tạo lời mời.");
    } finally {
      setBusy("");
    }
  }

  async function acceptInvite(invite: Invite) {
    if (!db) return;
    const database = db;
    setBusy(invite.id);
    setError("");
    try {
      const coupleRef = doc(collection(database, "couples"));
      await runTransaction(database, async (transaction) => {
        const inviteRef = doc(database, "pairInvites", invite.id);
        const ownerRef = doc(database, "users", invite.ownerId);
        const selfRef = doc(database, "users", user.uid);
        const [inviteSnapshot, selfSnapshot] = await Promise.all([
          transaction.get(inviteRef), transaction.get(selfRef),
        ]);
        const currentInvite = inviteSnapshot.data() as PairInviteDocument | undefined;
        if (!currentInvite || currentInvite.status !== "active") throw new Error("Lời mời không còn hiệu lực.");
        if (currentInvite.ownerId === user.uid) throw new Error("Hãy gửi link này cho người thương của bạn.");
        if (currentInvite.targetUid && currentInvite.targetUid !== user.uid) throw new Error("Lời mời này dành cho tài khoản khác.");
        if (selfSnapshot.data()?.coupleId) throw new Error("Bạn đã ghép đôi.");

        transaction.set(coupleRef, {
          memberIds: [currentInvite.ownerId, user.uid],
          startDate: null,
          createdAt: serverTimestamp(),
          inviteId: invite.id,
        });
        transaction.update(ownerRef, { coupleId: coupleRef.id });
        transaction.update(selfRef, { coupleId: coupleRef.id });
        transaction.update(inviteRef, { status: "accepted", acceptedBy: user.uid, coupleId: coupleRef.id });
      });
      window.history.replaceState({}, "", "/");
      setMessage("Ghép đôi thành công!");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể ghép đôi.");
    } finally {
      setBusy("");
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Đã sao chép.");
  }

  async function cancelInvite(inviteId: string) {
    if (!db) return;
    setBusy(`cancel-${inviteId}`);
    setError("");
    try {
      await deleteDoc(doc(db, "pairInvites", inviteId));
      setMessage("Đã hủy lời mời.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể hủy lời mời.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <main className="grid min-h-dvh place-items-center"><LoaderCircle className="size-8 animate-spin text-[#d17485]" /></main>;

  return (
    <main className="min-h-dvh px-4 py-7 sm:px-6">
      <div className="app-frame">
        <header className="flex items-center justify-between gap-3">
          <div><p className="font-handwritten text-xl text-[#a56f78]">Không gian chỉ của hai người</p><h1 className="font-display text-3xl font-extrabold">Love Days</h1></div>
          <div className="flex gap-2"><button className="primary-button px-3" type="button" onClick={() => setPersonalOpen(true)}><UserRound className="size-4" />Cá nhân</button><button className="secondary-button px-3" type="button" onClick={() => auth && signOut(auth)} aria-label="Đăng xuất"><LogOut className="size-4" /><span className="hidden sm:inline">Thoát</span></button></div>
        </header>

        <section className="soft-card mt-8 flex min-h-[28rem] flex-col items-center justify-center px-6 text-center"><span className="grid size-24 place-items-center overflow-hidden rounded-full bg-blush/30 shadow-insetSoft">{photoURL ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="size-full object-cover" src={photoURL} alt="" /></> : <UserRound className="size-10 text-[#ce7787]" />}</span><p className="mt-5 font-handwritten text-2xl text-[#a56f78]">Chào {nickname || displayName || "bạn"}</p><h2 className="font-display text-3xl font-extrabold">Bạn chưa ghép đôi</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#806e65]">Mở mục Cá nhân để đặt thông tin, gửi lời mời cho bạn đời hoặc kiểm tra lời mời đang chờ.</p><button className="primary-button mt-6" type="button" onClick={() => { setActiveTab(invitations.length ? "pending" : "invite"); setPersonalOpen(true); }}><HeartHandshake className="size-5" />{invitations.length ? `Bạn có ${invitations.length} lời mời` : "Mời bạn đời"}</button></section>

        {personalOpen && <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#3f302a]/45 p-3 backdrop-blur-md sm:items-center" role="dialog" aria-modal="true" aria-labelledby="personal-title" onMouseDown={(event) => event.target === event.currentTarget && setPersonalOpen(false)}><section className="safe-bottom my-auto max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#fff8f0] p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between"><div><p className="font-handwritten text-xl text-[#a56f78]">Góc riêng của bạn</p><h2 id="personal-title" className="font-display text-2xl font-bold">Cá nhân</h2></div><button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" type="button" onClick={() => setPersonalOpen(false)} aria-label="Đóng"><X className="size-5" /></button></div>

        <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-[#f1e4da] p-1"><button className={`min-h-12 rounded-xl px-2 text-xs font-bold ${activeTab === "profile" ? "bg-white shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => setActiveTab("profile")}><UserRound className="mx-auto mb-0.5 size-4" />Thông tin</button><button className={`min-h-12 rounded-xl px-2 text-xs font-bold ${activeTab === "invite" ? "bg-white shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => setActiveTab("invite")}><Send className="mx-auto mb-0.5 size-4" />Mời bạn đời</button><button className={`relative min-h-12 rounded-xl px-2 text-xs font-bold ${activeTab === "pending" ? "bg-white shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => setActiveTab("pending")}><Clock3 className="mx-auto mb-0.5 size-4" />Đang chờ{invitations.length > 0 && <span className="absolute right-2 top-1 grid size-5 place-items-center rounded-full bg-[#d66f82] text-[10px] text-white">{invitations.length}</span>}</button></div>

        {(error || profileError) && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error || profileError}</p>}
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

        <div className="mt-5">
          <form className={activeTab === "profile" ? "block" : "hidden"} onSubmit={saveProfile}>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><UserRound className="size-5 text-[#cf7485]" />Thông tin của bạn</h2>
            <p className="mt-1 text-xs text-[#8b756a]">Bạn tự đặt thông tin này và chỉ người đã ghép đôi mới xem được.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold">Tên hiển thị<input className="soft-input mt-1.5" required maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
              <label className="block text-sm font-semibold">Tên gọi thân mật<input className="soft-input mt-1.5" maxLength={30} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
              <label className="block text-sm font-semibold">Ngày sinh<input className="soft-input mt-1.5" type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
              <label className="block text-sm font-semibold">Giới thiệu<textarea className="soft-input mt-1.5 min-h-20 resize-none" maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} /></label>
              <label className="block text-sm font-semibold">Link ảnh đại diện<input className="soft-input mt-1.5" type="url" value={photoURL} onChange={(event) => setPhotoURL(event.target.value)} /></label>
            </div>
            <button className="primary-button mt-4 w-full" disabled={busy === "profile"} type="submit">{busy === "profile" ? <LoaderCircle className="size-5 animate-spin" /> : <Check className="size-5" />}Lưu hồ sơ</button>
          </form>

          <section className="space-y-5">
            {activeTab === "invite" && <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold"><UsersRound className="size-5 text-[#cf7485]" />Ghép với người thương</h2>
              <div className="mt-4 rounded-2xl bg-white/65 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b7780]">UID của bạn</p>
                <div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{user.uid}</code><button className="grid size-9 shrink-0 place-items-center rounded-xl bg-blush/35" type="button" onClick={() => copy(user.uid)} aria-label="Sao chép UID"><Copy className="size-4" /></button></div>
              </div>
              <button className="primary-button mt-4 w-full" type="button" disabled={busy === "link"} onClick={() => createInvite()}>{busy === "link" ? <LoaderCircle className="size-5 animate-spin" /> : <Link2 className="size-5" />}Tạo link chia sẻ</button>
              {shareLink && <div className="mt-3 flex gap-2"><input className="soft-input min-w-0 text-xs" readOnly value={shareLink} /><button className="secondary-button shrink-0 px-3" type="button" onClick={() => copy(shareLink)}><Copy className="size-4" /></button></div>}

              <div className="my-4 flex items-center gap-3 text-xs text-[#9b857b]"><span className="h-px flex-1 bg-[#e5d5cb]" />hoặc nhập UID<span className="h-px flex-1 bg-[#e5d5cb]" /></div>
              <div className="flex gap-2"><input className="soft-input min-w-0" value={targetUid} onChange={(event) => setTargetUid(event.target.value)} placeholder="UID người thương" /><button className="secondary-button shrink-0 px-3" type="button" disabled={!targetUid.trim() || busy === "uid"} onClick={() => createInvite(targetUid)}>{busy === "uid" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}</button></div>
            </div>}

            {activeTab === "pending" && <div><h2 className="font-display text-xl font-bold">Lời mời đang chờ</h2>{invitations.length === 0 && outgoing.length === 0 ? <div className="mt-4 rounded-2xl bg-white/60 p-7 text-center"><Clock3 className="mx-auto size-9 text-[#d18a96]" /><p className="mt-3 text-sm text-[#806e65]">Chưa có lời mời nào đang chờ.</p></div> : <div className="mt-3 space-y-3">{invitations.map((invite) => <div className="rounded-2xl bg-white/65 p-4" key={invite.id}><p className="text-[10px] font-bold uppercase tracking-wider text-[#a16f78]">Lời mời nhận được</p><p className="mt-1 text-sm"><b>{invite.ownerName}</b> muốn ghép đôi với bạn.</p><button className="primary-button mt-3 w-full" type="button" disabled={busy === invite.id} onClick={() => acceptInvite(invite)}><HeartHandshake className="size-5" />{busy === invite.id ? "Đang ghép đôi..." : "Chấp nhận"}</button></div>)}{outgoing.map((invite) => <div className="rounded-2xl bg-white/65 p-4" key={invite.id}><p className="text-[10px] font-bold uppercase tracking-wider text-[#a16f78]">Đang đợi đồng ý</p><p className="mt-1 text-sm">{invite.targetUid ? <>Đã gửi tới UID <code className="break-all text-xs">{invite.targetUid}</code>.</> : "Link ghép đôi đang chờ người thương mở và chấp nhận."}</p><div className="mt-3 flex gap-2"><button className="secondary-button flex-1" type="button" onClick={() => copy(`${window.location.origin}/?invite=${invite.id}`)}><Copy className="size-4" />Sao chép link</button><button className="secondary-button text-red-700" type="button" disabled={busy === `cancel-${invite.id}`} onClick={() => cancelInvite(invite.id)}>Hủy</button></div></div>)}</div>}</div>}
          </section>
        </div>
        </section></div>}
      </div>
    </main>
  );
}
