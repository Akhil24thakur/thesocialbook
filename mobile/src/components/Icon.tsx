import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export type IconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 22, color = colors.textSecondary }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}