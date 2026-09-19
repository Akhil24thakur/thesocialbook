import React, { useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import Icon, { IconName } from "./Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

export interface MenuOption {
  label: string;
  icon: IconName;
  danger?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title?: string;
  options: MenuOption[];
  onClose: () => void;
}

export default function MenuSheet({ visible, title, options, onClose }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <BlurView intensity={isDark ? 50 : 70} tint={isDark ? "dark" : "light"} style={{ flex: 1 }}>
            <View style={styles.content}>
              <View style={styles.handle} />
              {!!title && <Text style={styles.title}>{title}</Text>}
              {options.map((o) => (
                <TouchableOpacity
                  key={o.label}
                  style={styles.item}
                  onPress={() => {
                    onClose();
                    o.onPress();
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name={o.icon} size={20} color={o.danger ? colors.danger : colors.text} />
                  <Text style={[styles.label, o.danger && styles.labelDanger]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    overflow: "hidden",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  labelDanger: {
    color: colors.danger,
  },
  cancel: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
