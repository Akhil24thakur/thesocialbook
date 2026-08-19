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
  onSelect: (key: "post" | "photo" | "live" | "reel") => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const OPTIONS = [
    { key: "post", label: "Create Post", sub: "Share text, photo and more", icon: "create-outline", color: colors.primary },
    { key: "photo", label: "Upload Photo", sub: "Add a photo to your post", icon: "image-outline", color: colors.green },
    { key: "reel", label: "Share a Reel", sub: "Add a vertical video", icon: "play-circle-outline", color: colors.pink },
    { key: "live", label: "Go Live", sub: "Broadcast to your followers", icon: "videocam-outline", color: colors.primary },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Create</Text>
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
              <View style={[styles.iconBox, { backgroundColor: `${o.color}1A` }]}>
                <Icon name={o.icon as any} size={22} color={o.color} />
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
    backgroundColor: "rgba(23,32,51,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  itemSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});