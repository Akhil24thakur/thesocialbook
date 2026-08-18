import { prisma } from "./prisma.js";
import { sendBroadcast, sendPush } from "./fcm.js";

const MESSAGES = {
  like: (actorName: string) => ({
    title: "TheSocialBook",
    body: `${actorName} liked your post`,
  }),
  comment: (actorName: string) => ({
    title: "TheSocialBook",
    body: `${actorName} commented on your post`,
  }),
  reply: (actorName: string) => ({
    title: "TheSocialBook",
    body: `${actorName} replied to your comment`,
  }),
  follow: (actorName: string) => ({
    title: "TheSocialBook",
    body: `${actorName} started following you`,
  }),
} as const;

export async function notifyMessage(
  recipientId: number,
  actorId: number,
  conversationId: number,
  messageBody: string
) {
  if (recipientId === actorId) return;

  try {
    await prisma.notification.create({
      data: {
        userId: recipientId,
        actorId,
        type: "message",
        conversationId,
        messageBody,
      },
    });
  } catch {
    return;
  }

  try {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const name = actor?.name ?? "Someone";
    await sendPush(recipientId, {
      title: name,
      body: messageBody,
      type: "message",
      conversationId,
    });
  } catch {
    // Push delivery is best-effort
  }
}

export async function notify(
  recipientId: number,
  actorId: number,
  type: keyof typeof MESSAGES,
  postId?: number
) {
  if (recipientId === actorId) return;

  try {
    await prisma.notification.create({
      data: { userId: recipientId, actorId, type, postId: postId ?? null },
    });
  } catch {
    return;
  }

  try {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const msg = MESSAGES[type](actor?.name ?? "Someone");
    await sendPush(recipientId, { ...msg, type, postId });
  } catch {
    // Push delivery is best-effort
  }
}

export async function notifyAll(actorId: number, postId: number) {
  try {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const body = `${actor?.name ?? "Someone"} posted something new`;
    await sendBroadcast(actorId, { title: "TheSocialBook", body, type: "post", postId });
    await prisma.notification.createMany({
      data: (
        await prisma.user.findMany({ where: { id: { not: actorId } }, select: { id: true } })
      ).map((u) => ({ userId: u.id, actorId, type: "post", postId })),
    });
  } catch {
    // Push delivery + bell rows are best-effort
  }
}