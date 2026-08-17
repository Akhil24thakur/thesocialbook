import { prisma } from "./prisma.js";
import { sendPush } from "./fcm.js";

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