import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { notify, notifyAll } from "../lib/notify.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const postSelect = {
  id: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  author: { select: { id: true, name: true, username: true, avatarUrl: true, lastSeenAt: true } },
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
  const seed = Number(req.query.seed) || Math.floor(Math.random() * 2147483647);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const ranked = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      content: string;
      imageUrl: string | null;
      createdAt: Date;
      authorId: number;
      likeCount: number;
      commentCount: number;
    }>
  >(
    `SELECT p.id, p.content, p."imageUrl", p."createdAt", p."authorId",
            (SELECT COUNT(*)::int FROM "Like" l WHERE l."postId" = p.id) AS "likeCount",
            (SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id) AS "commentCount"
     FROM "Post" p
     ORDER BY
       (CASE WHEN NOT EXISTS (SELECT 1 FROM "PostView" pv WHERE pv."postId" = p.id AND pv."userId" = $1) THEN 1000 ELSE 0 END
        + GREATEST(0.0, 60.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 1209600))
        + LEAST(1.0, LN(1.0
            + (SELECT COUNT(*) FROM "Like" l WHERE l."postId" = p.id)
            + (SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = p.id)) / 4.0) * 20
        + (MOD(p.id::bigint * 1103515245 + $2::bigint * 104729, 233280)::float / 233280) * 15) DESC,
       p.id DESC
     LIMIT $3 OFFSET $4`,
    userId,
    seed,
    limit,
    offset
  );

  const total = await prisma.post.count();

  let posts: any[] = [];
  if (ranked.length) {
    const authorIds = [...new Set(ranked.map((p) => p.authorId))];
    const postIds = ranked.map((p) => p.id);
    const [authors, likes] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, username: true, avatarUrl: true },
      }),
      prisma.like.findMany({ where: { postId: { in: postIds }, userId } }),
    ]);
    const authorMap = new Map(authors.map((a) => [a.id, a]));
    const likedSet = new Set(likes.map((l) => l.postId));
    posts = ranked.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      author: authorMap.get(p.authorId),
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      likedByMe: likedSet.has(p.id),
    }));
  }
  return res.json({ posts, total, seed });
});

const seenSchema = z.object({
  postIds: z.array(z.number().int().positive()).max(100),
});

router.post("/seen", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = seenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "postIds must be an array of post ids" });
  }
  const ids = [...new Set(parsed.data.postIds)];
  await prisma.postView.createMany({
    data: ids.map((postId) => ({ userId, postId })),
    skipDuplicates: true,
  });
  return res.json({ ok: true });
});

const createPostSchema = z.object({
  content: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
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
  notifyAll((req as AuthedRequest).userId, post.id).catch(() => {});
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
  await notify(post.authorId, userId, "like", postId);
  return res.json({ liked: true });
});

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  parentId: true,
  author: { select: { id: true, name: true, username: true, avatarUrl: true, lastSeenAt: true } },
} as const;

router.get("/:id/comments", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null },
    select: {
      ...commentSelect,
      replies: {
        select: commentSelect,
        orderBy: { createdAt: "asc" },
      },
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
  const postId = Number(req.params.id);
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Comment content is required (max 1000 chars)" });
  }
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const parentId = parsed.data.parentId ?? null;
  let parentAuthorId: number | null = null;
  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, postId } });
    if (!parent) return res.status(404).json({ error: "Comment you are replying to not found" });
    parentAuthorId = parent.authorId;
  }

  const comment = await prisma.comment.create({
    data: { content: parsed.data.content, postId, parentId, authorId: (req as AuthedRequest).userId },
    select: commentSelect,
  });
  await notify(post.authorId, (req as AuthedRequest).userId, "comment", postId);
  if (parentAuthorId && parentAuthorId !== post.authorId) {
    await notify(parentAuthorId, (req as AuthedRequest).userId, "reply", postId);
  }
  return res.status(201).json({ comment });
});

export default router;