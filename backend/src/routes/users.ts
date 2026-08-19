import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { notify } from "../lib/notify.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const publicSelect = {
  id: true,
  name: true,
  username: true,
  bio: true,
  avatarUrl: true,
  isVerified: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

function serialize(user: any) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    postCount: user._count.posts,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    followedByMe: user.followers.length > 0,
  };
}

export const meVersionHandler = async (req: Request, res: Response) => {
  const version = String(req.body?.version ?? "").trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return res.status(400).json({ error: "Invalid version format" });
  }
  await prisma.user.update({
    where: { id: (req as AuthedRequest).userId },
    data: { appVersion: version },
  });
  return res.json({ ok: true });
};

export const mePublicKeyHandler = async (req: Request, res: Response) => {
  const publicKey = String(req.body?.publicKey ?? "").trim();
  if (!publicKey || publicKey.length > 200) {
    return res.status(400).json({ error: "Invalid public key" });
  }
  await prisma.user.update({
    where: { id: (req as AuthedRequest).userId },
    data: { publicKey },
  });
  return res.json({ ok: true });
};

router.put("/me/public-key", requireAuth, mePublicKeyHandler);

router.put("/me/version", requireAuth, meVersionHandler);

router.get("/search", requireAuth, async (req, res) => {
  const me = (req as AuthedRequest).userId;
  const { q } = req.query;
  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return res.status(400).json({ error: "Search query required" });
  }
  const searchLower = q.trim().toLowerCase();
  const isNumericId = /^\d+$/.test(searchLower);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1), 50);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { startsWith: searchLower, mode: "insensitive" } },
        { name: { startsWith: searchLower, mode: "insensitive" } },
        { username: { contains: searchLower, mode: "insensitive" } },
        { name: { contains: searchLower, mode: "insensitive" } },
        ...(isNumericId ? [{ id: parseInt(searchLower, 10) }] : []),
      ],
    },
    select: {
      ...publicSelect,
      followers: { select: { id: true }, where: { followerId: me } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
    take: 50,
  });

  const rank = (u: (typeof users)[number]): number => {
    const uname = (u.username ?? "").toLowerCase();
    const name = (u.name ?? "").toLowerCase();
    if (uname === searchLower) return 0;
    if (name === searchLower) return 1;
    if (uname.startsWith(searchLower)) return 2;
    if (name.startsWith(searchLower)) return 3;
    if (uname.includes(searchLower)) return 4;
    if (name.includes(searchLower)) return 5;
    return 6;
  };

  users.sort((a, b) => rank(a) - rank(b) || b._count.followers - a._count.followers);
  return res.json({ users: users.slice(0, limit).map(serialize) });
});

router.get("/:id", requireAuth, async (req, res) => {
  const me = (req as AuthedRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...publicSelect,
      followers: { select: { id: true }, where: { followerId: me } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: serialize(user) });
});

router.post("/:id/follow", requireAuth, async (req, res) => {
  const me = (req as AuthedRequest).userId;
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  if (targetId === me) return res.status(400).json({ error: "You cannot follow yourself" });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return res.status(404).json({ error: "User not found" });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: me, followingId: targetId } },
    create: { followerId: me, followingId: targetId },
    update: {},
  });

  await notify(targetId, me, "follow");

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      ...publicSelect,
      followers: { select: { id: true }, where: { followerId: me } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  return res.json({ user: serialize(user!) });
});

router.delete("/:id/follow", requireAuth, async (req, res) => {
  const me = (req as AuthedRequest).userId;
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  await prisma.follow.deleteMany({
    where: { followerId: me, followingId: targetId },
  });

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      ...publicSelect,
      followers: { select: { id: true }, where: { followerId: me } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  return res.json({ user: serialize(user!) });
});

router.get("/:id/posts", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const authorId = Number(req.params.id);
  if (!Number.isInteger(authorId) || authorId <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const posts = await prisma.post.findMany({
    where: { authorId },
    select: {
      id: true,
      content: true,
      imageUrl: true,
      createdAt: true,
      author: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { select: { userId: true }, where: { userId } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json({
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      author: p.author,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      likedByMe: p.likes.some((l) => l.userId === userId),
    })),
  });
});

export default router;