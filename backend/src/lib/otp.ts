import crypto from "node:crypto";
import { prisma } from "./prisma.js";

export const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendViaMsg91(phone: string, code: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    console.log(`[OTP] MSG91 not configured. Auth key present: ${!!authKey}, Template ID present: ${!!templateId}`);
    console.log(`[OTP] Code for ${phone}: ${code}`);
    return;
  }

  const mobile = "91" + phone.replace(/^\+/, "").replace(/^0/, "");

  try {
    const params = new URLSearchParams({
      authkey: authKey,
      template_id: templateId,
      mobile,
      otp: code,
      otp_expiry: "10",
    });
    const parsedUrl = new URL("https://control.msg91.com/api/v5/otp?" + params.toString());
    const https = require("https");
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    const req = https.request(options, (res: any) => {
      let data = "";
      res.on("data", (chunk: any) => (data += chunk));
      res.on("end", () => {
        console.log(`[OTP] MSG91 response (${res.statusCode}): ${data}`);
      });
    });
    req.on("error", (e: any) => console.error("[OTP] MSG91 request error:", e.message));
    req.end();
  } catch (error) {
    console.error(`[OTP] MSG91 send failed:`, error);
  }
}

async function sendSms(phone: string, code: string) {
  await sendViaMsg91(phone, code);
}

export async function sendOtp(target: string) {
  const code = generateCode();
  await prisma.otpCode.create({
    data: { target, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  if (/^[6-9]\d{9}$/.test(target)) {
    await sendSms(target, code);
  } else {
    console.log(`[OTP] Email delivery not configured. Code for ${target}: ${code}`);
  }
  const devMode = process.env.NODE_ENV !== "production" || process.env.OTP_DEV_MODE === "true";
  return { sent: true, ...(devMode ? { devCode: code } : {}) };
}

export async function verifyOtp(target: string, code: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: { target, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  if (otp.code !== code) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    if (otp.attempts + 1 >= MAX_ATTEMPTS) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
    }
    return false;
  }
  await prisma.otpCode.updateMany({
    where: { target, used: false },
    data: { used: true },
  });
  return true;
}