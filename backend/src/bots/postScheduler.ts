import { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import quotes from "./quotes.json";

const p = new PrismaClient();

interface BotSchedule {
  username: string;
  category: "sad" | "love" | "motivation" | "shayari";
  cronExpr: string;
}

const BOT_SCHEDULES: BotSchedule[] = [
  { username: "sadhguru", category: "sad", cronExpr: "0 8,12,16,20 * * *" },
  { username: "dilkiawaaz", category: "love", cronExpr: "0 9,13,17,21 * * *" },
  { username: "sochkasafar", category: "motivation", cronExpr: "0 10,14,18,22 * * *" },
  { username: "sheroshayari", category: "shayari", cronExpr: "0 11,15,19,23 * * *" },
];

// Track used quotes per bot in memory (reset on server restart)
const usedQuotes = new Map<string, Set<number>>();

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnusedQuote(category: string, botUsername: string): { text: string; lang: string } | null {
  const key = `${botUsername}:${category}`;
  if (!usedQuotes.has(key)) {
    usedQuotes.set(key, new Set());
  }
  const used = usedQuotes.get(key)!;
  const allQuotes = quotes[category as keyof typeof quotes];

  // Filter out already used quotes
  const available = allQuotes.map((q, i) => ({ ...q, index: i })).filter((q) => !used.has(q.index));

  if (available.length === 0) {
    // All quotes used, reset and start over
    console.log(`[@${botUsername}] All quotes used, resetting pool`);
    used.clear();
    return pickRandom(allQuotes);
  }

  const picked = pickRandom(available);
  used.add(picked.index);
  return { text: picked.text, lang: picked.lang };
}

function formatQuotePost(text: string, category: string, botName: string): string {
  const emojis: Record<string, string[]> = {
    sad: ["\u2764\uFE0F", "\uD83D\uDC94", "\uD83D\uDE22", "\uD83D\uDC99"],
    love: ["\uD83D\uDC95", "\u2764\uFE0F", "\uD83D\uDE0D", "\uD83E\uDDE1"],
    motivation: ["\uD83D\uDCAA", "\uD83D\uDE80", "\u2B50", "\uD83D\uDCA1"],
    shayari: ["\uD83C\uDFA4", "\uD83C\uDFB5", "\uD83C\uDFB6", "\u2728"],
  };
  const hashtags: Record<string, string[]> = {
    sad: ["#sadquotes", "#hindi", "#heartbreak", "#dard", "#sad"],
    love: ["#lovequotes", "#pyar", "#mohabbat", "#love", "#romance"],
    motivation: ["#motivation", "#inspiration", "#success", "#life", "#motivational"],
    shayari: ["#shayari", "#sher", "#ghazal", "#hindi", "#poetry"],
  };

  const emoji = pickRandom(emojis[category]);
  const tags = pickRandom(hashtags[category]);
  const extraTags = pickRandom(hashtags[category]);

  return `${emoji}\n\n"${text}"\n\n~ ${botName} ${emoji}\n\n${tags} ${extraTags}`;
}

async function postQuote(schedule: BotSchedule) {
  try {
    const user = await p.user.findUnique({
      where: { username: schedule.username },
      select: { id: true, name: true },
    });
    if (!user) {
      console.log(`Bot @${schedule.username} not found, skipping`);
      return;
    }

    const quote = pickUnusedQuote(schedule.category, schedule.username);
    if (!quote) {
      console.log(`No quotes available for @${schedule.username}`);
      return;
    }

    const content = formatQuotePost(quote.text, schedule.category, user.name);

    // Create text-only post
    const post = await p.post.create({
      data: {
        authorId: user.id,
        content,
        imageUrl: null,
      },
    });

    console.log(`[@${schedule.category}] ${user.name} posted: "${quote.text.slice(0, 50)}..." (id: ${post.id})`);
  } catch (e: any) {
    console.error(`Error posting for @${schedule.username}:`, e?.message ?? e);
  }
}

export function startPostSchedulers() {
  console.log("Starting post schedulers...");

  for (const schedule of BOT_SCHEDULES) {
    cron.schedule(schedule.cronExpr, () => {
      console.log(`[CRON] Running ${schedule.category} bot...`);
      postQuote(schedule);
    });
    console.log(`  @${schedule.username} (${schedule.category}): ${schedule.cronExpr}`);
  }

  // Post one immediately on startup for each bot (staggered)
  setTimeout(() => postQuote(BOT_SCHEDULES[0]), 2000);
  setTimeout(() => postQuote(BOT_SCHEDULES[1]), 5000);
  setTimeout(() => postQuote(BOT_SCHEDULES[2]), 8000);
  setTimeout(() => postQuote(BOT_SCHEDULES[3]), 11000);

  console.log("Post schedulers started! Posting initial quotes...\n");
}
