import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Icon, { type IconName } from "../components/Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function ChangePasswordScreen({ navigation }: any) {
  const { token, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const submit = async () => {
    setError("");
    if (!currentPassword) {
      setError("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the current one");
      return;
    }
    if (!token) return;
    setBusy(true);
    try {
      await api.changePassword(token, currentPassword, newPassword);
      setBusy(false);
      Alert.alert("Password Changed", "Your password has been updated. Please log in again.", [
        { text: "OK", onPress: () => logout() },
      ]);
    } catch (e: any) {
      setError(e.message ?? "Could not change password");
      setBusy(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    visible: boolean,
    toggle: () => void,
    placeholder: string,
    icon: IconName,
    autoFocus = false
  ) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Icon name={icon} size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChange}
          autoFocus={autoFocus}
        />
        <TouchableOpacity
          onPress={toggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
        >
          <Icon name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.info}>
            Choose a strong password you haven't used elsewhere.
          </Text>
          {renderField(
            "Current password",
            currentPassword,
            setCurrentPassword,
            showCurrent,
            () => setShowCurrent((v) => !v),
            "Your current password",
            "lock-closed-outline",
            true
          )}
          {renderField(
            "New password",
            newPassword,
            setNewPassword,
            showNew,
            () => setShowNew((v) => !v),
            "Min 8 characters",
            "lock-open-outline"
          )}
          {renderField(
            "Confirm new password",
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            () => setShowConfirm((v) => !v),
            "Repeat the new password",
            "shield-checkmark-outline"
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Change Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotText}>Forgot your current password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  info: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  forgotBtn: {
    alignItems: "center",
    marginTop: 14,
  },
  forgotText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});