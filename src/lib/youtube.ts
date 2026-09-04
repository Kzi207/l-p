import "server-only";

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable } from "node:stream";
import vm from "node:vm";
import https from "node:https";
import ffmpegPath from "ffmpeg-static";
import { Innertube, Platform, UniversalCache, YTNodes } from "youtubei.js";

// ── Interpreter shim ──────────────────────────────────────────────────────────
Platform.shim.eval = (data, env) => {
  const sandbox: Record<string, unknown> = { RegExp };
  for (const [k, v] of Object.entries(env)) sandbox[k] = v;
  return vm.runInNewContext(`(function(){\n${data.output}\n})()`, sandbox);
};

// ── Singleton with auto-reset on stale player ─────────────────────────────────
let youtubeInstance: Innertube | null = null;
let youtubePromise: Promise<Innertube> | null = null;

async function getYouTube(force = false) {
  if (force) { youtubeInstance = null; youtubePromise = null; }
  if (youtubeInstance) return youtubeInstance;
  if (!youtubePromise) {
    youtubePromise = Innertube.create({
      location: "VN",
      retrieve_player: true,
      cache: new UniversalCache(false),
    }).then((yt) => { youtubeInstance = yt; return yt; })
      .catch((err) => { youtubePromise = null; throw err; });
  }
  return youtubePromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds = 0) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
}

export function extractYouTubeVideoId(input: string) {
  const v = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  try {
    const url = new URL(v);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
      return m?.[1] || null;
    }
  } catch { return null; }
  return null;
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchYouTube(query: string) {
  const isHome = !query || query.toLowerCase() === "home";
  const searchTerm = isHome ? "Vpop Music Video Official 2026 bài hát thịnh hành" : query;
  const youtube = await getYouTube();
  const result = await youtube.search(searchTerm, { type: "video" });
  const videos = result.results.filterType(YTNodes.Video).slice(0, 20).map((v) => ({
    id: v.video_id,
    title: v.title.toString() || "YouTube Video",
    artist: v.author?.name || "YouTube",
    duration: v.duration.text || formatDuration(v.duration.seconds),
    thumbnail: v.best_thumbnail?.url || "",
    url: `https://youtu.be/${v.video_id}`,
  }));
  return {
    status: true, type: isHome ? "home" : "search",
    query: isHome ? "Bài hát đang thịnh hành (Home)" : searchTerm,
    total: videos.length, data: videos,
  };
}

// ── Stream URL via getBasicInfo (IOS client) ──────────────────────────────────

const IOS_UA = "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)";

// Bypass Next.js patched fetch() to avoid headers being stripped or modified.
function fetchNative(url: string, headers: Record<string, string>): Promise<{ body: ReadableStream<Uint8Array>; status: number; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      // Cast the native Node stream to a Web ReadableStream
      const webStream = Readable.toWeb(res) as ReadableStream<Uint8Array>;
      const responseHeaders: Record<string, string> = {};
      for (const [key, val] of Object.entries(res.headers)) {
        if (Array.isArray(val)) responseHeaders[key.toLowerCase()] = val.join(", ");
        else if (val) responseHeaders[key.toLowerCase()] = val;
      }
      resolve({ body: webStream, status: res.statusCode || 500, headers: responseHeaders });
    });
    req.on("error", reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error("Timeout fetching CDN"));
    });
  });
}

export async function getYouTubeAudioStream(
  input: string,
  range?: string,
): Promise<{ body: ReadableStream<Uint8Array>; status: number; contentType: string; contentLength: string | null; contentRange: string | null }> {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) throw new Error("Link YouTube không hợp lệ.");

  const rangeHeader = range || "bytes=0-";

  for (const force of [false, true]) {
    try {
      const youtube = await getYouTube(force);
      const info = await youtube.getBasicInfo(videoId, { client: "IOS" });
      const format = info.chooseFormat({ type: "audio", quality: "best", format: "mp4" });
      if (!format?.url) throw new Error("No audio format URL returned");

      const parsed = new URL(format.url);
      if (parsed.protocol !== "https:") throw new Error("Unsafe URL");

      console.log(`[YouTube] getBasicInfo IOS OK (force=${force}) range=${rangeHeader} — fetching CDN (Native HTTPS)...`);

      // Use native https module, bypassing Next.js global fetch
      const res = await fetchNative(format.url, {
        "User-Agent": IOS_UA,
        "Accept": "audio/*,*/*;q=0.9",
        "Range": rangeHeader,
      });

      if (res.status !== 200 && res.status !== 206) {
        if (res.status === 403 && !force) {
          console.warn(`[YouTube] CDN 403 — resetting singleton and retrying with fresh player...`);
          youtubeInstance = null; youtubePromise = null;
          continue;
        }
        throw new Error(`YouTube CDN HTTP ${res.status}`);
      }

      console.log(`[YouTube] CDN OK HTTP ${res.status} — streaming`);
      return {
        body: res.body,
        status: res.status,
        contentType: res.headers["content-type"] || "audio/mp4",
        contentLength: res.headers["content-length"] || null,
        contentRange: res.headers["content-range"] || null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[YouTube] attempt force=${force} failed: ${msg}`);
      if (force) throw err;
    }
  }

  throw new Error("Không lấy được stream YouTube sau 2 lần thử.");
}

// ── MP3 conversion (for /api/music/download) ──────────────────────────────────

export async function createYouTubeMp3Stream(input: string): Promise<{ stream: ReadableStream<Uint8Array>; process: ChildProcessWithoutNullStreams }> {
  if (!ffmpegPath) throw new Error("FFmpeg chưa có trên máy chủ.");
  
  let audioStream: import("node:stream/web").ReadableStream<Uint8Array>;
  
  try {
    const videoId = extractYouTubeVideoId(input);
    if (!videoId) throw new Error("Link YouTube không hợp lệ.");
    
    // Fetch download URL from the external API
    const apiUrl = `https://apiytb.onrender.com/api/v1/url?url=https://www.youtube.com/watch?v=${videoId}`;
    const apiRes = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
    const data = await apiRes.json();
    
    if (data?.status && data?.download?.mp4) {
      console.log(`[YouTube] API YTB returned MP4 URL, fetching...`);
      const mp4Res = await fetch(data.download.mp4, { signal: AbortSignal.timeout(60000) });
      if (!mp4Res.ok || !mp4Res.body) throw new Error("Failed to fetch MP4 stream from API");
      audioStream = mp4Res.body as import("node:stream/web").ReadableStream<Uint8Array>;
    } else {
      throw new Error("API YTB did not return valid download URL");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[YouTube] API YTB failed: ${msg}. Falling back to youtubei.js...`);
    const audio = await getYouTubeAudioStream(input);
    audioStream = audio.body as import("node:stream/web").ReadableStream<Uint8Array>;
  }

  const converter = spawn(ffmpegPath, [
    "-hide_banner", "-loglevel", "error",
    "-i", "pipe:0", "-vn", "-codec:a", "libmp3lame", "-b:a", "192k",
    "-f", "mp3", "pipe:1",
  ], { stdio: ["pipe", "pipe", "pipe"] });

  await new Promise<void>((resolve, reject) => {
    converter.once("spawn", resolve);
    converter.once("error", reject);
  });

  const inputStream = Readable.fromWeb(audioStream);
  inputStream.on("error", () => converter.kill());
  converter.stdin.on("error", () => inputStream.destroy());
  inputStream.pipe(converter.stdin);

  return {
    stream: Readable.toWeb(converter.stdout) as ReadableStream<Uint8Array>,
    process: converter,
  };
}
