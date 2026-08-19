import { EventEmitter, requireNativeModule } from "expo-modules-core";

const Native = requireNativeModule("NotificationReply");

export interface InitialNotification {
  conversationId?: number;
  postId?: number;
  url?: string;
}

export function setAuth(token: string): Promise<void> {
  return Native.setAuth(token);
}

export function setApiUrl(url: string): Promise<void> {
  return Native.setApiUrl(url);
}

export function getInitialNotification(): Promise<InitialNotification | null> {
  return Native.getInitialNotification();
}

export type KeyboardHeightListener = (heightDp: number) => void;

let kbNative: any = null;
try {
  kbNative = requireNativeModule("KeyboardInsets");
} catch {}

export function attachKeyboardHeight(
  listener: KeyboardHeightListener
): { remove: () => void } | null {
  if (!kbNative) return null;
  const emitter = new EventEmitter<{ onKeyboardHeight: (e: { height: number }) => void }>(kbNative);
  const sub = emitter.addListener("onKeyboardHeight", (e) => listener(e.height));
  try {
    void kbNative.attach();
  } catch {}
  return sub;
}