import { File } from "expo-file-system";
import { API_URL } from "./config";
import type { ApiUser, Comment, Post, StoryItem } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

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

export async function uploadImage(token: string, uri: string): Promise<string> {
  const file = new File(uri);
  const form = new FormData();
  form.append("image", file);
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
  register: (body: { name: string; phone: string; password: string }) =>
    request<{ token: string; user: ApiUser }>("/api/auth/register", null, { method: "POST", body }),
  login: (body: { phone: string; password: string }) =>
    request<{ token: string; user: ApiUser }>("/api/auth/login", null, { method: "POST", body }),
  me: (token: string) => request<{ user: ApiUser }>("/api/auth/me", token),
  updateMe: (
    token: string,
    body: { name?: string; username?: string; bio?: string; avatarUrl?: string | null }
  ) => request<{ user: ApiUser }>("/api/auth/me", token, { method: "PATCH", body }),
  feed: (token: string) => request<{ posts: Post[] }>("/api/posts/feed", token),
  createPost: (token: string, body: { content: string; imageUrl?: string }) =>
    request<{ post: Post }>("/api/posts", token, { method: "POST", body }),
  deletePost: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/posts/${id}`, token, { method: "DELETE" }),
  toggleLike: (token: string, id: number) =>
    request<{ liked: boolean }>(`/api/posts/${id}/like`, token, { method: "POST" }),
  comments: (token: string, id: number) =>
    request<{ comments: Comment[] }>(`/api/posts/${id}/comments`, token),
  addComment: (token: string, id: number, content: string) =>
    request<{ comment: Comment }>(`/api/posts/${id}/comments`, token, {
      method: "POST",
      body: { content },
    }),
  user: (token: string, id: number) => request<{ user: ApiUser }>(`/api/users/${id}`, token),
  userPosts: (token: string, id: number) =>
    request<{ posts: Post[] }>(`/api/users/${id}/posts`, token),
  follow: (token: string, id: number) =>
    request<{ user: ApiUser }>(`/api/users/${id}/follow`, token, { method: "POST" }),
  unfollow: (token: string, id: number) =>
    request<{ user: ApiUser }>(`/api/users/${id}/follow`, token, { method: "DELETE" }),
  stories: (token: string) => request<{ stories: StoryItem[] }>("/api/stories", token),
  createStory: (token: string, imageUrl: string) =>
    request<{ story: StoryItem }>("/api/stories", token, { method: "POST", body: { imageUrl } }),
  deleteStory: (token: string, id: number) =>
    request<{ ok: boolean }>(`/api/stories/${id}`, token, { method: "DELETE" }),
};