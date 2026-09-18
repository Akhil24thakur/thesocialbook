import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const sessions = await prisma.liveSession.findMany({
  orderBy: { startedAt: "desc" },
  take: 3,
  select: { id: true, status: true, playbackUrl: true, streamKey: true, startedAt: true, host: { select: { name: true } } },
});

for (const s of sessions) {
  console.log(`Session #${s.id} | ${s.host.name} | ${s.status} | ${s.playbackUrl}`);
}

await prisma.$disconnect();
