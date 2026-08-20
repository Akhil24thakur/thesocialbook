export const lightColors = {
  primary: "#7C3AED",
  primaryDark: "#5B21B6",
  purple: "#A855F7",
  primaryLight: "#F3E8FF",
  saffron: "#FFB020",
  green: "#22C55E",
  online: "#22C55E",
  white: "#FFFFFF",
  background: "#FAFAFC",
  card: "#FFFFFF",
  text: "#191522",
  textSecondary: "#6E6A7A",
  border: "#ECEAF2",
  danger: "#E0245E",
  amber: "#F59E0B",
  pink: "#EC4899",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  primary: "#8B5CF6",
  primaryDark: "#7C3AED",
  purple: "#A855F7",
  primaryLight: "#241A3D",
  saffron: "#FFB020",
  green: "#34D97B",
  online: "#34D97B",
  white: "#FFFFFF",
  background: "#0B0A12",
  card: "#16141F",
  text: "#F2F0F7",
  textSecondary: "#9B96AB",
  border: "#262331",
  danger: "#FF4D7D",
  amber: "#FFB020",
  pink: "#EC4899",
};

export const colors = lightColors;

export const avatarGradient = (c: Colors): [string, string] => [c.primary, c.purple];
export const storyGradient = (c: Colors): [string, string, string] => [c.primary, c.purple, c.pink];
export const brandGradient = (c: Colors): [string, string] => [c.primary, c.pink];

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