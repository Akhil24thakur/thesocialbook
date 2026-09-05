import { PrismaClient } from "@prisma/client";
import { sendPush } from "./src/lib/fcm.js";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { id: 4 },
    select: { id: true, name: true },
  });

  if (!user) {
    console.log("Akhil not found");
    await prisma.$disconnect();
    return;
  }

  await sendPush(user.id, {
    title: "Happy Birthday Akhil! 🎂🎉",
    body: "Wishing you an amazing birthday! SocialBook family loves you. Keep shining! 🥳🎈",
    type: "post",
    postId: 0,
  });

  console.log("Birthday notification sent to Akhil!");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
