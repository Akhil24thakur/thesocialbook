import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { STORY_TTL_MS } from "./routes/stories.js";

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TheSocialBook API running on http://0.0.0.0:${PORT}`);
});

setInterval(() => {
  prisma.story
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - STORY_TTL_MS) } } })
    .then((r) => {
      if (r.count > 0) console.log(`Cleaned up ${r.count} expired stories`);
    })
    .catch(() => {});
}, 60 * 60 * 1000);