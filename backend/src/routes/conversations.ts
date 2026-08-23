import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { notifyMessage } from "../lib/notify.js";
import { broadcastToConversation } from "../lib/ws.js";

const router = Router();

const otherUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  isVerified: true,
  lastSeenAt: true,
  publicKey: true,
} as const;

function serialize(conversation: any, meId: number) {
  const member = conversation.members.find((m: any) => m.userId === meId);
  const other = conversation.members.find((m: any) => m.userId !== meId);
  const last = conversation.messages[0] ?? null;
  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt,
    other: other?.user ?? null,
    lastMessage: last
      ? {
          id: last.id,
          body: last.body,
          senderId: last.senderId,
          createdAt: last.createdAt,
          readAt: last.readAt,
        }
      : null,
    unreadCount: member?.unreadCount ?? 0,
  };
}

const messageSchema = z.object({
  body: z.string().min(1).max(4000),
});

router.post("/", requireAuth, async (req, res) => {
  const meId = (req as AuthedRequest).userId;
  const parsed = z.object({ userId: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid user id is required" });
  const otherId = parsed.data.userId;
  if (otherId === meId) return res.status(400).json({ error: "You cannot message yourself" });

  const target = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
  if (!target) return res.status(404).json({ error: "User not found" });

  const existing = await prisma.conversation.findFirst({
    where: {
      members: { every: { userId: { in: [meId, otherId] } } },
      AND: { members: { some: { userId: meId } } },
    },
    include: {
      members: { include: { user: { select: otherUserSelect } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: {
        members: {
          create: [{ userId: meId, unreadCount: 0 }, { userId: otherId, unreadCount: 0 }],
        },
      },
      include: {
        members: { include: { user: { select: otherUserSelect } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }));

  return res.json({ conversation: serialize(conversation, meId) });
});

router.get("/", requireAuth, async (req, res) => {
  const meId = (req as AuthedRequest).userId;
  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { userId: meId } } },
    include: {
      members: { include: { user: { select: otherUserSelect } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return res.json({ conversations: conversations.map((c) => serialize(c, meId)) });
});

router.get("/unread-count", requireAuth, async (req, res) => {
  const meId = (req as AuthedRequest).userId;
  const count = await prisma.conversationMember.count({
    where: { userId: meId, unreadCount: { gt: 0 } },
  });
  return res.json({ unreadCount: count });
});

router.get("/:id", requireAuth, async (req, res) => {
  const meId = (req as AuthedRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid conversation" });
  const conversation = await prisma.conversation.findFirst({
    where: { id, members: { some: { userId: meId } } },
    include: {
      members: { include: { user: { select: otherUserSelect } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  return res.json({ conversation: serialize(conversation, meId) });
});

router.get("/:id/messages", requireAuth, async (req, res) => {
  const meId = (req as AuthedRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid conversation" });

  const conversation = await prisma.conversation.findFirst({
    where: { id, members: { some: { userId: meId } } },
    select: { id: true },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, body: true, senderId: true, createdAt: true, readAt: true },
  });

  const incoming = await prisma.message.findMany({
    where: { conversationId: id, senderId: { not: meId }, readAt: null },
    select: { id: true },
  });
  if (incoming.length) {
    await prisma.message.updateMany({
      where: { id: { in: incoming.map((m) => m.id) } },
      data: { readAt: new Date() },
    });
    broadcastToConversation(id, "read", { messageIds: incoming.map((m) => m.id) });
  }

  await prisma.conversationMember.updateMany({
    where: { conversationId: id, userId: meId, unreadCount: { gt: 0 } },
    data: { unreadCount: 0 },
  });

  return res.json({ messages });
});

router.post("/:id/messages", requireAuth, async (req, res) => {
  const meId = (req as AuthedRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid conversation" });
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Message cannot be empty" });

  const conversation = await prisma.conversation.findFirst({
    where: { id, members: { some: { userId: meId } } },
    include: { members: { select: { id: true, userId: true } } },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const message = await prisma.message.create({
    data: { conversationId: id, senderId: meId, body: parsed.data.body },
    select: { id: true, body: true, senderId: true, createdAt: true, readAt: true },
  });

  const otherMember = conversation.members.find((m) => m.userId !== meId);
  if (otherMember) {
    await prisma.conversation.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        members: {
          update: {
            where: { id: otherMember.id },
            data: { unreadCount: { increment: 1 } },
          },
        },
      },
    });
    await notifyMessage(otherMember.userId, meId, id, parsed.data.body);
  }

  broadcastToConversation(id, "message", { message });

  return res.json({ message });
});

export default router;