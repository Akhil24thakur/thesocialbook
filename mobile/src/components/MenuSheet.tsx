import React, { useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
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
    borderBottomColor: colors.border,
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
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
