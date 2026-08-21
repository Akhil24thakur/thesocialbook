import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { deleteObject, isR2Url } from "../lib/storage.js";

const router = Router();

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const storySelect = {
  id: true,
  imageUrl: true,
  createdAt: true,
  musicSongId: true,
  musicSongTitle: true,
  musicSongArtist: true,
  musicAudioUrl: true,
  musicCoverUrl: true,
  musicStartTime: true,
  musicDuration: true,
  author: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true, lastSeenAt: true } },
} as const;

router.get("/", requireAuth, async (req, res) => {
  const cutoff = new Date(Date.now() - STORY_TTL_MS);
  // Fetch expired stories first to capture R2 keys before DB delete
  const expired = await prisma.story.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { imageUrl: true },
  });
  await prisma.story.deleteMany({ where: { createdAt: { lt: cutoff } } });
  // Delete corresponding R2 objects in background — only R2 URLs, never Supabase
  if (expired.length) {
    Promise.allSettled(
      expired.map((s) => (s.imageUrl && isR2Url(s.imageUrl) ? deleteObject(s.imageUrl) : Promise.resolve()))
    ).catch(() => {});
  }
  const stories = await prisma.story.findMany({
    select: storySelect,
    where: { createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return res.json({ stories });
});

const createStorySchema = z.object({
  imageUrl: z.string().url().max(1000),
  musicSongId: z.string().max(200).optional(),
  musicSongTitle: z.string().max(300).optional(),
  musicSongArtist: z.string().max(300).optional(),
  musicAudioUrl: z.string().url().max(1000).optional(),
  musicCoverUrl: z.string().url().max(1000).optional(),
  musicStartTime: z.number().min(0).max(3600).optional(),
  musicDuration: z.number().min(1).max(120).optional(),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createStorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid image URL is required" });
  }
  const hasMusic = !!(parsed.data.musicSongId && parsed.data.musicAudioUrl);
  const story = await prisma.story.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      authorId: (req as AuthedRequest).userId,
      ...(hasMusic
        ? {
            musicSongId: parsed.data.musicSongId,
            musicSongTitle: parsed.data.musicSongTitle ?? null,
            musicSongArtist: parsed.data.musicSongArtist ?? null,
            musicAudioUrl: parsed.data.musicAudioUrl,
            musicCoverUrl: parsed.data.musicCoverUrl ?? null,
            musicStartTime: parsed.data.musicStartTime ?? 0,
            musicDuration: parsed.data.musicDuration ?? 15,
          }
        : {}),
    },
    select: storySelect,
  });
  return res.status(201).json({ story });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const storyId = Number(req.params.id);
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) return res.status(404).json({ error: "Story not found" });
  if (story.authorId !== (req as AuthedRequest).userId) {
    return res.status(403).json({ error: "You can only delete your own stories" });
  }
  if (story.imageUrl && isR2Url(story.imageUrl)) {
    deleteObject(story.imageUrl).catch(() => {});
  }
  await prisma.story.delete({ where: { id: storyId } });
  return res.json({ ok: true });
});

export default router;