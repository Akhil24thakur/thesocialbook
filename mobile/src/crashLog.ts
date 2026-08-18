import Constants from "expo-constants";
import { API_URL } from "./config";

let setupDone = false;
const queue: string[] = [];

async function send(message: string, stack: string) {
  try {
    await fetch(`${API_URL}/api/crash-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        stack,
        appVersion: Constants.expoConfig?.version ?? "",
      }),
    });
  } catch {
    // Best effort
  }
}

export function reportCrash(message: string, stack: string) {
  if (!setupDone) {
    queue.push(`${message}\n${stack}`);
    return;
  }
  void send(message, stack);
}

export function setupCrashLog() {
  if (setupDone) return;
  setupDone = true;
  const pending = queue.splice(0);
  for (const item of pending) {
    const idx = item.indexOf("\n");
    void send(item.slice(0, idx), item.slice(idx + 1));
  }
  const g = globalThis as any;
  if (g.ErrorUtils?.setGlobalHandler) {
    g.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
      const message = String(error?.message ?? error ?? "Unknown error");
      const stack = String(error?.stack ?? "");
      void send(message, `${stack}\nfatal=${isFatal}`);
    });
  }
}