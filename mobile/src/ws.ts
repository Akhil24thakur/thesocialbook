import { API_URL } from "./config";

const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";

type EventHandler = (payload: any) => void;

const handlers = new Map<string, Set<EventHandler>>();

let socket: WebSocket | null = null;
let currentToken: string | null = null;
let retryDelay = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function dispatch(event: string, key: string | null, payload: any) {
  const fire = (k: string) => {
    const set = handlers.get(k);
    if (set) for (const h of [...set]) h(payload);
  };
  if (key) fire(key);
  fire("*");
}

function onMessage(raw: string) {
  try {
    const data = JSON.parse(raw);
    if (!data?.type) return;
    dispatch(data.type, `c:${data.conversationId}`, data);
  } catch {
    // Ignore malformed frames
  }
}

function open() {
  if (!currentToken || socket) return;
  try {
    socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(currentToken)}`);
  } catch {
    scheduleReconnect();
    return;
  }
  socket.onopen = () => {
    retryDelay = 1000;
  };
  socket.onmessage = (ev) => onMessage(String(ev.data));
  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };
  socket.onerror = () => {
    try {
      socket?.close();
    } catch {
      // Ignore
    }
  };
}

function scheduleReconnect() {
  if (reconnectTimer || !currentToken) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
    retryDelay = Math.min(retryDelay * 2, 30000);
  }, retryDelay);
}

export function connectWs(token: string | null) {
  currentToken = token;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (!token) {
    try {
      socket?.close();
    } catch {
      // Ignore
    }
    socket = null;
    return;
  }
  if (!socket) open();
}

export function onWsEvent(
  event: string,
  conversationId: number | null,
  handler: EventHandler
): () => void {
  const key = conversationId ? `c:${conversationId}` : "*";
  const id = `${event}:${key}`;
  let set = handlers.get(id);
  if (!set) {
    set = new Set();
    handlers.set(id, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
    if (set?.size === 0) handlers.delete(id);
  };
}