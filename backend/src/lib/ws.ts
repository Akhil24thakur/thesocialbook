import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "thesocialbook-dev-secret-change-me-in-prod";

const rooms = new Map<string, Set<WebSocket>>();

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
    socket.on("close", () => leaveAll(socket));
  });

  return wss;
}