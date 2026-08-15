export interface ApiUser {
  id: number;
  name: string;
  username?: string;
  usernameChangedAt?: string | null;
  phone: string;
  bio: string | null;
  avatarUrl: string | null;
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
  author: PostAuthor;
}

export interface StoryItem {
  id: number;
  imageUrl: string;
  createdAt: string;
  author: PostAuthor;
}