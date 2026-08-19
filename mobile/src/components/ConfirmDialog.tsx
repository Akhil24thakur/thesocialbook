import React, { useMemo } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon, { IconName } from "./Icon";
import { radius, type Colors } from "../theme";
import { useTheme } from "../theme-context";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  icon?: IconName;
  destructive?: boolean;
  loading?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  icon = "alert-circle-outline",
  destructive,
  loading,
  hideCancel,
  onConfirm,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, destructive && styles.iconWrapDanger]}>
            <Icon name={icon} size={26} color={destructive ? colors.danger : colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.row}>
            {!hideCancel && (
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={loading} activeOpacity={0.7}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, destructive ? styles.btnDanger : styles.btnPrimary]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.btnText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(23,32,51,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 22,
    alignItems: "center",
    shadowColor: "#172033",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconWrapDanger: {
    backgroundColor: "#FDE7EE",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
});