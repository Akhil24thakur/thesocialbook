export interface ApiUser {
  id: number;
  name: string;
  username?: string;
  usernameChangedAt?: string | null;
  phone: string;
  email?: string | null;
  bio: string | null;
  avatarUrl: string | null;
  lastSeenAt?: string | null;
  createdAt?: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
  followedByMe?: boolean;
}

export interface PostAuthor {
  id: number;
  name: string;
  username?: string;
  avatarUrl: string | null;
  lastSeenAt?: string | null;
  publicKey?: string | null;
}

export interface Post {
  id: number;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  parentId: number | null;
  author: PostAuthor;
  replies?: Comment[];
}

export interface StoryItem {
  id: number;
  imageUrl: string;
  createdAt: string;
  author: PostAuthor;
}

export interface Notification {
  id: number;
  type: "like" | "comment" | "reply" | "follow" | "message";
  read: boolean;
  createdAt: string;
  actor: PostAuthor;
  post?: { id: number; content: string | null; imageUrl: string | null };
  conversation?: { id: number } | null;
  messageBody?: string | null;
}

export interface ChatMessage {
  id: number;
  body: string;
  senderId: number;
  createdAt: string;
}

export interface Conversation {
  id: number;
  updatedAt: string;
  other: PostAuthor | null;
  lastMessage: { id: number; body: string; senderId: number; createdAt: string } | null;
  unreadCount: number;
}