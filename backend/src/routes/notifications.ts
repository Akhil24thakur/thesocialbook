import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const notificationSelect = {
  id: true,
  type: true,
  read: true,
  createdAt: true,
  actor: { select: { id: true, name: true, username: true, avatarUrl: true } },
  post: { select: { id: true, content: true, imageUrl: true } },
} as const;

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    select: notificationSelect,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ notifications });
});

router.get("/unread-count", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const count = await prisma.notification.count({ where: { userId, read: false } });
  return res.json({ unreadCount: count });
});

router.patch("/read", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  return res.json({ ok: true });
});

const deviceSchema = z.object({
  token: z.string().min(1).max(500),
  type: z.enum(["expo", "fcm"]).default("expo"),
});

router.post("/device-token", requireAuth, async (req, res) => {
  const parsed = deviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid push token is required" });
  }
  const userId = (req as AuthedRequest).userId;
  const { token, type } = parsed.data;
  const existing = await prisma.deviceToken.findUnique({ where: { token } });
  if (existing) {
    if (existing.userId !== userId) {
      await prisma.deviceToken.update({ where: { id: existing.id }, data: { userId } });
    }
  } else {
    await prisma.deviceToken.create({ data: { userId, token, type } });
  }
  return res.json({ ok: true });
});

export default router;