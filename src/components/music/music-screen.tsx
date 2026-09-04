"use client";
/* eslint-disable @next/next/no-img-element */

import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { Disc3, Download, Headphones, Heart, LoaderCircle, Music2, Pause, Play, RefreshCw, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LoginScreen } from "@/components/auth/login-screen";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { useMusicPlayer, type MusicSource, type MusicTrack } from "@/components/providers/music-player-provider";
import { db } from "@/lib/firebase";
import type { MusicFavoriteDocument } from "@/types/firestore";

type Source = MusicSource;

interface RawTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  url: string;
}

interface Track extends RawTrack, MusicTrack {}

interface FavoriteTrack extends Track {
  favoriteId: string;
  addedBy: string;
  addedByName: string;
}

function trackKey(track: Track) {
  return `${track.source}_${track.id}`;
}

function trackDownloadUrl(track: Track) {
  const params = new URLSearchParams({ source: track.source, url: track.url, title: track.title });
  return `/api/music/download?${params}`;
}

export function MusicScreen() {
  const { user } = useAuth();
  const { couple, profile, loading: coupleLoading } = useCoupleSpace();
  const { selected, playing, playbackError, playTrack } = useMusicPlayer();
  const [source, setSource] = useState<Source>("youtube");
  const [showFavorites, setShowFavorites] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<FavoriteTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");
  const [favoriteBusy, setFavoriteBusy] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTracks() {
      setLoading(true);
      setListError("");
      try {
        const params = new URLSearchParams({ source });
        if (searchTerm) params.set("q", searchTerm);
        const response = await fetch(`/api/music?${params}`, { signal: controller.signal });
        const responseText = await response.text();
        let payload: { data?: RawTrack[]; error?: string };
        try {
          payload = JSON.parse(responseText) as { data?: RawTrack[]; error?: string };
        } catch {
          throw new Error(responseText.trimStart().startsWith("<")
            ? "Máy chủ trả về trang lỗi HTML. Hãy kiểm tra bản deploy API nhạc."
            : "Phản hồi API nhạc không đúng định dạng JSON.");
        }
        if (!response.ok || !Array.isArray(payload.data)) throw new Error(payload.error || "Không thể tải danh sách nhạc.");
        setTracks(payload.data.filter((track) => track.id && track.title && track.url).map((track) => ({ ...track, source })));
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setTracks([]);
        setListError(caught instanceof Error ? caught.message : "Không thể tải danh sách nhạc.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadTracks();
    return () => controller.abort();
  }, [reloadKey, searchTerm, source]);

  useEffect(() => {
    if (!db || !couple) {
      setFavorites([]);
      return;
    }
    return onSnapshot(collection(db, "couples", couple.id, "musicFavorites"), (snapshot) => {
      const next = snapshot.docs.map((snapshotDoc) => {
        const item = snapshotDoc.data() as MusicFavoriteDocument;
        return { favoriteId: snapshotDoc.id, id: item.trackId, title: item.title, artist: item.artist, duration: item.duration, thumbnail: item.thumbnail, url: item.url, source: item.source, addedBy: item.addedBy, addedByName: item.addedByName } satisfies FavoriteTrack;
      });
      next.sort((a, b) => a.title.localeCompare(b.title, "vi"));
      setFavorites(next);
      setFavoriteError("");
    }, () => setFavoriteError("Chưa thể mở danh sách nhạc yêu thích của hai bạn."));
  }, [couple]);

  const displayedTracks = showFavorites ? favorites : tracks;
  const favoriteIds = useMemo(() => new Set(favorites.map(trackKey)), [favorites]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = queryInput.trim();
    setShowFavorites(false);
    if (next === searchTerm) setReloadKey((value) => value + 1);
    else setSearchTerm(next);
  }

  function clearSearch() {
    setQueryInput("");
    setSearchTerm("");
    setShowFavorites(false);
  }

  function selectSource(next: Source) {
    setShowFavorites(false);
    if (next === source) return;
    setSource(next);
  }

  function selectTrack(track: Track) {
    playTrack(track, displayedTracks);
  }

  async function toggleFavorite(track: Track) {
    if (!db || !couple || !user) return;
    const id = trackKey(track).replaceAll("/", "_");
    setFavoriteBusy(id);
    setFavoriteError("");
    try {
      const favoriteRef = doc(db, "couples", couple.id, "musicFavorites", id);
      if (favoriteIds.has(trackKey(track))) await deleteDoc(favoriteRef);
      else await setDoc(favoriteRef, {
        trackId: track.id,
        source: track.source,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        thumbnail: track.thumbnail,
        url: track.url,
        addedBy: user.uid,
        addedByName: profile?.nickname || profile?.displayName || user.displayName || "Người thương",
        createdAt: serverTimestamp(),
      });
    } catch {
      setFavoriteError("Chưa thể cập nhật bài hát yêu thích. Hãy thử lại.");
    } finally {
      setFavoriteBusy("");
    }
  }

  if (!user) return <LoginScreen />;
  if (coupleLoading) return <main className="grid min-h-dvh place-items-center"><LoaderCircle className="size-8 animate-spin text-[#d17485]" /></main>;
  if (!couple) return <PairingScreen user={user} />;

  const visibleLoading = !showFavorites && loading;
  const visibleError = showFavorites ? favoriteError : listError;

  return (
    <main className={`min-h-dvh px-4 pt-7 sm:px-6 ${selected ? "pb-52" : "pb-32"}`}>
      <div className="app-frame">
        <header><p className="font-handwritten text-xl text-[#a56f78]">Giai điệu của hai mình</p><h1 className="flex items-center gap-2 font-display text-3xl font-extrabold"><Headphones className="size-7 text-[#d17485]" />Nghe nhạc</h1><p className="mt-1 text-sm text-[#8b756a]">Tìm, nghe và lưu bài hát cả hai cùng thích</p></header>

        <form className="mt-6 flex gap-2" onSubmit={submitSearch}>
          <label className="relative min-w-0 flex-1"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#ad958a]" /><input className="soft-input pl-11 pr-10" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Tìm bài hát, ca sĩ..." aria-label="Tìm bài hát" />{queryInput && <button className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full hover:bg-blush/20" type="button" onClick={clearSearch} aria-label="Xóa tìm kiếm"><X className="size-4" /></button>}</label>
          <button className="primary-button shrink-0 px-4" type="submit"><Search className="size-5" /><span className="hidden sm:inline">Tìm</span></button>
        </form>

        <div className="soft-card mt-4 grid grid-cols-3 gap-1 p-1.5">
          <button className={`min-h-11 rounded-2xl text-xs font-bold transition sm:text-sm ${!showFavorites && source === "youtube" ? "bg-[#ff8f9f] text-white shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => selectSource("youtube")}>YouTube</button>
          <button className={`min-h-11 rounded-2xl text-xs font-bold transition sm:text-sm ${!showFavorites && source === "soundcloud" ? "bg-[#f59a6c] text-white shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => selectSource("soundcloud")}>SoundCloud</button>
          <button className={`flex min-h-11 items-center justify-center gap-1 rounded-2xl text-xs font-bold transition sm:text-sm ${showFavorites ? "bg-blush/60 shadow-sm" : "text-[#8b756a]"}`} type="button" onClick={() => setShowFavorites(true)}><Heart className={`size-4 ${showFavorites ? "fill-[#d36f80] text-[#d36f80]" : ""}`} />Yêu thích</button>
        </div>

        <div className="mt-7 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#aa7a83]">{showFavorites ? "Playlist chung realtime" : searchTerm ? "Kết quả tìm kiếm" : "Dành cho hai bạn"}</p><h2 className="font-display text-2xl font-extrabold">{showFavorites ? "Bài hai mình yêu thích" : searchTerm ? `“${searchTerm}”` : "Đang thịnh hành"}</h2></div>{!visibleLoading && <span className="rounded-full bg-blush/25 px-3 py-1 text-xs font-bold">{displayedTracks.length} bài</span>}</div>
        {favoriteError && !showFavorites && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{favoriteError}</p>}
        {playbackError && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{playbackError}</p>}

        {visibleLoading ? <div className="py-24 text-center"><LoaderCircle className="mx-auto size-9 animate-spin text-[#d17485]" /><p className="mt-3 text-sm text-[#8b756a]">Đang tìm những giai điệu hay...</p></div> : visibleError ? <div className="soft-card mt-5 p-7 text-center"><p className="text-sm text-red-700">{visibleError}</p>{!showFavorites && <button className="secondary-button mt-4" type="button" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw className="size-4" />Thử lại</button>}</div> : displayedTracks.length === 0 ? <div className="soft-card mt-5 p-10 text-center">{showFavorites ? <Heart className="mx-auto size-11 text-[#d18a96]" /> : <Music2 className="mx-auto size-11 text-[#d18a96]" />}<p className="mt-3 font-bold">{showFavorites ? "Hai bạn chưa có bài hát yêu thích." : "Không tìm thấy bài hát phù hợp."}</p>{showFavorites && <p className="mt-2 text-sm text-[#8b756a]">Mở YouTube hoặc SoundCloud rồi bấm trái tim cạnh bài hát nhé.</p>}</div> : <section className="mt-4 space-y-2">{displayedTracks.map((track) => {
          const key = trackKey(track);
          const active = selected ? trackKey(selected) === key : false;
          const favorite = favoriteIds.has(key);
          const busy = favoriteBusy === key.replaceAll("/", "_");
          return <article className={`flex items-center gap-1 rounded-[1.35rem] border p-2.5 transition ${active ? "border-blush bg-blush/25 shadow-soft" : "border-white/70 bg-white/45 hover:bg-white/70"}`} key={key}><button className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]" type="button" onClick={() => selectTrack(track)}><span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-[#eadbd0]">{track.thumbnail ? <img className="size-full object-cover" src={track.thumbnail} alt="" /> : <span className="grid size-full place-items-center"><Disc3 className="size-7 text-[#c77a88]" /></span>}<span className="absolute bottom-1 right-1 grid size-7 place-items-center rounded-full bg-white/90 shadow-sm">{active && playing ? <Pause className="size-3.5 fill-[#c66f80] text-[#c66f80]" /> : <Play className="ml-0.5 size-3.5 fill-[#c66f80] text-[#c66f80]" />}</span></span><span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-bold leading-5">{track.title}</span><span className="mt-1 block truncate text-xs text-[#8b756a]">{track.artist} · {track.duration}</span>{showFavorites && <span className="mt-0.5 block truncate text-[10px] text-[#aa7a83]">Được thích bởi {(track as FavoriteTrack).addedByName}</span>}</span></button><a className="grid size-10 shrink-0 place-items-center rounded-full text-[#947f76] transition hover:bg-white active:scale-90" href={trackDownloadUrl(track)} download aria-label={`Tải xuống ${track.title}`} title="Tải MP3"><Download className="size-4" /></a><button className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-90 ${favorite ? "bg-blush/35 text-[#d15f75]" : "text-[#a9958c] hover:bg-white"}`} type="button" disabled={busy} onClick={() => toggleFavorite(track)} aria-label={favorite ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Heart className={`size-5 ${favorite ? "fill-current" : ""}`} />}</button></article>;
        })}</section>}
      </div>

      <BottomNav />
    </main>
  );
}
