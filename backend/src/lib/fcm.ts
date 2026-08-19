import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync, existsSync } from "node:fs";
import { prisma } from "./prisma.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function getServiceAccount(): string | null {
  const env = process.env.FCM_SERVICE_ACCOUNT;
  if (env) return env;
  const file = process.env.FCM_SERVICE_ACCOUNT_FILE ?? "firebase-service-account.json";
  if (existsSync(file)) return readFileSync(file, "utf8");
  return null;
}

function getFcmApp() {
  const raw = getServiceAccount();
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

function hasNativeService(v?: string | null) {
  if (!v) return false;
  const m = v.match(/^(\d+)\.(\d+)/);
  if (!m) return false;
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  return major > 2 || (major === 2 && minor >= 7);
}

async function fcmVersionMap(userIds: number[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, appVersion: true },
  });
  return new Map(users.map((u) => [u.id, u.appVersion]));
}

async function sendToTokens(
  fcmTokens: { token: string; userId: number }[],
  expoTokens: string[],
  payload: {
    title: string;
    body: string;
    type: string;
    postId?: number;
    conversationId?: number;
    url?: string;
  }
) {
  const data = {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    postId: String(payload.postId ?? ""),
    conversationId: String(payload.conversationId ?? ""),
    url: payload.url ?? "",
  };

  if (fcmTokens.length) {
    try {
      const app = getFcmApp();
      if (app) {
        const ver = await fcmVersionMap(fcmTokens.map((t) => t.userId));
        const native = fcmTokens.filter((t) => hasNativeService(ver.get(t.userId)));
        const legacy = fcmTokens.filter((t) => !hasNativeService(ver.get(t.userId)));

        const dead: string[] = [];
        const handle = (res: { responses: { success: boolean; error?: { code?: string } }[] }, tokens: string[]) => {
          res.responses.forEach((r, i) => {
            if (!r.success) {
              const code = r.error?.code ?? "";
              if (code.includes("registration-token-not-registered") || code.includes("unregistered")) {
                dead.push(tokens[i]);
              }
            }
          });
        };

        if (native.length) {
          const res = await getMessaging(app).sendEachForMulticast({
            tokens: native.map((t) => t.token),
            data,
            android: { priority: "high" },
          });
          handle(res, native.map((t) => t.token));
        }

        if (legacy.length) {
          const res = await getMessaging(app).sendEachForMulticast({
            tokens: legacy.map((t) => t.token),
            notification: { title: payload.title, body: payload.body },
            data,
            android: { priority: "high" },
          });
          handle(res, legacy.map((t) => t.token));
        }

        if (dead.length) await deleteTokens(dead);
      }
    } catch (e: any) {
      if (String(e?.errorInfo?.code ?? "").includes("registration-token-not-registered")) {
        await deleteTokens(fcmTokens.map((t) => t.token));
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

export async function sendPush(
  recipientId: number,
  payload: { title: string; body: string; type: string; postId?: number; conversationId?: number }
) {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId: recipientId },
    select: { token: true, type: true, userId: true },
  });
  if (!tokens.length) return;

  const fcmTokens = tokens.filter((t) => t.type === "fcm").map((t) => ({ token: t.token, userId: t.userId }));
  const expoTokens = tokens.filter((t) => t.type !== "fcm").map((t) => t.token);
  await sendToTokens(fcmTokens, expoTokens, payload);
}

export async function sendBroadcast(
  excludeUserId: number,
  payload: { title: string; body: string; type: string; postId?: number; conversationId?: number }
) {
  const tokens = await prisma.deviceToken.findMany({
    select: { token: true, type: true, userId: true },
  });
  const fcmTokens = tokens
    .filter((t) => t.type === "fcm" && t.userId !== excludeUserId)
    .map((t) => ({ token: t.token, userId: t.userId }));
  const expoTokens = tokens
    .filter((t) => t.type !== "fcm" && t.userId !== excludeUserId)
    .map((t) => t.token);
  if (!fcmTokens.length && !expoTokens.length) return;
  await sendToTokens(fcmTokens, expoTokens, payload);
}