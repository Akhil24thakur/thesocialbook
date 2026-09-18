import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { avatarGradient, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import Icon from "./Icon";

const AVATAR_COLORS = ["#0A0A0A", "#E0245E", "#34C759", "#FF9500", "#6366F1", "#0095F6", "#FF2D55", "#059669"];

export default function Avatar({
  name,
  size = 40,
  gradient = false,
  online = false,
  verified = false,
  imageUrl = null,
}: {
  name: string;
  size?: number;
  gradient?: boolean;
  online?: boolean;
  verified?: boolean;
  imageUrl?: string | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = AVATAR_COLORS[(name.charCodeAt(0) + name.length) % AVATAR_COLORS.length];
  const dot = Math.max(10, size * 0.22);
  const badge = Math.max(14, size * 0.38);

  return (
    <View style={{ width: size, height: size }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      ) : gradient ? (
        <LinearGradient
          colors={avatarGradient(colors)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}
      {verified && (
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: badge / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <Icon name="checkmark" size={badge * 0.62} color={colors.white} />
        </View>
      )}
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              borderWidth: Math.max(2, dot * 0.16),
              bottom: dot * 0.08,
              right: dot * 0.08,
            },
          ]}
        />
      )}
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.white,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    backgroundColor: colors.online,
    borderColor: colors.card,
  },
});
