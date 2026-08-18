import { prisma } from "../src/lib/prisma.js";

const byVersion = await prisma.user.groupBy({
  by: ["appVersion"],
  _count: { _all: true },
});
console.log(JSON.stringify(byVersion));
await prisma.$disconnect();