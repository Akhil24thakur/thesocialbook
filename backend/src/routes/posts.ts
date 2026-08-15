import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const postSelect = {
  id: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  author: { select: { id: true, name: true, username: true, avatarUrl: true } },
  _count: { select: { likes: true, comments: true } },
} as const;

function serialize(post: any, userId: number) {
  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt,
    author: post.author,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    likedByMe: post.likes.some((l: { userId: number }) => l.userId === userId),
  };
}

router.get("/feed", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const posts = await prisma.post.findMany({
    select: { ...postSelect, likes: { select: { userId: true }, where: { userId } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ posts: posts.map((p) => serialize(p, userId)) });
});

const createPostSchema = z.object({
  content: z.string().max(5000).optional(),
  imageUrl: z.string().url().max(1000).optional().or(z.literal("")),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Post content must be under 5000 chars" });
  }
  const { content, imageUrl } = parsed.data;
  if (!content?.trim() && !imageUrl) {
    return res.status(400).json({ error: "Add some text or a photo to your post" });
  }
  const post = await prisma.post.create({
    data: {
      content: content?.trim() ?? "",
      imageUrl: imageUrl || null,
      authorId: (req as AuthedRequest).userId,
    },
    select: postSelect,
  });
  return res.status(201).json({ post });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.authorId !== (req as AuthedRequest).userId) {
    return res.status(403).json({ error: "You can only delete your own posts" });
  }
  await prisma.post.delete({ where: { id: postId } });
  return res.json({ ok: true });
});

router.post("/:id/like", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const userId = (req as AuthedRequest).userId;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return res.json({ liked: false });
  }
  await prisma.like.create({ data: { userId, postId } });
  return res.json({ liked: true });
});

router.get("/:id/comments", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const comments = await prisma.comment.findMany({
    where: { postId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return res.json({ comments });
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Comment content is required (max 1000 chars)" });
  }
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const comment = await prisma.comment.create({
    data: { content: parsed.data.content, postId, authorId: (req as AuthedRequest).userId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });
  return res.status(201).json({ comment });
});

export default router;