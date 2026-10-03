const clientIds = [
  "tNiXK56A9yLDayzQ5DsBvqwiyhRLZZNv",
  "tNiXK56A9yLDayzQ5DsBvqwiyhRLZZNv",
];

interface SoundCloudTrack {
  id: number | string;
  title?: string;
  duration?: number;
  permalink_url?: string;
  artwork_url?: string;
  user?: { username?: string; avatar_url?: string };
  media?: {
    transcodings?: Array<{
      url?: string;
      format?: { protocol?: string; mime_type?: string };
    }>;
  };
}

function soundCloudUrl(path: string, clientId: string) {
  const url = new URL(path, "https://api-v2.soundcloud.com");
  url.searchParams.set("client_id", clientId);
  return url;
}

async function fetchSoundCloudJson<T>(url: URL, timeout = 30_000): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`SoundCloud HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchWithFallback<T>(
  buildUrl: (clientId: string) => URL,
  timeout?: number
): Promise<T> {
  let lastError: unknown;
  for (const clientId of clientIds) {
    try {
      return await fetchSoundCloudJson<T>(buildUrl(clientId), timeout);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function formatDuration(milliseconds = 0) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function searchSoundCloud(query: string) {
  const isHome = !query || query.toLowerCase() === "home";
  const searchTerm = isHome ? "nhạc trẻ thịnh hành" : query;
  const result = await fetchWithFallback<{ collection?: SoundCloudTrack[] }>((clientId) => {
    const url = soundCloudUrl("/search/tracks", clientId);
    url.searchParams.set("q", searchTerm);
    url.searchParams.set("limit", "20");
    return url;
  });
  const tracks = (result.collection || []).filter((track) => track.permalink_url).map((track) => ({
    id: String(track.id),
    title: track.title || "SoundCloud Track",
    artist: track.user?.username || "SoundCloud",
    duration: formatDuration(track.duration),
    thumbnail: track.artwork_url || track.user?.avatar_url || "",
    url: track.permalink_url || "",
  }));

  return {
    status: true,
    type: isHome ? "home" : "search",
    query: isHome ? "Bài hát đang thịnh hành 2026  (trường an,dalu, gia pon, pon pon,leoleo,HL) (Home)" : searchTerm,
    total: tracks.length,
    data: tracks,
  };
}

async function resolveTrack(input: string) {
  const numericId = /^\d+$/.test(input.trim());
  return fetchWithFallback<SoundCloudTrack>((clientId) => {
    const url = numericId
      ? soundCloudUrl(`/tracks/${input.trim()}`, clientId)
      : soundCloudUrl("/resolve", clientId);
    if (!numericId) url.searchParams.set("url", input.trim());
    return url;
  });
}

export async function resolveSoundCloudAudio(input: string) {
  const track = await resolveTrack(input);
  const transcodings = track.media?.transcodings || [];
  const progressive = transcodings.find((item) => item.format?.protocol === "progressive");
  const selected = progressive || transcodings.find((item) => item.url);
  if (!selected?.url) throw new Error("SoundCloud track has no playable transcoding");

  const result = await fetchWithFallback<{ url?: string }>((clientId) => {
    const url = new URL(selected.url!);
    url.searchParams.set("client_id", clientId);
    return url;
  }, 45_000);
  if (!result.url) throw new Error("SoundCloud did not return an audio URL");
  const audioUrl = new URL(result.url);
  if (audioUrl.protocol !== "https:") throw new Error("SoundCloud returned an unsafe audio URL");

  return {
    url: audioUrl,
    title: track.title || "soundcloud-track",
    mimeType: selected.format?.mime_type || "audio/mpeg",
  };
}

/** Resolve a SoundCloud URL or numeric ID and return track metadata (without resolving audio stream). */
export async function resolveSoundCloudTrackInfo(input: string) {
  const track = await resolveTrack(input);
  return {
    id: String(track.id),
    title: track.title || "SoundCloud Track",
    artist: track.user?.username || "SoundCloud",
    duration: formatDuration(track.duration),
    thumbnail: track.artwork_url || track.user?.avatar_url || "",
    url: track.permalink_url || input,
  };
}
