import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../Icon";
import { colors } from "../../theme";

export default function TopAppBar({
  onMenu,
  onNotify,
  onNewPost,
}: {
  onMenu: () => void;
  onNotify: () => void;
  onNewPost: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onMenu}
        accessibilityLabel="Menu"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="menu" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.brand}>
        <Text style={styles.brandText}>
          <Text style={styles.brandDark}>The</Text>
          <Text style={styles.brandAccent}>Social</Text>
          <Text style={styles.brandDark}>Book</Text>
        </Text>
      </View>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onNewPost}
        accessibilityLabel="Create post"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="create" size={24} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onNotify}
        accessibilityLabel="Notifications"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="notifications-outline" size={24} color={colors.text} />
        <View style={styles.badge} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    flex: 1,
    alignItems: "center",
  },
  brandText: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
    fontFamily: "Caveat_700Bold",
  },
  brandDark: {
    color: colors.text,
  },
  brandAccent: {
    color: colors.primary,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
});