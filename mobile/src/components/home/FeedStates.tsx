import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "../Icon";
import { colors } from "../../theme";

export function EmptyFeed({ compact = false }: { compact?: boolean }) {
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

export function ErrorFeed({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={[styles.wrap, styles.compact]}>
      <View style={styles.iconCircle}>
        <Icon name="cloud-offline-outline" size={34} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>Couldn't load your feed</Text>
      <Text style={styles.subtitle}>Check your connection and try again.</Text>
      <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityLabel="Try again">
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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