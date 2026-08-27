import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "../Icon";
import { brandGradient, type Colors } from "../../theme";
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
    <LinearGradient colors={[colors.primary, colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          onPress={onNewPost}
          accessibilityLabel="Create post"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.createWrap}
        >
          <View style={styles.createBtn}>
            <Icon name="add" size={22} color={colors.white} />
          </View>
        </TouchableOpacity>
        <View style={styles.brand}>
          <Image source={LOGO_HEADER} style={styles.brandImg} resizeMode="contain" />
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onNotify}
          accessibilityLabel="Notifications"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="notifications-outline" size={22} color={colors.white} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },
  createWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    flex: 1,
    alignItems: "center",
  },
  brandImg: {
    width: 132,
    height: 34,
    tintColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
});
