import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const p = new PrismaClient();

const BOT_USERNAMES = ["sadhguru", "dilkiawaaz", "sochkasafar", "sheroshayari"];
const FOLLOWS_PER_DAY = 7;

async function autoFollow() {
  try {
    // Get bot user IDs
    const bots = await p.user.findMany({
      where: { username: { in: BOT_USERNAMES } },
      select: { id: true, username: true },
    });

    for (const bot of bots) {
      // Get users this bot hasn't followed yet (exclude other bots and self)
      const alreadyFollowing = await p.follow.findMany({
        where: { followerId: bot.id },
        select: { followingId: true },
      });
      const followingIds = new Set(alreadyFollowing.map((f) => f.followingId));
      followingIds.add(bot.id); // Exclude self

      const candidates = await p.user.findMany({
        where: {
          id: { notIn: Array.from(followingIds) },
          username: { notIn: BOT_USERNAMES },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (candidates.length === 0) continue;

      // Pick random users to follow
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const toFollow = shuffled.slice(0, Math.min(FOLLOWS_PER_DAY, shuffled.length));

      for (const target of toFollow) {
        try {
          await p.follow.create({
            data: {
              followerId: bot.id,
              followingId: target.id,
            },
          });
        } catch {
          // Ignore duplicate follow errors
        }
      }

      console.log(`[@${bot.username}] Followed ${toFollow.length} new users`);
    }
  } catch (e: any) {
    console.error("Auto-follow error:", e?.message ?? e);
  }
}

export function startFollowScheduler() {
  console.log("Starting follow scheduler...");

  // Run once on startup (after 30 seconds)
  setTimeout(autoFollow, 30000);

  // Run daily at 3 AM
  cron.schedule("0 3 * * *", autoFollow);

  console.log("Follow scheduler started!\n");
}
