import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "thesocialbook-dev-secret-change-me-in-prod";

const crashSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional().default(""),
  appVersion: z.string().max(50).optional().default(""),
});

router.post("/", async (req, res) => {
  const parsed = crashSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid crash payload" });

  let userId: number | null = null;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId?: number };
      userId = payload.userId ?? null;
    } catch {
      userId = null;
    }
  }

  await prisma.crashReport.create({
    data: {
      userId,
      message: parsed.data.message.slice(0, 2000),
      stack: parsed.data.stack.slice(0, 10000),
      appVersion: parsed.data.appVersion.slice(0, 50),
    },
  });
  return res.json({ ok: true });
});

export default router;
