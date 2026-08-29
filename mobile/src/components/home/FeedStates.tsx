import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "../Icon";
import { type Colors } from "../../theme";
import { useTheme } from "../../theme-context";

export function EmptyFeed({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={styles.iconCircle}>
        <Icon name="albums-outline" size={34} color={colors.primary} />
      </View>
      <Text style={styles.title}>Nothing here yet</Text>
      <Text style={styles.subtitle}>Follow people and communities to start building your feed.</Text>
    </View>
  );
}

export function ErrorFeed({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  let title = "Couldn't load your feed";
  let subtitle = "Check your connection and try again.";
  if (message) {
    if (message.includes("503") || message.includes("502")) {
      title = "Server is waking up";
      subtitle = "This takes a few seconds on first launch. Try again in a moment.";
    } else if (message.includes("Network error")) {
      title = "No internet connection";
      subtitle = "Check your WiFi or mobile data and try again.";
    } else {
      title = "Something went wrong";
      subtitle = message.length > 80 ? message.substring(0, 80) + "..." : message;
    }
  }

  return (
    <View style={[styles.wrap, styles.compact]}>
      <View style={styles.iconCircle}>
        <Icon name="cloud-offline-outline" size={34} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityLabel="Try again">
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 40,
  },
  compact: {
    paddingVertical: 36,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retry: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
  retryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});