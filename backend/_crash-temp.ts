import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const r = await p.crashReport.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { message: true, stack: true, appVersion: true, createdAt: true } });
r.forEach((c: any) => console.log("---\nVersion:", c.appVersion, "\nTime:", c.createdAt.toISOString(), "\nMessage:", c.message?.substring(0, 300), "\nStack:", c.stack?.substring(0, 500)));
await p.$disconnect();
