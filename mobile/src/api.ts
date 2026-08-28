import { File } from "expo-file-system";
import { Image, Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { API_URL } from "./config";
import type { ApiUser, ChatMessage, Comment, Conversation, Post, ReelFeedItem, StoryItem, Notification } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 30000;

async function request<T>(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown; params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      const query = options.params
        ? "?" +
          Object.entries(options.params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
      res = await fetch(`${API_URL}${path}${query}`, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timer);
      lastError = new ApiError(0, "Network error. Check your connection.");
      if (attempt === 0) continue;
      throw lastError;
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 503 || res.status === 502 || res.status === 429) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {}
      throw new ApiError(res.status, message);
    }
    return res.json() as Promise<T>;
  }
  throw lastError;
}

const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_COMPRESS_QUALITY = 0.8;

async function optimizeImage(uri: string): Promise<string> {
  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) =>
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
    );
    const largest = Math.max(dims.width, dims.height);
    const actions: ImageManipulator.Action[] = [];
    if (largest > MAX_IMAGE_DIMENSION) {
      actions.push({
        resize:
          dims.width >= dims.height
            ? { width: MAX_IMAGE_DIMENSION }
            : { height: MAX_IMAGE_DIMENSION },
      });
    }
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: IMAGE_COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

export async function uploadImage(token: string, uri: string): Promise<string> {
  const optimized = await optimizeImage(uri);
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(optimized)).blob();
    form.append("image", blob, "image.jpg");
  } else {
    const file = new File(optimized);
    form.append("image", file);
  }
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new ApiError(res.status, message);
  }
  const data = await res.json();
  return data.url as string;
}

