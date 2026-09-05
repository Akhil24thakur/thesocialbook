import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendPush } from "../lib/fcm.js";

const router = Router();

router.get("/check", async (_req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const users = await prisma.user.findMany({
      where: {
        birthday: { not: null },
      },
      select: { id: true, name: true, birthday: true },
    });

    const birthdays = users.filter((u) => {
      if (!u.birthday) return false;
      const b = new Date(u.birthday);
      return b.getMonth() + 1 === month && b.getDate() === day;
    });

    let sent = 0;
    for (const user of birthdays) {
      const name = user.name || "there";
      try {
        await sendPush(user.id, {
          title: `Happy Birthday ${name}! 🎂❤️`,
          body: `A very happy birthday ${name} 💕🥰✨ -- By Akhil Thakur ❤️❤️`,
          type: "post",
          postId: 0,
        });
        sent++;
      } catch {}
    }

    res.json({ ok: true, date: `${month}-${day}`, birthdays: birthdays.length, sent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
