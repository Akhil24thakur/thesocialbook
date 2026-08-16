import { prisma } from "./prisma.js";

const PUSH_URL = "https://exp.host/--/api/v2/push/send";

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
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: recipientId },
      select: { token: true },
    });
    if (!tokens.length) return;
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const msg = MESSAGES[type](actor?.name ?? "Someone");
    await fetch(PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: tokens.map((t) => t.token),
        sound: "default",
        ...msg,
        data: { type, postId },
      }),
    });
  } catch {
    // Push delivery is best-effort
  }
}