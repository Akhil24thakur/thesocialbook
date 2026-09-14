import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "thesocialbook-dev-secret-change-me-in-prod";

const rooms = new Map<string, Set<WebSocket>>();
const hostSockets = new Map<WebSocket, { sessionId: number; userId: number }>();

function join(socket: WebSocket, room: string) {
  let set = rooms.get(room);
  if (!set) {
    set = new Set();
    rooms.set(room, set);
  }
  set.add(socket);
}

function leaveAll(socket: WebSocket) {
  for (const [room, set] of rooms) {
    if (set.delete(socket) && set.size === 0) rooms.delete(room);
  }
}

export function broadcastToConversation(conversationId: number, type: string, payload: unknown) {
  const set = rooms.get(`conversation:${conversationId}`);
  if (!set || set.size === 0) return;
  const message = JSON.stringify({ type, conversationId, ...(payload as object) });
  for (const socket of set) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

export function broadcastToLive(sessionId: number, type: string, payload: unknown) {
  const set = rooms.get(`live:${sessionId}`);
  if (!set || set.size === 0) return;
  const message = JSON.stringify({ type, sessionId, ...(payload as object) });
  for (const socket of set) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

async function endSessionOnHostDisconnect(sessionId: number) {
  try {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== "live") return;

    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: "ended", endedAt: new Date() },
    });
    await prisma.liveViewer.updateMany({
      where: { sessionId, leftAt: null },
      data: { leftAt: new Date() },
    });
    broadcastToLive(sessionId, "live_ended", { sessionId, reason: "host_disconnected" });
    console.log(`Auto-ended live session ${sessionId} (host disconnected)`);
  } catch (e) {
    console.error(`Failed to auto-end session ${sessionId}:`, e);
  }
}

export function initWs(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (socket, req) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");
    let userId: number | null = null;
    try {
      const payload = jwt.verify(token ?? "", JWT_SECRET) as { userId?: number };
      userId = payload.userId ?? null;
    } catch {
      userId = null;
    }
    if (!userId) {
      socket.close(4001, "unauthorized");
      return;
    }
    try {
      const memberships = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const m of memberships) join(socket, `conversation:${m.conversationId}`);
    } catch {
      // Even if room loading fails, keep the socket for future events
    }
    socket.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "join_live" && msg.sessionId) {
          join(socket, `live:${msg.sessionId}`);
          if (msg.isHost) {
            hostSockets.set(socket, { sessionId: msg.sessionId, userId });
          }
        } else if (msg.type === "leave_live" && msg.sessionId) {
          const set = rooms.get(`live:${msg.sessionId}`);
          set?.delete(socket);
          if (set && set.size === 0) rooms.delete(`live:${msg.sessionId}`);
          hostSockets.delete(socket);
        }
      } catch {}
    });

    socket.on("close", () => {
      const hostInfo = hostSockets.get(socket);
      if (hostInfo) {
        hostSockets.delete(socket);
        endSessionOnHostDisconnect(hostInfo.sessionId);
      }
      leaveAll(socket);
    });
  });

  return wss;
}