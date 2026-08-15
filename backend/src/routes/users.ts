import { Router } from "express";
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
  createdAt: true,
} as const;

function serialize(user: any) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    postCount: user._count.posts,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    followedByMe: user.followers.length > 0,
  };
}

router.get("/:id", requireAuth, async (req, res) => {
  const me = (req as AuthedRequest).userId;
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
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
  const posts = await prisma.post.findMany({
    where: { authorId },
    select: {
      id: true,
      content: true,
      imageUrl: true,
      createdAt: true,
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
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