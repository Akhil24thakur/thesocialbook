export const lightColors = {
  primary: "#2196F3",
  primaryDark: "#1A7FDE",
  purple: "#6C63FF",
  primaryLight: "#E3F2FD",
  saffron: "#FF9933",
  green: "#22C55E",
  online: "#22C55E",
  white: "#FFFFFF",
  background: "#F8F9FC",
  card: "#FFFFFF",
  text: "#172033",
  textSecondary: "#6F7480",
  border: "#ECEFF3",
  danger: "#E0245E",
  amber: "#F59E0B",
  pink: "#EC4899",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  primary: "#2196F3",
  primaryDark: "#0D6BD1",
  purple: "#7C74FF",
  primaryLight: "#1E3A5F",
  saffron: "#FFA940",
  green: "#34D97B",
  online: "#34D97B",
  white: "#FFFFFF",
  background: "#0E1116",
  card: "#1A202B",
  text: "#ECF1F8",
  textSecondary: "#9AA4B2",
  border: "#2A3140",
  danger: "#FF4D7D",
  amber: "#FFB020",
  pink: "#FF6BA9",
};

export const colors = lightColors;

export const avatarGradient = (c: Colors): [string, string] => [c.primary, c.purple];
export const storyGradient = (c: Colors): [string, string, string] => [c.primary, c.purple, c.pink];
export const brandGradient = (c: Colors): [string, string] => [c.primary, c.primaryDark];

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
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
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const formatCount = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
};