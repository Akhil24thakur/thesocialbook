export const colors = {
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

export const avatarGradient: [string, string] = [colors.primary, colors.purple];
export const storyGradient: [string, string, string] = [colors.primary, colors.purple, colors.pink];
export const brandGradient: [string, string] = [colors.primary, colors.primaryDark];

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

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