export const api = {
  register: (body: { name: string; password: string; phone?: string; email?: string }) =>
    request<{ token: string; user: ApiUser }>("/api/auth/register", null, { method: "POST", body }),
  login: (body: { phone?: string; username?: string; email?: string; password: string }) =>
    request<{ token: string; user: ApiUser }>("/api/auth/login", null, { method: "POST", body }),
  me: (token: string) => request<{ user: ApiUser }>("/api/auth/me", token),
  updateMe: (
    token: string,
    body: { name?: string; username?: string; bio?: string; avatarUrl?: string | null; email?: string | null }
  ) => request<{ user: ApiUser }>("/api/auth/me", token, { method: "PATCH", body }),
  feed: (token: string, params?: { seed?: number; offset?: number; limit?: number }) =>
    request<{ posts: Post[]; total: number; seed: number }>(`/api/posts/feed`, token, {
      params,
    }),
  markSeen: (token: string, postIds: number[]) =>
    request<{ ok: boolean }>(`/api/posts/seen`, token, {
      method: "POST",
      body: { postIds },
    }),
  createPost: (token: string, body: { content: string; imageUrl?: string }) =>
    request<{ post: Post }>("/api/posts", token, { method: "POST", body }),
  deletePost: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/posts/${id}`, token, { method: "DELETE" }),
  toggleLike: (token: string, id: number) =>
    request<{ liked: boolean }>(`/api/posts/${id}/like`, token, { method: "POST" }),
  comments: (token: string, id: number) =>
    request<{ comments: Comment[] }>(`/api/posts/${id}/comments`, token),
  addComment: (token: string, id: number, content: string, parentId?: number) =>
    request<{ comment: Comment }>(`/api/posts/${id}/comments`, token, {
      method: "POST",
      body: { content, parentId: parentId ?? null },
    }),
  user: (token: string, id: number) => request<{ user: ApiUser }>(`/api/users/${id}`, token),
  postView: (token: string, id: number) =>
    request<{ post: Post }>(`/api/posts/${id}/view`, token),
  userPosts: (token: string, id: number) =>
    request<{ posts: Post[] }>(`/api/users/${id}/posts`, token),
  follow: (token: string, id: number) =>
    request<{ user: ApiUser }>(`/api/users/${id}/follow`, token, { method: "POST" }),
  unfollow: (token: string, id: number) =>
    request<{ user: ApiUser }>(`/api/users/${id}/follow`, token, { method: "DELETE" }),
  followers: (token: string, id: number) =>
    request<{ users: ApiUser[] }>(`/api/users/${id}/followers`, token),
  following: (token: string, id: number) =>
    request<{ users: ApiUser[] }>(`/api/users/${id}/following`, token),
  stories: (token: string) => request<{ stories: StoryItem[] }>("/api/stories", token),
  createStory: (
    token: string,
    imageUrl: string,
    music?: {
      musicSongId: string;
      musicSongTitle: string;
      musicSongArtist: string;
      musicAudioUrl: string;
      musicCoverUrl: string;
      musicStartTime: number;
      musicDuration: number;
    } | null
  ) =>
    request<{ story: StoryItem }>("/api/stories", token, {
      method: "POST",
      body: { imageUrl, ...(music ?? {}) },
    }),
  deleteStory: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/stories/${id}`, token, { method: "DELETE" }),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/auth/password", token, {
      method: "PATCH",
      body: { currentPassword, newPassword },
    }),
  forgotPassword: (phone: string) =>
    request<{ sent: boolean; devCode?: string }>("/api/auth/forgot-password", null, {
      method: "POST",
      body: { phone },
    }),
  resetPassword: (phone: string, otp: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/auth/reset-password", null, {
      method: "POST",
      body: { phone, otp, newPassword },
    }),
  notifications: (token: string) => request<{ notifications: Notification[] }>("/api/notifications", token),
  reportVersion: (token: string, version: string) =>
    request<{ ok: boolean }>("/api/me/version", token, { method: "PUT", body: { version } }),
  registerPublicKey: (token: string, publicKey: string) =>
    request<{ ok: boolean }>("/api/me/public-key", token, { method: "PUT", body: { publicKey } }),
  notificationsUnreadCount: (token: string) => request<{ unreadCount: number }>("/api/notifications/unread-count", token),
  notificationsMarkRead: (token: string) =>
    request<{ ok: boolean }>("/api/notifications/read", token, { method: "PATCH" }),
  registerDeviceToken: (token: string, deviceToken: string, type: "expo" | "fcm" = "expo") =>
    request<{ ok: boolean }>("/api/notifications/device-token", token, {
      method: "POST",
      body: { token: deviceToken, type },
    }),
  getOrCreateConversation: (token: string, userId: number) =>
    request<{ conversation: Conversation }>("/api/conversations", token, {
      method: "POST",
      body: { userId },
    }),
  conversations: (token: string) =>
    request<{ conversations: Conversation[] }>("/api/conversations", token),
  conversation: (token: string, id: number) =>
    request<{ conversation: Conversation }>(`/api/conversations/${id}`, token),
  conversationMessages: (token: string, id: number) =>
    request<{ messages: ChatMessage[] }>(`/api/conversations/${id}/messages`, token),
  sendMessage: (token: string, id: number, body: string) =>
    request<{ message: ChatMessage }>(`/api/conversations/${id}/messages`, token, {
      method: "POST",
      body: { body },
    }),
  conversationsUnreadCount: (token: string) => request<{ unreadCount: number }>("/api/conversations/unread-count", token),
  searchUsers: (token: string, query: string) =>
    request<{ users: ApiUser[] }>("/api/users/search?q=" + encodeURIComponent(query), token),
  reels: (token: string, params?: { pageToken?: string; limit?: number; query?: string }) =>
    request<{ items: ReelFeedItem[]; nextPageToken: string | null; query?: string }>("/api/reels", token, { params }),
  shareToStory: (token: string, postId: number) =>
    request<{ story: StoryItem; imageUrl: string }>(`/api/posts/${postId}/share-story`, token, { method: "POST" }),
  live: {
    list: (token: string) =>
      request<{ sessions: any[] }>("/api/live", token),
    start: (token: string, title?: string) =>
      request<{ session: any }>("/api/live/start", token, { method: "POST", body: { title } }),
    get: (token: string, id: number) => request<{ session: any }>(`/api/live/${id}`, token),
    join: (token: string, id: number) => request<{ ok: boolean }>(`/api/live/${id}/join`, token, { method: "POST" }),
    leave: (token: string, id: number) => request<{ ok: boolean }>(`/api/live/${id}/leave`, token, { method: "POST" }),
    end: (token: string, id: number) => request<{ ok: boolean }>(`/api/live/${id}/end`, token, { method: "POST" }),
    comments: (token: string, id: number, cursor?: string, limit?: number) =>
      request<{ comments: any[]; nextCursor: string | null }>(`/api/live/${id}/comments`, token, {
        params: { cursor, limit },
      }),
    postComment: (token: string, id: number, content: string) =>
      request<{ comment: any }>(`/api/live/${id}/comments`, token, { method: "POST", body: { content } }),
    viewerCount: (token: string, id: number) => request<{ count: number }>(`/api/live/${id}/viewer-count`, token),
    viewers: (token: string, id: number) => request<{ viewers: any[] }>(`/api/live/${id}/viewers`, token),
  },
};