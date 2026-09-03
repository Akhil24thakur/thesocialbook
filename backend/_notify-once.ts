import { PrismaClient } from "@prisma/client";
import { sendPush } from "./src/lib/fcm.js";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const u of users) {
    const name = u.name || "there";
    const body = `Hey ${name}! Big update just dropped — v4.5.0 is here with way faster feeds, smoother scrolling & a fresh new look! Update now for the best experience. Post your thoughts, share pics, and enjoy the app like never before. Akhil's been grinding day & night for your great experience. Show some love!`;
    try {
      await sendPush(u.id, {
        title: `Hey ${name}! 🎉`,
        body,
        type: "post",
        postId: 0,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  console.log(`[${new Date().toISOString()}] Sent: ${sent}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
