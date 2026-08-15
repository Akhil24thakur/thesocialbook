import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "../Icon";
import { colors } from "../../theme";

export type FeedTab = "foryou" | "following" | "trending";

const TABS: { key: FeedTab; label: string; icon: string }[] = [
  { key: "foryou", label: "For You", icon: "flame-outline" },
  { key: "following", label: "Following", icon: "people-outline" },
  { key: "trending", label: "Trending", icon: "trending-up-outline" },
];

export default function FeedTabs({ active, onChange }: { active: FeedTab; onChange: (t: FeedTab) => void }) {
  return (
    <View style={styles.row}>
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.tab}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon name={t.icon as any} size={17} color={isActive ? colors.primary : colors.textSecondary} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
            {isActive && <View style={styles.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 12,
    shadowColor: "#172033",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  underline: {
    position: "absolute",
    bottom: 0,
    width: 36,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
});