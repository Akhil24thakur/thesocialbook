import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../Icon";
import { useHeaderHidden } from "./HeaderVisibility";
import { type Colors } from "../../theme";
import { useTheme } from "../../theme-context";

const LOGO_HEADER = require("../../../assets/brand/logo-header.png");

const BAR_CONTENT_HEIGHT = 48;

/**
 * Apple HIG-style top app bar:
 * - Translucent material-style surface with hairline separator
 * - 44pt touch targets, SF Symbol-sized icons
 * - Hides when the feed scrolls down, reveals on scroll-up
 *   (subscribes to the shared scroll signal; no prop wiring required)
 */
export default function TopAppBar({
  onNotify,
  onNewPost,
  unreadCount = 0,
  hidden: hiddenProp,
}: {
  onNotify: () => void;
  onNewPost: () => void;
  unreadCount?: number;
  hidden?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const hiddenFromScroll = useHeaderHidden();
  const hidden = hiddenProp ?? hiddenFromScroll;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: hidden ? -(BAR_CONTENT_HEIGHT + 12) : 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 3,
    }).start();
  }, [hidden, translateY]);

  return (
    <Animated.View
      style={[
        styles.bar,
        { paddingTop: insets.top, transform: [{ translateY }] },
      ]}
      accessibilityRole="header"
    >
      <View style={styles.brand}>
        <Image source={LOGO_HEADER} style={styles.brandImg} resizeMode="contain" />
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onNewPost}
          accessibilityLabel="Create post"
          accessibilityRole="button"
          style={styles.iconBtn}
        >
          <View style={styles.iconCircle}>
            <Icon name="add" size={22} color={colors.text} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onNotify}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <View style={styles.iconCircle}>
            <Icon name="heart-outline" size={21} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: Colors, isDark: boolean) => StyleSheet.create({
  bar: {
    zIndex: 20,
    elevation: 6,
    height: BAR_CONTENT_HEIGHT + 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: isDark ? colors.blurDark : colors.blurLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  brand: {
    flex: 1,
    alignItems: "flex-start",
  },
  brandImg: {
    width: 128,
    height: 30,
    marginLeft: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.fillSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: isDark ? colors.blurDark : colors.blurLight,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
});

export const TOP_APP_BAR_CONTENT_HEIGHT = BAR_CONTENT_HEIGHT;
