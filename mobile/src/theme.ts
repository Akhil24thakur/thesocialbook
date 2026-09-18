export const lightColors = {
  primary: "#0A0A0A",
  primaryDark: "#171717",
  purple: "#6366F1",
  primaryLight: "#F5F5F5",
  saffron: "#FF9500",
  green: "#34C759",
  online: "#34C759",
  white: "#FFFFFF",
  background: "#FAFAFA",
  card: "#FFFFFF",
  text: "#0A0A0A",
  textSecondary: "#8E8E93",
  border: "#E5E5EA",
  danger: "#FF3B30",
  amber: "#FF9500",
  pink: "#FF2D55",
  accent: "#0095F6",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  primary: "#FFFFFF",
  primaryDark: "#E5E5E5",
  purple: "#818CF8",
  primaryLight: "#1C1C1E",
  saffron: "#FF9F0A",
  green: "#30D158",
  online: "#30D158",
  white: "#FFFFFF",
  background: "#000000",
  card: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  border: "#38383A",
  danger: "#FF453A",
  amber: "#FF9F0A",
  pink: "#FF375F",
  accent: "#0A84FF",
};

export const colors = lightColors;

export const avatarGradient = (c: Colors): [string, string] => [c.primary, "#6366F1"];
export const storyGradient = (c: Colors): [string, string, string] => ["#F58529", "#DD2A7B", "#8134AF"];
export const brandGradient = (c: Colors): [string, string] => [c.accent, "#0077ED"];

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export function isOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_WINDOW_MS;
}

export const formatTime = (iso: string) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const formatCount = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
};
