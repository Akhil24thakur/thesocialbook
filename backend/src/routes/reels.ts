import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const YT_KEY = process.env.YOUTUBE_API_KEY;
const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_LIMIT = 15;
const DEFAULT_LIMIT = 10;
const SERVED_TTL_MS = 20 * 60 * 1000;

const QUERIES = [
  "shorts",
  "funny shorts",
  "comedy shorts",
  "dance",
  "street food",
  "meme",
  "prank",
  "challenge",
  "cricket",
  "motivation",
  "travel",
  "sports",
  "talent",
  "nature",
  "gaming",
];

interface YtItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

interface YtPage {
  items: YtItem[];
  nextPageToken: string | null;
}

const cache = new Map<string, { at: number; data: YtPage }>();
const inflight = new Map<string, Promise<YtPage>>();
const servedIds = new Map<string, number>();
const queryRing: string[] = [];

function pickQuery(): string {
  const fresh = QUERIES.filter((q) => !queryRing.includes(q));
  const pool = fresh.length > 0 ? fresh : QUERIES;
  const q = pool[Math.floor(Math.random() * pool.length)];
  queryRing.push(q);
  if (queryRing.length >= QUERIES.length) queryRing.shift();
  return q;
}

function pruneServed() {
  if (servedIds.size <= 250) return;
  for (const [id, at] of servedIds) {
    if (Date.now() - at > SERVED_TTL_MS) servedIds.delete(id);
  }
}

async function searchYoutube(query: string, limit: number, pageToken?: string): Promise<YtPage> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoDuration: "short",
    videoEmbeddable: "true",
    q: query,
    regionCode: "IN",
    maxResults: String(limit),
    key: YT_KEY as string,
  });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${YT_SEARCH_URL}?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: { high?: { url?: string }; default?: { url?: string } };
      };
    }>;
    nextPageToken?: string;
  };
  const items: YtItem[] = (data.items ?? [])
    .map((it) => ({
      videoId: it.id?.videoId ?? "",
      title: it.snippet?.title ?? "Untitled",
      channelTitle: it.snippet?.channelTitle ?? "",
      thumbnailUrl:
        it.snippet?.thumbnails?.high?.url ?? it.snippet?.thumbnails?.default?.url ?? null,
      publishedAt: it.snippet?.publishedAt ?? null,
    }))
    .filter((it) => !!it.videoId);
  return { items, nextPageToken: data.nextPageToken ?? null };
}

async function getPage(query: string, limit: number, pageToken?: string): Promise<YtPage> {
  if (!YT_KEY) throw new Error("Reels feed is not configured");
  const key = `${query}|${pageToken ?? "first"}|${limit}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = searchYoutube(query, limit, pageToken)
    .then((data) => {
      cache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const pageToken =
    typeof req.query.pageToken === "string" && req.query.pageToken.trim().length > 0
      ? req.query.pageToken.trim()
      : undefined;
  const query =
    typeof req.query.query === "string" && req.query.query.trim().length > 0
      ? req.query.query.trim()
      : pickQuery();
  try {
    const page = await getPage(query, limit, pageToken);
    const fresh = page.items.filter((it) => !servedIds.has(it.videoId));
    const items = fresh.length >= Math.ceil(limit / 2) ? fresh : page.items;
    for (const it of items) servedIds.set(it.videoId, Date.now());
    pruneServed();
    return res.json({ items, nextPageToken: page.nextPageToken, query });
  } catch (e: any) {
    console.error("youtube reels feed failed:", e.message ?? e);
    const configured = !!YT_KEY;
    return res.status(configured ? 502 : 503).json({
      error: configured ? "Could not load reels right now" : "Reels feed is not configured yet",
    });
  }
});

export default router;