import React, { useMemo } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={styles.card}>
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
        </BlurView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(128,128,128,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconWrapDanger: {
    backgroundColor: "rgba(255,59,48,0.12)",
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
    marginTop: 20,
    width: "100%",
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: "rgba(128,128,128,0.12)",
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
