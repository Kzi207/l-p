import "server-only";

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable } from "node:stream";
import ffmpegPath from "ffmpeg-static";
import { Innertube, YTNodes } from "youtubei.js";

let youtubeInstance: Innertube | null = null;
let youtubePromise: Promise<Innertube> | null = null;

async function getYouTube() {
  if (youtubeInstance) return youtubeInstance;
  if (!youtubePromise) {
    youtubePromise = Innertube.create({ location: "VN", retrieve_player: true }).then((instance) => {
      youtubeInstance = instance;
      return instance;
    }).catch((error) => {
      youtubePromise = null;
      throw error;
    });
  }
  return youtubePromise;
}

function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function extractYouTubeVideoId(input: string) {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function searchYouTube(query: string) {
  const isHome = !query || query.toLowerCase() === "home";
  const searchTerm = isHome ? "Vpop Music Video Official 2026 bài hát thịnh hành" : query;
  const youtube = await getYouTube();
  const result = await youtube.search(searchTerm, { type: "video" });
  const videos = result.results.filterType(YTNodes.Video).slice(0, 20).map((video) => ({
    id: video.video_id,
    title: video.title.toString() || "YouTube Video",
    artist: video.author?.name || "YouTube",
    duration: video.duration.text || formatDuration(video.duration.seconds),
    thumbnail: video.best_thumbnail?.url || "",
    url: `https://youtu.be/${video.video_id}`,
  }));

  return {
    status: true,
    type: isHome ? "home" : "search",
    query: isHome ? "Bài hát đang thịnh hành (Home)" : searchTerm,
    total: videos.length,
    data: videos,
  };
}

async function downloadAudio(videoId: string) {
  // 1. Try Piped API instances first for better reliability and to avoid 403 blocks
  const pipedInstances = [
    "https://api.piped.projectsegfau.lt",
    "https://pipedapi.smnz.de",
    "https://pipedapi.kavin.rocks"
  ];

  for (const apiUrl of pipedInstances) {
    try {
      const res = await fetch(`${apiUrl}/streams/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.audioStreams && data.audioStreams.length > 0) {
          const bestAudio = data.audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
          const streamRes = await fetch(bestAudio.url);
          if (streamRes.ok && streamRes.body) {
            return streamRes.body;
          }
        }
      }
    } catch (pipedError) {
      console.warn(`Piped API (${apiUrl}) failed:`, pipedError instanceof Error ? pipedError.message : String(pipedError));
    }
  }

  // 2. Fallback to youtubei.js clients if Piped API fails
  const youtube = await getYouTube();
  const clients = ["IOS", "ANDROID", "WEB", "TV_EMBEDDED", "YTMUSIC", "MWEB"] as const;
  let lastError: unknown;

  for (const client of clients) {
    try {
      const stream = await youtube.download(videoId, {
        client,
        type: "audio",
        quality: "best",
        format: "mp4",
      });

      // Peek the first chunk to catch 403 Forbidden errors early
      const reader = stream.getReader();
      const { done, value } = await reader.read();
      if (done) throw new Error("Stream is empty");

      // Reconstruct the stream so FFmpeg can read from the beginning
      return new ReadableStream({
        start(controller) {
          controller.enqueue(value);
        },
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) controller.close();
            else controller.enqueue(value);
          } catch (err) {
            controller.error(err);
          }
        },
        cancel() {
          reader.cancel();
        }
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Không thể lấy audio YouTube.");
}

export async function getYouTubeAudioStream(input: string) {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) throw new Error("Link YouTube không hợp lệ.");
  return downloadAudio(videoId);
}

export async function createYouTubeMp3Stream(input: string): Promise<{ stream: ReadableStream<Uint8Array>; process: ChildProcessWithoutNullStreams }> {
  if (!ffmpegPath) throw new Error("FFmpeg chưa có trên máy chủ.");
  const source = await getYouTubeAudioStream(input);
  const converter = spawn(ffmpegPath, [
    "-hide_banner", "-loglevel", "error",
    "-i", "pipe:0",
    "-vn", "-codec:a", "libmp3lame", "-b:a", "192k",
    "-f", "mp3", "pipe:1",
  ], { stdio: ["pipe", "pipe", "pipe"] });

  await new Promise<void>((resolve, reject) => {
    converter.once("spawn", resolve);
    converter.once("error", reject);
  });

  const inputStream = Readable.fromWeb(source as import("node:stream/web").ReadableStream<Uint8Array>);
  inputStream.on("error", () => converter.kill());
  converter.stdin.on("error", () => inputStream.destroy());
  inputStream.pipe(converter.stdin);

  return {
    stream: Readable.toWeb(converter.stdout) as ReadableStream<Uint8Array>,
    process: converter,
  };
}
