import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const p = new PrismaClient();

interface BotConfig {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  category: string;
}

const BOTS: BotConfig[] = [
  {
    name: "Sadhguru",
    username: "sadhguru",
    bio: "\u2764\uFE0F Dil ki baatein, dil se. Sad quotes for sad souls.",
    avatarUrl: "",
    category: "sad",
  },
  {
    name: "Dil Ki Awaaz",
    username: "dilkiawaaz",
    bio: "\uD83D\uDC95 Pyar ki awaaz, dil ki baat. Love quotes & shayari.",
    avatarUrl: "",
    category: "love",
  },
  {
    name: "Soch Ka Safar",
    username: "sochkasafar",
    bio: "\uD83D\uDCAA Soch badlo, zindagi badlegi. Daily motivation.",
    avatarUrl: "",
    category: "motivation",
  },
  {
    name: "Sher-O-Shayari",
    username: "sheroshayari",
    bio: "\uD83C\uDFA4 Alfaaz ka jaadu, dil ki sadaa. Shayari for every mood.",
    avatarUrl: "",
    category: "shayari",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("SocialBook@Bot2026", 10);

  for (const bot of BOTS) {
    const existing = await p.user.findUnique({ where: { username: bot.username } });
    if (existing) {
      console.log(`Bot @${bot.username} already exists (id: ${existing.id})`);
      continue;
    }

    const user = await p.user.create({
      data: {
        name: bot.name,
        username: bot.username,
        passwordHash,
        bio: bot.bio,
        isVerified: false,
      },
    });
    console.log(`Created bot: @${bot.username} (id: ${user.id})`);
  }

  console.log("\nAll bots created!");
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
