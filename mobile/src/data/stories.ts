import { StoryGroup } from "../components/home/StoryViewer";
import type { Post, StoryItem } from "../types";

const now = Date.now();
const mins = (n: number) => new Date(now - n * 60000).toISOString();

export function storyGroupsFromApi(stories: StoryItem[]): StoryGroup[] {
  const groups: StoryGroup[] = [];
  const byAuthor = new Map<number, StoryItem[]>();
  for (const s of stories) {
    const list = byAuthor.get(s.author.id) ?? [];
    list.push(s);
    byAuthor.set(s.author.id, list);
  }
  for (const [authorId, list] of byAuthor) {
    const first = list[0];
    groups.push({
      name: first.author.name,
      avatarUrl: first.author.avatarUrl,
      stories: list.map((s) => ({
        id: s.id,
        name: first.author.name,
        content: "",
        imageUrl: s.imageUrl,
        createdAt: s.createdAt,
      })),
    });
  }
  return groups;
}

export function storyGroupsFromPosts(posts: Post[], cap = 9, excludeUserId?: number): StoryGroup[] {
  const seen = new Set<number>();
  const groups: StoryGroup[] = [];
  for (const p of posts) {
    if (p.author.id === excludeUserId) continue;
    if (seen.has(p.author.id)) continue;
    seen.add(p.author.id);
    groups.push({
      name: p.author.name,
      avatarUrl: p.author.avatarUrl,
      stories: [
        { name: p.author.name, content: p.content, imageUrl: p.imageUrl, createdAt: p.createdAt },
      ],
    });
  }
  for (const g of MOCK_STORY_GROUPS) {
    if (groups.length >= cap) break;
    groups.push(g);
  }
  return groups.slice(0, cap);
}

export const MOCK_STORY_GROUPS: StoryGroup[] = [
  {
    name: "Ishaan Gupta",
    stories: [
      { name: "Ishaan Gupta", content: "Morning run done. Feeling unstoppable!", createdAt: mins(12), imageUrl: null },
      { name: "Ishaan Gupta", content: "Beat my personal best today!", createdAt: mins(10), imageUrl: null },
      { name: "Ishaan Gupta", content: "Post-run breakfast is the best breakfast.", createdAt: mins(8), imageUrl: null },
    ],
  },
  {
    name: "Sneha Reddy",
    stories: [
      { name: "Sneha Reddy", content: "New place, new beginnings. Hyderabad here I come!", createdAt: mins(40), imageUrl: null },
      { name: "Sneha Reddy", content: "Unpacked everything. The balcony view is unreal.", createdAt: mins(35), imageUrl: null },
    ],
  },
  {
    name: "Vikram Singh",
    stories: [
      { name: "Vikram Singh", content: "Weekend trip loading...", createdAt: mins(90), imageUrl: null },
      { name: "Vikram Singh", content: "Bags packed. Leaving in 2 hours!", createdAt: mins(85), imageUrl: null },
      { name: "Vikram Singh", content: "On the road now. Music on.", createdAt: mins(80), imageUrl: null },
    ],
  },
  {
    name: "Ananya Iyer",
    stories: [
      { name: "Ananya Iyer", content: "Made filter coffee at home. Chef mode on.", createdAt: mins(150), imageUrl: null },
      { name: "Ananya Iyer", content: "Update: it tastes exactly like the café one. Proud moment.", createdAt: mins(145), imageUrl: null },
    ],
  },
  {
    name: "Karan Mehta",
    stories: [
      { name: "Karan Mehta", content: "Gym day. No excuses.", createdAt: mins(200), imageUrl: null },
    ],
  },
  {
    name: "Diya Nair",
    stories: [
      { name: "Diya Nair", content: "Mood: fresh start. Anyone else?", createdAt: mins(260), imageUrl: null },
      { name: "Diya Nair", content: "Cleaned my whole desk setup. Productivity mode.", createdAt: mins(255), imageUrl: null },
      { name: "Diya Nair", content: "New headphones in. This playlist hits different.", createdAt: mins(250), imageUrl: null },
    ],
  },
  {
    name: "Rahul Joshi",
    stories: [
      { name: "Rahul Joshi", content: "First cricket match of the season!", createdAt: mins(400), imageUrl: null },
      { name: "Rahul Joshi", content: "Won the toss. Batting first.", createdAt: mins(395), imageUrl: null },
    ],
  },
  {
    name: "Fatima Khan",
    stories: [
      { name: "Fatima Khan", content: "Sunset on the terrace. So peaceful.", createdAt: mins(600), imageUrl: null },
      { name: "Fatima Khan", content: "Golden hour selfie incoming tomorrow.", createdAt: mins(595), imageUrl: null },
    ],
  },
];