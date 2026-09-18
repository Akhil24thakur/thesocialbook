import { useWindowDimensions } from "react-native";

/**
 * Apple HIG-aligned design system for SocialBook.
 * Light & dark palettes use system colors (Apple systemGray/blue/green/red).
 * Typography mirrors SF text styles. Spacing uses the 4pt grid.
 * All legacy keys (primary, purple, ...) remain for backward compatibility.
 */

export const lightColors = {
  // Brand / semantic
  primary: "#0A0A0A",
  primaryDark: "#171717",
  purple: "#6366F1",
  primaryLight: "#F2F2F7", // systemGroupedBackground fill
  saffron: "#FF9500",
  green: "#34C759",
  online: "#34C759",
  white: "#FFFFFF",
  background: "#F2F2F7", // iOS systemGroupedBackground
  card: "#FFFFFF",
  text: "#0A0A0A",
  textSecondary: "#8E8E93", // systemGray
  border: "#E5E5EA", // separator
  danger: "#FF3B30", // systemRed
  amber: "#FF9500", // systemOrange
  pink: "#FF2D55",
  accent: "#007AFF", // systemBlue
  tint: "#007AFF",
  surface: "#FFFFFF",
  separator: "#E5E5EA",
  systemGroupedBackground: "#F2F2F7",
  systemBackground: "#FFFFFF",
  elevated: "#FFFFFF",
  labelPrimary: "#0A0A0A",
  labelSecondary: "#3C3C43",
  labelTertiary: "#8E8E93",
  fillPrimary: "#787880",
  fillSecondary: "#78788033", // 20% fill
  fillTertiary: "#78788052", // 32% fill
  blurLight: "rgba(255,255,255,0.72)",
  blurDark: "rgba(28,28,30,0.72)",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  ...lightColors,
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
  tint: "#0A84FF",
  surface: "#1C1C1E",
  separator: "#38383A",
  systemGroupedBackground: "#000000",
  systemBackground: "#1C1C1E",
  elevated: "#2C2C2E",
  labelPrimary: "#FFFFFF",
  labelSecondary: "#EBEBF599",
  labelTertiary: "#EBEBF545",
  fillPrimary: "#787880",
  fillSecondary: "#78788033",
  fillTertiary: "#7878805C",
  blurLight: "rgba(255,255,255,0.72)",
  blurDark: "rgba(28,28,30,0.72)",
};

export const colors = lightColors;

export const avatarGradient = (c: Colors): [string, string] => [c.accent, c.purple];
export const storyGradient = (c: Colors): [string, string, string] => ["#F58529", "#DD2A7B", "#8134AF"];
export const brandGradient = (c: Colors): [string, string] => [c.accent, "#0077ED"];

/** 4pt spacing grid */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/** SF text style scale (approximate pt sizes) */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "400" as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "400" as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "400" as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: "600" as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400" as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400" as const },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: "400" as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: "400" as const },
};

/** Continuous-corner radii (Apple-style) */
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
};

/** Responsive breakpoints (HIG layout adaptivity) */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isPhone: width < 430,
    isTablet: width >= 768,
    isLandscape: width > height,
    columns: width >= 768 ? 2 : 1,
    gutter: width >= 768 ? 32 : 16,
  };
};

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export function isOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < ONLINE_WINDOW_MS;
}

export const formatTime = (iso: string) => {
  const date = new Date(ipattern);
  return "";
};

export const formatCount = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
};
