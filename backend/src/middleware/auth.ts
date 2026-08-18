import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "thesocialbook-dev-secret-change-me-in-prod";
const lastSeenCache = new Map<number, number>();

export interface AuthPayload {
  userId: number;
}

export interface AuthedRequest extends Request {
  userId: number;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

async function touchLastSeen(userId: number) {
  const now = Date.now();
  const last = lastSeenCache.get(userId);
  if (last && now - last < 60_000) return;
  lastSeenCache.set(userId, now);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // Best effort
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    (req as AuthedRequest).userId = payload.userId;
    void touchLastSeen(payload.userId);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
