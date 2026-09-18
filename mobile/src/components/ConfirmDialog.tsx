import React, { useMemo } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon, { IconName } from "./Icon";
import { type Colors } from "../theme";
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
            <Icon name={icon} size={24} color={destructive ? colors.danger : colors.accent} />
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
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconWrapDanger: {
    backgroundColor: "rgba(255,59,48,0.1)",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
});
