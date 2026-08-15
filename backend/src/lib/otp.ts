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
  const senderId = process.env.MSG91_SENDER_ID;

  if (!authKey || !templateId || !senderId) {
    console.log(`[OTP] MSG91 not configured. Auth key present: ${!!authKey}, Template ID present: ${!!templateId}, Sender ID present: ${!!senderId}`);
    // Fallback: log the code for development
    console.log(`[OTP] Code for ${phone}: ${code}`);
    return;
  }

  try {
    // MSG91 OTP API endpoint
    const url = `https://control.msg91.com/api/v2/sms`;
    const body = `authkey=${authKey}&sender=${senderId}&message=${encodeURIComponent(`Your TheSocialBook verification code is ${code}. It expires in 10 minutes.`)}&route=4&numbers=${encodeURIComponent(phone)}`;

    const https = require("https");
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + "?" + body,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    const req = https.request(options, (res: any, chunk: any) => {
      let data = "";
      res.on("data", (chunk: any) => (data += chunk));
      res.on("end", () => {
        console.log(`[OTP] MSG91 response: ${data}`);
      });
    });
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
  await sendSms(target, code);
  return { sent: true, ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}) };
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