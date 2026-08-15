import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "./prisma.js";

export const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }
  return transporter;
}

async function sendEmail(to: string, code: string) {
  const t = getTransporter();
  if (!t) {
    console.log(`[OTP] email delivery not configured (SMTP_* env). Code for ${to}: ${code}`);
    return;
  }
  await t.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: "Your TheSocialBook verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
}

async function sendSms(phone: string, code: string) {
  const key = process.env.SMS_API_KEY;
  const url = process.env.SMS_API_URL;
  if (key && url) {
    const body = url
      .replace("{phone}", encodeURIComponent(phone))
      .replace("{code}", code);
    const res = await fetch(body, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) console.error(`[OTP] SMS send failed (${res.status})`);
    return;
  }
  console.log(`[OTP] SMS provider not configured. Code for ${phone}: ${code}`);
}

export async function sendOtp(target: string) {
  const code = generateCode();
  await prisma.otpCode.create({
    data: { target, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  if (target.startsWith("+") || /^\d{10}$/.test(target)) {
    await sendSms(target, code);
  } else {
    await sendEmail(target, code);
  }
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