import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const BUCKET = process.env.SUPABASE_BUCKET ?? "uploads";

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and one of: SUPABASE_SERVICE_KEY, SUPABASE_SECRET_KEY, or SUPABASE_KEY"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const reelSelect = {
  id: true,
  caption: true,
  videoUrl: true,
  externalUrl: true,
  posterUrl: true,
  shareCount: true,
  createdAt: true,
  author: {
    select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true, lastSeenAt: true },
  },
  _count: { select: { likes: true, comments: true } },
} as const;

async function serialize(reel: any, userId: number) {
  const [likedRows, followRows] = await Promise.all([
    prisma.reelLike.findMany({ where: { reelId: reel.id, userId }, select: { reelId: true } }),
    prisma.follow.findMany({ where: { followerId: userId, followingId: reel.authorId }, select: { id: true } }),
  ]);
  const likedSet = new Set(likedRows.map((l) => l.reelId));
  return {
    id: reel.id,
    caption: reel.caption,
    videoUrl: reel.videoUrl,
    externalUrl: reel.externalUrl,
    posterUrl: reel.posterUrl,
    isExternal: !!reel.externalUrl,
    shareCount: reel.shareCount,
    createdAt: reel.createdAt,
    author: reel.author,
    likeCount: reel._count.likes,
    commentCount: reel._count.comments,
    likedByMe: likedSet.has(reel.id),
    followedByMe: followRows.length > 0,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30);
  const cursor = Number(req.query.cursor) || undefined;
  const reels = await prisma.reel.findMany({
    where: cursor ? { id: { lt: cursor } } : undefined,
    select: reelSelect,
    orderBy: { id: "desc" },
    take: limit + 1,
  });
  const hasMore = reels.length > limit;
  const page = reels.slice(0, limit);
  const items = await Promise.all(page.map((r) => serialize(r, userId)));
  return res.json({
    reels: items,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});

const createReelSchema = z.object({
  caption: z.string().max(2000).optional().nullable(),
  videoUrl: z.string().url().max(1000).optional().nullable(),
  externalUrl: z.string().url().max(1000).optional().nullable(),
  posterUrl: z.string().url().max(1000).optional().nullable(),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createReelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid reel data" });
  }
  const { caption, videoUrl, externalUrl, posterUrl } = parsed.data;
  if (!videoUrl && !externalUrl) {
    return res.status(400).json({ error: "Reel needs a video or an external link" });
  }
  if (videoUrl && externalUrl) {
    return res.status(400).json({ error: "Provide either a video or an external link, not both" });
  }
  const reel = await prisma.reel.create({
    data: {
      caption: caption?.trim() ?? "",
      videoUrl: videoUrl || null,
      externalUrl: externalUrl || null,
      posterUrl: posterUrl || null,
      authorId: (req as AuthedRequest).userId,
    },
    select: reelSelect,
  });
  const item = await serialize(reel, (req as AuthedRequest).userId);
  return res.status(201).json({ reel: item });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const reelId = Number(req.params.id);
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) return res.status(404).json({ error: "Reel not found" });
  if (reel.authorId !== (req as AuthedRequest).userId) {
    return res.status(403).json({ error: "You can only delete your own reels" });
  }
  await prisma.reel.delete({ where: { id: reelId } });
  return res.json({ ok: true });
});

router.post("/:id/like", requireAuth, async (req, res) => {
  const reelId = Number(req.params.id);
  const userId = (req as AuthedRequest).userId;
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) return res.status(404).json({ error: "Reel not found" });
  const existing = await prisma.reelLike.findUnique({
    where: { userId_reelId: { userId, reelId } },
  });
  if (existing) {
    await prisma.reelLike.delete({ where: { id: existing.id } });
    return res.json({ liked: false });
  }
  await prisma.reelLike.create({ data: { userId, reelId } });
  return res.json({ liked: true });
});

router.post("/:id/share", requireAuth, async (req, res) => {
  const reelId = Number(req.params.id);
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) return res.status(404).json({ error: "Reel not found" });
  await prisma.reel.update({
    where: { id: reelId },
    data: { shareCount: { increment: 1 } },
  });
  return res.json({ ok: true });
});

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  parentId: true,
  author: {
    select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true, lastSeenAt: true },
  },
} as const;

router.get("/:id/comments", requireAuth, async (req, res) => {
  const reelId = Number(req.params.id);
  const comments = await prisma.reelComment.findMany({
    where: { reelId, parentId: null },
    select: {
      ...commentSelect,
      replies: { select: commentSelect, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return res.json({ comments });
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.number().int().positive().nullable().optional(),
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  const reelId = Number(req.params.id);
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Comment content is required (max 1000 chars)" });
  }
  const reel = await prisma.reel.findUnique({ where: { id: reelId } });
  if (!reel) return res.status(404).json({ error: "Reel not found" });
  const comment = await prisma.reelComment.create({
    data: {
      content: parsed.data.content,
      reelId,
      parentId: parsed.data.parentId ?? null,
      authorId: (req as AuthedRequest).userId,
    },
    select: commentSelect,
  });
  return res.status(201).json({ comment });
});

router.post("/upload-url", requireAuth, async (req, res) => {
  const ext = String(req.query.ext ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `reels/${(req as AuthedRequest).userId}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  try {
    const { data, error } = await supabase()
      .storage.from(BUCKET)
      .createSignedUploadUrl(filename);
    if (error) throw error;
    if (!data?.token) throw new Error("No upload token returned");
    const publicUrl = supabase().storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
    return res.json({ uploadUrl: data.signedUrl, publicUrl, token: data.token, filename });
  } catch (e: any) {
    console.error("reel upload-url failed:", e.message ?? e);
    return res.status(500).json({ error: "Could not prepare upload: " + (e.message ?? "unknown error") });
  }
});

export default router;