import { Router } from "express";
import { z } from "zod";
import { sendOtp, verifyOtp } from "../lib/otp.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: "Please wait a moment before requesting another code.",
});

const sendSchema = z.object({
  target: z
    .string()
    .min(5)
    .max(200)
    .regex(/^(?:\d{10}|\+?\d{10,13}|[^@\s]+@[^@\s]+\.[^@\s]+)$/, "Enter a valid phone number or email"),
});

const verifySchema = z.object({
  target: z.string().min(5).max(200),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

router.post("/send", sendLimiter, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  try {
    await sendOtp(parsed.data.target);
    return res.json({ sent: true });
  } catch (e: any) {
    return res.status(500).json({ error: "Could not send the code: " + (e.message ?? "unknown error") });
  }
});

router.post("/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Code must be 6 digits" });
  }
  const ok = await verifyOtp(parsed.data.target, parsed.data.code);
  if (!ok) return res.status(400).json({ error: "Invalid or expired code" });
  return res.json({ ok: true });
});

export default router;