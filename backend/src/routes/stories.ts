import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const storySelect = {
  id: true,
  imageUrl: true,
  createdAt: true,
  author: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true, lastSeenAt: true } },
} as const;

router.get("/", requireAuth, async (req, res) => {
  const cutoff = new Date(Date.now() - STORY_TTL_MS);
  await prisma.story.deleteMany({ where: { createdAt: { lt: cutoff } } });
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
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createStorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid image URL is required" });
  }
  const story = await prisma.story.create({
    data: { imageUrl: parsed.data.imageUrl, authorId: (req as AuthedRequest).userId },
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
  await prisma.story.delete({ where: { id: storyId } });
  return res.json({ ok: true });
});

export default router;