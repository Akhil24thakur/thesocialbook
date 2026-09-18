import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const session = await prisma.liveSession.findFirst({
  where: { status: "live" },
  orderBy: { startedAt: "desc" },
  select: { id: true, playbackUrl: true, streamKey: true },
});

if (!session) {
  console.log("No active live session found");
  await prisma.$disconnect();
  process.exit(0);
}

console.log("Active session:", session.id);
console.log("Playback URL:", session.playbackUrl);

// Test if the HLS stream is accessible
try {
  const res = await fetch(session.playbackUrl);
  console.log("HLS Status:", res.status);
  const text = await res.text();
  console.log("HLS Response (first 500 chars):", text.substring(0, 500));
} catch (e: any) {
  console.log("Error:", e.message);
}

await prisma.$disconnect();
