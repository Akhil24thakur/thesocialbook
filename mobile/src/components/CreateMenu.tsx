import React, { useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "./Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function CreateMenu({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: "post" | "photo" | "live") => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const OPTIONS = [
    { key: "post", label: "Post", sub: "Share what's on your mind", icon: "create-outline" },
    { key: "photo", label: "Photo", sub: "Share a photo", icon: "image-outline" },
    { key: "live", label: "Live video", sub: "Go live with your audience", icon: "videocam-outline" },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Create new</Text>
          {OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={styles.item}
              onPress={() => {
                onClose();
                onSelect(o.key);
              }}
              accessibilityLabel={o.label}
            >
              <View style={styles.iconCircle}>
                <Icon name={o.icon as any} size={22} color={colors.text} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>{o.label}</Text>
                <Text style={styles.itemSub}>{o.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  itemSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
