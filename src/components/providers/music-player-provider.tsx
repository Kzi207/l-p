"use client";
/* eslint-disable @next/next/no-img-element */

import { Disc3, Download, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export type MusicSource = "youtube" | "soundcloud";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  url: string;
  source: MusicSource;
}

interface MusicPlayerContextValue {
  selected: MusicTrack | null;
  playing: boolean;
  playbackError: string;
  playTrack: (track: MusicTrack, queue: MusicTrack[]) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

function trackKey(track: MusicTrack) {
  return `${track.source}_${track.id}`;
}

function downloadUrl(track: MusicTrack) {
  const params = new URLSearchParams({ source: track.source, url: track.url, title: track.title });
  return `/api/music/download?${params}`;
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [selected, setSelected] = useState<MusicTrack | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const compact = pathname !== "/music";

  const selectedIndex = useMemo(() => selected ? queue.findIndex((track) => trackKey(track) === trackKey(selected)) : -1, [queue, selected]);
  const streamUrl = selected ? `/api/music/stream?source=${selected.source}&url=${encodeURIComponent(selected.url)}` : "";

  const playTrack = useCallback((track: MusicTrack, nextQueue: MusicTrack[]) => {
    setQueue(nextQueue);
    setPlaybackError("");
    setPlaying(true);
    setSelected((current) => {
      if (current && trackKey(current) === trackKey(track)) {
        window.requestAnimationFrame(() => audioRef.current?.play().catch(() => setPlaying(false)));
        return current;
      }
      return track;
    });
  }, []);

  const stepTrack = useCallback((direction: -1 | 1) => {
    if (queue.length === 0) return;
    const nextIndex = selectedIndex < 0 ? 0 : (selectedIndex + direction + queue.length) % queue.length;
    setSelected(queue[nextIndex]);
    setPlaying(true);
    setPlaybackError("");
  }, [queue, selectedIndex]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }

  useEffect(() => {
    if (selected && user) {
      document.body.classList.add("music-player-active");
      document.body.classList.toggle("music-player-compact", compact);
    } else {
      document.body.classList.remove("music-player-active", "music-player-compact");
    }
    return () => document.body.classList.remove("music-player-active", "music-player-compact");
  }, [compact, selected, user]);

  useEffect(() => {
    if (user) return;
    audioRef.current?.pause();
    setSelected(null);
    setQueue([]);
    setPlaying(false);
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;
      const audio = audioRef.current;
      if (!audio) return;
      const toggleKeys = ["Space", "KeyM", "KeyN", "KeyP", "MediaPlayPause", "MediaTrackNext", "MediaTrackPrevious"];
      if (event.repeat && toggleKeys.includes(event.code)) return;
      if (event.code === "Space" || event.code === "MediaPlayPause") {
        event.preventDefault();
        if (audio.paused) audio.play().catch(() => setPlaying(false));
        else audio.pause();
      } else if (event.code === "KeyM") {
        event.preventDefault();
        audio.muted = !audio.muted;
      } else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        const maximum = Number.isFinite(audio.duration) ? audio.duration : Number.MAX_SAFE_INTEGER;
        audio.currentTime = Math.min(maximum, Math.max(0, audio.currentTime + (event.code === "ArrowLeft" ? -5 : 5)));
      } else if (event.code === "ArrowUp" || event.code === "ArrowDown") {
        event.preventDefault();
        audio.volume = Math.min(1, Math.max(0, audio.volume + (event.code === "ArrowUp" ? 0.1 : -0.1)));
        if (audio.volume > 0) audio.muted = false;
      } else if (event.code === "KeyN" || event.code === "MediaTrackNext") {
        event.preventDefault();
        stepTrack(1);
      } else if (event.code === "KeyP" || event.code === "MediaTrackPrevious") {
        event.preventDefault();
        stepTrack(-1);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [selected, stepTrack]);

  const value = useMemo(() => ({ selected, playing, playbackError, playTrack }), [playTrack, playbackError, playing, selected]);

  return <MusicPlayerContext.Provider value={value}>
    {children}
    {user && selected && <aside className="global-music-player fixed inset-x-0 bottom-[6.7rem] z-20 px-2 sm:px-6" aria-label="Trình phát nhạc"><motion.div layout className={`${compact ? "mx-auto max-w-md rounded-[1.35rem] p-2" : "app-frame rounded-[1.6rem] p-3"} border border-white/80 bg-[#fffaf5]/95 shadow-[0_10px_35px_rgba(74,59,52,.22)] backdrop-blur-xl`}><div className="flex items-center gap-2 sm:gap-3"><Link className={`${compact ? "size-10" : "size-12"} shrink-0 overflow-hidden rounded-xl bg-[#eadbd0]`} href="/music" aria-label="Mở trang âm nhạc">{selected.thumbnail ? <img className="size-full object-cover" src={selected.thumbnail} alt="" /> : <Disc3 className={compact ? "m-2.5 size-5" : "m-3 size-6"} />}</Link><Link className="min-w-0 flex-1" href="/music"><p className="truncate text-sm font-bold">{selected.title}</p><p className="truncate text-[11px] text-[#8b756a]">{selected.artist}</p></Link>{!compact && <a className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white" href={downloadUrl(selected)} download aria-label="Tải bài đang phát" title="Tải MP3"><Download className="size-4" /></a>}{!compact && <button className="hidden size-8 place-items-center rounded-full sm:grid" type="button" onClick={() => stepTrack(-1)} aria-label="Bài trước"><SkipBack className="size-4 fill-current" /></button>}<button className={`${compact ? "size-10" : "size-11"} grid shrink-0 place-items-center rounded-full bg-blush text-cocoa shadow-soft`} type="button" onClick={togglePlayback} aria-label={playing ? "Tạm dừng" : "Phát nhạc"}>{playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}</button>{!compact && <button className="hidden size-8 place-items-center rounded-full sm:grid" type="button" onClick={() => stepTrack(1)} aria-label="Bài tiếp theo"><SkipForward className="size-4 fill-current" /></button>}</div><audio ref={audioRef} className={compact ? "hidden" : "mt-2 h-9 w-full"} key={streamUrl} src={streamUrl} controls autoPlay onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => stepTrack(1)} onError={() => { setPlaying(false); setPlaybackError("Chưa thể phát bài này. Hãy thử lại hoặc chọn bài khác."); }} />{playbackError && <p className="mt-1 text-center text-[10px] text-red-700">{playbackError}</p>}{!compact && <p className="mt-1 hidden text-center text-[10px] text-[#9a857b] sm:block"><kbd className="font-semibold">Space</kbd> phát/dừng · <kbd className="font-semibold">M</kbd> tắt âm · <kbd className="font-semibold">← →</kbd> tua 5 giây · <kbd className="font-semibold">↑ ↓</kbd> âm lượng · <kbd className="font-semibold">P/N</kbd> đổi bài</p>}</motion.div></aside>}
  </MusicPlayerContext.Provider>;
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error("useMusicPlayer must be used inside MusicPlayerProvider");
  return context;
}
