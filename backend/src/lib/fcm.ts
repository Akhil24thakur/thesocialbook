import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "./prisma.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function getFcmApp() {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getApps()[0];
}

function expoToken(t: string) {
  return t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken");
}

async function deleteTokens(tokens: string[]) {
  if (!tokens.length) return;
  await prisma.deviceToken.deleteMany({ where: { token: { in: tokens } } });
}

export async function sendPush(
  recipientId: number,
  payload: { title: string; body: string; type: string; postId?: number }
) {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId: recipientId },
    select: { token: true, type: true },
  });
  if (!tokens.length) return;

  const data = { type: payload.type, postId: String(payload.postId ?? "") };

  const fcmTokens = tokens.filter((t) => t.type === "fcm").map((t) => t.token);
  const expoTokens = tokens.filter((t) => t.type !== "fcm").map((t) => t.token);

  if (fcmTokens.length) {
    try {
      const app = getFcmApp();
      if (app) {
        const res = await getMessaging(app).sendEachForMulticast({
          tokens: fcmTokens,
          notification: { title: payload.title, body: payload.body },
          data,
          android: { priority: "high" },
        });
        const dead: string[] = [];
        res.responses.forEach((r, i) => {
          if (!r.success) {
            const code = r.error?.code ?? "";
            if (code.includes("registration-token-not-registered") || code.includes("unregistered")) {
              dead.push(fcmTokens[i]);
            }
          }
        });
        if (dead.length) await deleteTokens(dead);
      } else {
        await deleteTokens(fcmTokens);
      }
    } catch (e: any) {
      if (String(e?.errorInfo?.code ?? "").includes("registration-token-not-registered")) {
        await deleteTokens(fcmTokens);
      }
    }
  }

  if (expoTokens.length) {
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: expoTokens,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data,
        }),
      });
    } catch {
      // Best effort
    }
  }
}