import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, signToken, type AuthedRequest } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts.",
});

const USERNAME_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const userSelect = {
  id: true,
  name: true,
  username: true,
  usernameChangedAt: true,
  phone: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  _count: { select: { posts: true, followers: true, following: true } },
} as const;

function withCounts(user: any) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    usernameChangedAt: user.usernameChangedAt,
    phone: user.phone,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    postCount: user._count.posts,
    followerCount: user._count.followers,
    followingCount: user._count.following,
  };
}

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) || "user"
  );
}

async function uniqueUsername(name: string) {
  const base = slugify(name);
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }
  return `${base}_${Date.now().toString().slice(-4)}`;
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { name, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return res.status(409).json({ error: "An account with this phone number already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const username = await uniqueUsername(name);
  const user = await prisma.user.create({
    data: { name, username, phone, passwordHash },
  });

  return res.status(201).json({
    token: signToken({ userId: user.id }),
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      usernameChangedAt: user.usernameChangedAt,
      phone: user.phone,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    },
  });
});

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { phone, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  return res.json({
    token: signToken({ userId: user.id }),
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      usernameChangedAt: user.usernameChangedAt,
      phone: user.phone,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as AuthedRequest).userId },
    select: userSelect,
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user: withCounts(user) });
});

const updateMeSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/, "Username must be 3-20 characters: lowercase letters, numbers, underscores")
    .optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const userId = (req as AuthedRequest).userId;
  const { name, username, bio, avatarUrl } = parsed.data;

  let usernameChangedAt: Date | undefined;
  if (username !== undefined) {
    const normalized = username.toLowerCase();
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) return res.status(404).json({ error: "User not found" });

    if (normalized !== current.username) {
      if (current.usernameChangedAt) {
        const eligibleAt = current.usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS;
        if (Date.now() < eligibleAt) {
          const date = new Date(eligibleAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });
          return res.status(429).json({
            error: `You can change your username again after ${date}`,
          });
        }
      }
      const taken = await prisma.user.findUnique({ where: { username: normalized } });
      if (taken) {
        return res.status(409).json({ error: "That username is already taken" });
      }
      usernameChangedAt = new Date();
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(username !== undefined ? { username: username.toLowerCase() } : {}),
      ...(usernameChangedAt !== undefined ? { usernameChangedAt } : {}),
      ...(bio !== undefined ? { bio: bio || null } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    },
    select: userSelect,
  });
  return res.json({ user: withCounts(user) });
});

export default router;