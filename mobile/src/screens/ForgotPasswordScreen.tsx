import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import BrandLogo from "../components/BrandLogo";
import Icon from "../components/Icon";
import { brandGradient, type Colors } from "../theme";
import { useTheme } from "../theme-context";

type Step = "phone" | "code";

export default function ForgotPasswordScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const compact = kbHeight > 0;

  const sendCode = async () => {
    setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setBusy(true);
    try {
      const res = await api.forgotPassword(phone);
      if (res.devCode) {
        setOtp(res.devCode);
        setStep("code");
        setTimeout(() => reset(), 300);
        return;
      }
      setStep("code");
    } catch (e: any) {
      setError(e.message ?? "Failed to send code");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code");
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
    setBusy(true);
    try {
      await api.resetPassword(phone, otp, newPassword);
      await logout();
      setBusy(false);
      Alert.alert("Password Reset", "Your password has been reset. Log in with your new password.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (e: any) {
      setError(e.message ?? "Reset failed");
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step === "code") {
      setStep("phone");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      navigation.goBack();
    }
  };

  return (
    <LinearGradient colors={[colors.primaryLight, colors.background]} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.brand, compact && styles.brandCompact]}>
            <BrandLogo size={compact ? 46 : 76} />
            <Text style={[styles.logo, compact && styles.logoCompact]}>Reset Password</Text>
            <Text style={[styles.tagline, compact && styles.taglineCompact]}>
              {step === "phone" ? "Enter your registered mobile number" : "Enter the code and a new password"}
            </Text>
          </View>

          <View style={styles.form}>
            {step === "phone" && (
              <View style={styles.inputWrap}>
                <Icon name="call-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Mobile number (10 digits)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  autoFocus
                />
              </View>
            )}

            {step === "code" && (
              <>
                <Text style={styles.info}>
                  We sent a 6-digit code to <Text style={styles.strong}>{phone}</Text>
                </Text>
                <View style={styles.otpWrap}>
                  {[...Array(6)].map((_, i) => (
                    <TextInput
                      key={i}
                      style={styles.otpBox}
                      maxLength={1}
                      keyboardType="number-pad"
                      textAlign="center"
                      value={otp[i] ?? ""}
                      onChangeText={(t) => {
                        const next = otp.slice(0, i) + t + otp.slice(i + 1);
                        setOtp(next);
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </View>
                <View style={styles.inputWrap}>
                  <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="New password (min 8 characters)"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showNew}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showNew ? "Hide password" : "Show password"}
                  >
                    <Icon name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrap}>
                  <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
                  >
                    <Icon name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={styles.button}
              onPress={step === "phone" ? sendCode : reset}
              disabled={busy}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={brandGradient(colors)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{step === "phone" ? "Send Code" : "Reset Password"}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={goBack}>
              <Text style={styles.linkText}>{step === "phone" ? "Back to login" : "Back to phone number"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  brand: {
    alignItems: "center",
    marginBottom: 28,
  },
  brandCompact: {
    marginBottom: 10,
  },
  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.2,
    marginTop: 8,
  },
  logoCompact: {
    fontSize: 22,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  taglineCompact: {
    fontSize: 12,
    marginTop: 2,
  },
  form: {
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
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  strong: {
    fontWeight: "700",
    color: colors.text,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  otpWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  linkBtn: {
    alignItems: "center",
    marginTop: 14,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});