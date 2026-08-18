import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma.js";

const sa = JSON.parse(readFileSync("firebase-service-account.json", "utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });

const tokens = await prisma.deviceToken.findMany({
  select: { token: true, type: true, userId: true },
});
const users = await prisma.user.count();
const uniqueDeviceUsers = new Set(tokens.map((t) => t.userId)).size;

const fcm = tokens.filter((t) => t.type === "fcm").map((t) => t.token);
const expo = tokens.filter((t) => t.type !== "fcm").map((t) => t.token);

const title = "TheSocialBook";
const body = "New version v1.3.5 is available — update now!";
const url = "https://github.com/Akhil24thakur/thesocialbook/releases/latest";
const data = { type: "post", url };

let fcmOk = 0;
let fcmFail = 0;
let fcmDead = 0;
for (let i = 0; i < fcm.length; i += 500) {
  const chunk = fcm.slice(i, i + 500);
  const res = await getMessaging().sendEachForMulticast({
    tokens: chunk,
    notification: { title, body },
    data,
    android: { priority: "high" },
  });
  res.responses.forEach((r) => {
    if (r.success) fcmOk++;
    else {
      fcmFail++;
      if (
        (r.error?.code ?? "").includes("registration-token-not-registered") ||
        (r.error?.code ?? "").includes("unregistered")
      ) {
        fcmDead++;
      }
    }
  });
}
if (fcmDead > 0) {
  const all = tokens.filter((t) => t.type === "fcm").map((t) => t.token);
  const deadTokens = all.filter((_, i) => {
    // find indices of failed+unregistered within chunks
    return false;
  });
  // simpler: delete by failed chunk tokens
  const failedTokens: string[] = [];
  for (let i = 0; i < fcm.length; i += 500) {
    const chunk = fcm.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data,
      android: { priority: "high" },
    });
    res.responses.forEach((r, j) => {
      if (!r.success && ((r.error?.code ?? "").includes("not-registered") || (r.error?.code ?? "").includes("unregistered"))) {
        failedTokens.push(chunk[j]);
      }
    });
  }
  if (failedTokens.length) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: failedTokens } } });
    fcmDead = failedTokens.length;
  }
}

let expoOk = 0;
let expoFail = 0;
for (let i = 0; i < expo.length; i += 100) {
  const chunk = expo.slice(i, i + 100);
  try {
    const r = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: chunk, sound: "default", title, body, data }),
    });
    const j = await r.json();
    (j.data ?? []).forEach((d: any) => {
      if (d.status === "ok") expoOk++;
      else expoFail++;
    });
  } catch {
    expoFail += chunk.length;
  }
}

console.log(
  JSON.stringify({
    usersInDb: users,
    usersWithTokens: uniqueDeviceUsers,
    fcmTokens: fcm.length,
    fcmDelivered: fcmOk,
    fcmFailed: fcmFail,
    fcmDeadDeleted: fcmDead,
    expoTokens: expo.length,
    expoDelivered: expoOk,
    expoFailed: expoFail,
  })
);
await prisma.$disconnect();