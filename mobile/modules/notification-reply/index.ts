import { requireNativeModule } from "expo-modules-core";

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