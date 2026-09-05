import { PrismaClient } from "@prisma/client";
import { sendPush } from "./src/lib/fcm.js";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { id: 45 },
    select: { id: true, name: true },
  });

  if (!user) {
    console.log("Swati not found");
    await prisma.$disconnect();
    return;
  }

  const name = user.name || "there";
  await sendPush(user.id, {
    title: `Happy Birthday ${name}! 🎂🎉`,
    body: `Hey ${name}! The entire SocialBook family wishes you a very happy birthday! May this year bring you endless joy, love & amazing memories. Have a wonderful day! 🥳🎈💜`,
    type: "post",
    postId: 0,
  });

  console.log(`Birthday notification sent to ${name}!`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
