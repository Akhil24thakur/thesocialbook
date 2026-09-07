import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { sendBroadcast } from "../lib/fcm.js";
import { broadcastToLive } from "../lib/ws.js";

const router = Router();

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID ?? "";
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET ?? "";
const MUX_API = "https://api.mux.com/video/v1";

async function createMuxStream() {
  const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64");
  const res = await fetch(`${MUX_API}/live-streams`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playback_policy: ["public"],
      new_asset_settings: { playback_policy: ["public"] },
    }),
  });
  if (!res.ok) throw new Error(`Mux API error: ${res.status}`);
  const data = await res.json() as any;
  return {
    streamKey: data.data.stream_key,
    streamId: data.data.id,
    playbackUrl: data.data.playback_ids?.[0]?.id
      ? `https://stream.mux.com/${data.data.playback_ids[0].id}.m3u8`
      : null,
  };
}

async function deleteMuxStream(streamId: string) {
  try {
    const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64");
    await fetch(`${MUX_API}/live-streams/${streamId}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${auth}` },
    });
  } catch {}
}

const createLiveSchema = z.object({
  title: z.string().max(100).optional(),
});

router.post("/start", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = createLiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const activeSession = await prisma.liveSession.findFirst({
    where: { hostId: userId, status: "live" },
  });
  if (activeSession) {
    return res.status(400).json({ error: "You already have an active live session" });
  }

  let streamKey: string;
  let playbackUrl: string | null;
  let rtmpUrl: string;

  if (MUX_TOKEN_ID && MUX_TOKEN_SECRET) {
    try {
      const mux = await createMuxStream();
      streamKey = mux.streamKey;
      playbackUrl = mux.playbackUrl;
      rtmpUrl = "rtmp://global-live.mux.com/app";
    } catch (e: any) {
      console.error("Mux API error:", e.message);
      return res.status(500).json({ error: "Failed to create live stream" });
    }
  } else {
    streamKey = `live_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    playbackUrl = `https://stream.mux.com/${streamKey}.m3u8`;
    rtmpUrl = process.env.MUX_RTMP_URL ?? "rtmp://global-live.mux.com/app";
  }

  const session = await prisma.liveSession.create({
    data: {
      hostId: userId,
      title: parsed.data.title,
      status: "live",
      streamKey,
      rtmpUrl: `${rtmpUrl}/${streamKey}`,
      playbackUrl: playbackUrl ?? "",
      startedAt: new Date(),
    },
    include: {
      host: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } },
    },
  });

  await sendBroadcast(userId, {
    title: `${session.host.name} went live!`,
    body: session.title ?? "Join the live stream",
    type: "live_started",
    postId: session.id,
  });

  broadcastToLive(session.id, "live_started", { session });

  return res.status(201).json({ session });
});

