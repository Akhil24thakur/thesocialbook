import { createServer } from "node:http";
import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { initWs } from "./lib/ws.js";
import { STORY_TTL_MS } from "./routes/stories.js";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Set it in the environment (never commit it).");
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 4000);

const server = createServer(app);
initWs(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SocialBook API running on http://0.0.0.0:${PORT}`);
});

setInterval(() => {
  prisma.story
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - STORY_TTL_MS) } } })
    .then((r) => {
      if (r.count > 0) console.log(`Cleaned up ${r.count} expired stories`);
    })
    .catch(() => {});

  prisma.otpCode
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});
}, 60 * 60 * 1000);