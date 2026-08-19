import { Ionicons } from "@expo/vector-icons";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

export type IconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 22, color }: IconProps) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.textSecondary} />;
}