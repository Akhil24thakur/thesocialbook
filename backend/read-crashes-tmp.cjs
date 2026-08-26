const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const p = new PrismaClient();
(async () => {
  const rows = await p.crashReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("Found " + rows.length + " crash reports");
  for (const r of rows) {
    console.log("=== " + r.createdAt.toISOString() + " v" + r.appVersion + " user=" + r.userId);
    console.log("MSG: " + r.message);
    console.log("STACK: " + (r.stack || "").slice(0, 2500));
    console.log("");
  }
  await p.$disconnect();
})().catch((e) => { console.error("ERR: " + e.message); process.exit(1); });
