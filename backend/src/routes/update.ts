import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const REPO = "Akhil24thakur/thesocialbook";
const GH_BASE = "https://api.github.com/repos";

const BETA_USER_IDS = (process.env.BETA_USER_IDS ?? "")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);

interface GhAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GhRelease {
  tag_name: string;
  body: string | null;
  assets: GhAsset[];
}

let ghCache: {
  at: number;
  latest: GhRelease | null;
  newestWithAsset: GhRelease | null;
} | null = null;

const ghHeaders = {
  "User-Agent": "thesocialbook-api",
  Accept: "application/vnd.github+json",
};

async function getGh() {
  if (ghCache && Date.now() - ghCache.at < 120_000) return ghCache;
  const [latest, all] = await Promise.all([
    (async () => {
      try {
        const r = await fetch(`${GH_BASE}/${REPO}/releases/latest`, { headers: ghHeaders });
        if (!r.ok) return null;
        return (await r.json()) as GhRelease;
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        const r = await fetch(`${GH_BASE}/${REPO}/releases?per_page=50`, { headers: ghHeaders });
        if (!r.ok) return [];
        return (await r.json()) as GhRelease[];
      } catch {
        return [];
      }
    })(),
  ]);
  const newestWithAsset =
    (all ?? []).find((rel) => rel.assets?.some((a) => a.name.endsWith(".apk"))) ?? null;
  ghCache = { at: Date.now(), latest, newestWithAsset };
  return ghCache;
}

router.get("/update-info", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const isBeta = BETA_USER_IDS.length === 0 || BETA_USER_IDS.includes(userId);
  const { latest, newestWithAsset } = await getGh();
  const release = isBeta ? newestWithAsset : latest;
  const apk = release?.assets?.find((a) => a.name.endsWith(".apk"));
  if (!release || !apk) {
    return res.json({ update: null });
  }
  return res.json({
    update: {
      version: String(release.tag_name).replace(/^v/, ""),
      notes: String(release.body ?? ""),
      apkUrl: apk.browser_download_url,
      apkSize: apk.size,
      channel: isBeta ? "beta" : "stable",
    },
  });
});

export default router;