router.post("/:id/end", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const sessionId = Number(req.params.id);

  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { host: true },
  });
  if (!session) return res.status(404).json({ error: "Live session not found" });
  if (session.hostId !== userId) return res.status(403).json({ error: "Not authorized" });

  if (MUX_TOKEN_ID && MUX_TOKEN_SECRET && session.streamKey) {
    try {
      const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64");
      const streamsRes = await fetch(`${MUX_API}/live-streams?stream_key=${session.streamKey}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (streamsRes.ok) {
        const streamsData = await streamsRes.json() as any;
        const stream = streamsData.data?.[0];
        if (stream?.id) await deleteMuxStream(stream.id);
      }
    } catch {}
  }

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { status: "ended", endedAt: new Date() },
  });

  await prisma.liveViewer.updateMany({
    where: { sessionId, leftAt: null },
    data: { leftAt: new Date() },
  });

  broadcastToLive(sessionId, "live_ended", { sessionId });

  return res.json({ ok: true });
});

router.get("/:id", requireAuth, async (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ error: "Invalid session id" });
  }
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      host: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } },
      _count: { select: { viewers: true, comments: true } },
    },
  });
  if (!session) return res.status(404).json({ error: "Live session not found" });

  const viewerCount = await prisma.liveViewer.count({ where: { sessionId, leftAt: null } });
  const isHost = session.hostId === (req as AuthedRequest).userId;

  return res.json({
    session: {
      id: session.id,
      hostId: session.hostId,
      title: session.title,
      status: session.status,
      playbackUrl: session.playbackUrl,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      createdAt: session.createdAt,
      host: session.host,
      _count: session._count,
      viewerCount,
      isHost,
      ...(isHost ? { streamKey: session.streamKey, rtmpUrl: session.rtmpUrl } : {}),
    },
  });
});

const LIVE_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

router.get("/", requireAuth, async (req, res) => {
  const status = req.query.status as string;

  const staleCutoff = new Date(Date.now() - LIVE_SESSION_TTL_MS);
  const staleSessions = await prisma.liveSession.findMany({
    where: { status: "live", startedAt: { lt: staleCutoff } },
    select: { id: true, streamKey: true },
  });
  if (staleSessions.length > 0) {
    const staleIds = staleSessions.map((s) => s.id);
    if (MUX_TOKEN_ID && MUX_TOKEN_SECRET) {
      for (const s of staleSessions) {
        try {
          const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64");
          const streamsRes = await fetch(`${MUX_API}/live-streams?stream_key=${s.streamKey ?? ""}`, {
            headers: { Authorization: `Basic ${auth}` },
          });
          if (streamsRes.ok) {
            const streamsData = await streamsRes.json() as any;
            const stream = streamsData.data?.[0];
            if (stream?.id) await deleteMuxStream(stream.id);
          }
        } catch {}
      }
    }
    await prisma.liveSession.updateMany({ where: { id: { in: staleIds } }, data: { status: "ended", endedAt: new Date() } });
    await prisma.liveViewer.updateMany({ where: { sessionId: { in: staleIds }, leftAt: null }, data: { leftAt: new Date() } });
  }

  const where = status ? { status } : { status: "live" };

  const sessions = await prisma.liveSession.findMany({
    where,
    include: {
      host: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } },
      _count: { select: { viewers: true, comments: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const sessionsWithCounts = await Promise.all(
    sessions.map(async (s) => ({
      ...s,
      viewerCount: await prisma.liveViewer.count({ where: { sessionId: s.id, leftAt: null } }),
    }))
  );

  return res.json({ sessions: sessionsWithCounts });
});

router.post("/:id/join", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const sessionId = Number(req.params.id);

  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: "Live session not found" });
  if (session.status !== "live") return res.status(400).json({ error: "Live session is not active" });

  const existing = await prisma.liveViewer.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (existing) {
    if (existing.leftAt) {
      await prisma.liveViewer.update({
        where: { id: existing.id },
        data: { leftAt: null, joinedAt: new Date() },
      });
    }
    return res.json({ ok: true, isRejoin: true });
  }

  await prisma.liveViewer.create({
    data: { sessionId, userId },
  });

  const viewerCount = await prisma.liveViewer.count({ where: { sessionId, leftAt: null } });
  broadcastToLive(sessionId, "viewer_count", { count: viewerCount });
  broadcastToLive(sessionId, "viewer_joined", { userId });

  return res.json({ ok: true });
});

router.post("/:id/leave", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ error: "Invalid session id" });
  }

  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: "Live session not found" });

  await prisma.liveViewer.updateMany({
    where: { sessionId, userId, leftAt: null },
    data: { leftAt: new Date() },
  });

  const viewerCount = await prisma.liveViewer.count({ where: { sessionId, leftAt: null } });
  broadcastToLive(sessionId, "viewer_count", { count: viewerCount });
  broadcastToLive(sessionId, "viewer_left", { userId });

  return res.json({ ok: true });
});

router.get("/:id/comments", requireAuth, async (req, res) => {
  const sessionId = Number(req.params.id);
  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = Number(req.query.limit ?? 50);

  const comments = await prisma.liveComment.findMany({
    where: { sessionId },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
  });

  let nextCursor: number | undefined;
  if (comments.length > limit) {
    const next = comments.pop();
    nextCursor = next?.id;
  }

  return res.json({ comments: comments.reverse(), nextCursor });
});

const postCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const sessionId = Number(req.params.id);
  const parsed = postCommentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Comment required" });

  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "live") return res.status(400).json({ error: "Live not active" });

  if (session.hostId !== userId) {
    const viewer = await prisma.liveViewer.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (!viewer || viewer.leftAt) return res.status(403).json({ error: "Not in live session" });
  }

  const comment = await prisma.liveComment.create({
    data: { sessionId, userId, content: parsed.data.content },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } } },
  });

  broadcastToLive(sessionId, "new_comment", { comment });

  return res.status(201).json({ comment });
});

router.get("/:id/viewer-count", requireAuth, async (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ error: "Invalid session id" });
  }
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) return res.status(404).json({ error: "Live session not found" });
  const count = await prisma.liveViewer.count({ where: { sessionId, leftAt: null } });
  return res.json({ count });
});

router.get("/:id/viewers", requireAuth, async (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ error: "Invalid session id" });
  }
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) return res.status(404).json({ error: "Live session not found" });
  const viewers = await prisma.liveViewer.findMany({
    where: { sessionId, leftAt: null },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } },
    },
    orderBy: { joinedAt: "asc" },
    take: 200,
  });
  return res.json({ viewers: viewers.map((v) => v.user) });
});

export default router;