export type StoryMusic = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
};

export type StoryMusicSelection = {
  song: StoryMusic;
  startTime: number;
  duration: number;
};

const PLAYLIST_API_URL = "https://playsongs-six.vercel.app/api/songs";
const PLAYLIST_JSON_URL = "https://playsongs-six.vercel.app/songs.json";
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

let cache: { songs: StoryMusic[]; fetchedAt: number } | null = null;
let inflight: Promise<StoryMusic[]> | null = null;

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toAbsUrl(rel: string): string {
  return "https://playsongs-six.vercel.app/" + rel.split("/").map(encodeURIComponent).join("/");
}

function normalize(raw: Array<{ title?: string; artist?: string; src?: string; cover?: string; id?: string; audioUrl?: string; coverUrl?: string }>): StoryMusic[] {
  const used = new Set<string>();
  const out: StoryMusic[] = [];
  for (const r of raw) {
    if (!r || !r.title) continue;
    const src = r.src ?? r.audioUrl ?? "";
    let id = r.id ?? (src ? slugify(src) : slugify(r.title));
    if (!id || used.has(id)) {
      id = (src ? slugify(src) : slugify(r.title)) + "-" + Math.abs(hashCode(src || r.title)).toString(36).slice(0, 6);
    }
    used.add(id);
    out.push({
      id,
      title: r.title,
      artist: r.artist || "Akhil",
      audioUrl: r.audioUrl ?? (r.src ? toAbsUrl(r.src) : ""),
      coverUrl: r.coverUrl ?? (r.cover ? toAbsUrl(r.cover) : ""),
    });
  }
  return out;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMusicCatalog(): Promise<StoryMusic[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.songs;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetchWithTimeout(PLAYLIST_API_URL);
      if (res.ok) {
        const data = (await res.json()) as Array<{ id?: string; title?: string; artist?: string; audioUrl?: string; coverUrl?: string }>;
        const songs = normalize(data);
        if (songs.length) {
          cache = { songs, fetchedAt: Date.now() };
          return songs;
        }
      }
    } catch {}
    try {
      const res = await fetchWithTimeout(PLAYLIST_JSON_URL);
      if (!res.ok) return [];
      const data = (await res.json()) as Array<{ title?: string; artist?: string; src?: string; cover?: string }>;
      const songs = normalize(data);
      if (songs.length) cache = { songs, fetchedAt: Date.now() };
      return songs;
    } catch {
      return [];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function searchMusic(songs: StoryMusic[], query: string): StoryMusic[] {
  const q = query.trim().toLowerCase();
  if (!q) return songs;
  return songs.filter(
    (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
  );
}

export const DEFAULT_MUSIC_CLIP_SECONDS = 15;