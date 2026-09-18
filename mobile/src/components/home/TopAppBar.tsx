import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../Icon";
import { type Colors } from "../../theme";
import { useTheme } from "../../theme-context";

const LOGO_HEADER = require("../../../assets/brand/logo-header.png");

export default function TopAppBar({
  onNotify,
  onNewPost,
  unreadCount = 0,
}: {
  onNotify: () => void;
  onNewPost: () => void;
  unreadCount?: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
      <View style={styles.brand}>
        <Image source={LOGO_HEADER} style={styles.brandImg} resizeMode="contain" />
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onNewPost}
          accessibilityLabel="Create post"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.iconBtn}
        >
          <Icon name="add" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onNotify}
          accessibilityLabel="Notifications"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="heart-outline" size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: {
    flex: 1,
    alignItems: "flex-start",
  },
  brandImg: {
    width: 130,
    height: 32,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
});
