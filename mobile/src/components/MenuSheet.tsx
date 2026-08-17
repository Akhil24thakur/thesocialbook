import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon, { IconName } from "./Icon";
import { colors, radius } from "../theme";

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
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
              <View style={[styles.iconWrap, o.danger && styles.iconWrapDanger]}>
                <Icon name={o.icon} size={20} color={o.danger ? colors.danger : colors.primary} />
              </View>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(23,32,51,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    shadowColor: "#172033",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDanger: {
    backgroundColor: "#FDE7EE",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  labelDanger: {
    color: colors.danger,
  },
  cancel: {
    marginTop: 8,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});