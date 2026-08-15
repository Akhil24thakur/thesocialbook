import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "../auth/AuthContext";
import Icon from "../components/Icon";
import { brandGradient, colors } from "../theme";

type Step = "details" | "otp";

export default function SignupScreen({ navigation }: any) {
  const { register, sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const sendOtpCode = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your full name");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const devCode = await sendOtp(phone);
      if (devCode) {
        setOtp(devCode);
        setOtpSent(true);
        setStep("otp");
        setTimeout(() => submit(), 300);
        return;
      }
      setOtpSent(true);
      setStep("otp");
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const verified = await verifyOtp(phone, otp);
      if (!verified) {
        setError("Invalid or expired code");
        return;
      }
      await register(name.trim(), phone, password, otp);
    } catch (e: any) {
      setError(e.message ?? "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setBusy(true);
    try {
      await sendOtp(phone);
    } catch (e: any) {
      setError(e.message ?? "Failed to resend OTP");
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step === "otp") {
      setStep("details");
      setOtp("");
    } else {
      navigation.goBack();
    }
  };

  return (
    <LinearGradient colors={[colors.primaryLight, colors.background]} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Icon name="book" size={34} color={colors.white} />
            </View>
            <Text style={styles.logo}>TheSocialBook</Text>
            <Text style={styles.tagline}>Join India's social network</Text>
            <View style={styles.tricolor}>
              <View style={[styles.tricolorBar, { backgroundColor: colors.saffron }]} />
              <View style={[styles.tricolorBar, { backgroundColor: colors.white }]} />
              <View style={[styles.tricolorBar, { backgroundColor: colors.green }]} />
            </View>
          </View>

          <View style={styles.form}>
            {step === "details" && (
              <>
                <View style={styles.inputWrap}>
                  <Icon name="person-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
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
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password (min 8 characters)"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </>
            )}

            {step === "otp" && (
              <>
                <Text style={styles.otpInfo}>We sent a 6-digit code to <Text style={styles.strong}>{phone}</Text></Text>
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
                        if (next.length === 6) submit();
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </View>
                {!otpSent && <TouchableOpacity style={styles.resendBtn} onPress={sendOtpCode} disabled={busy}>
                  <Text style={styles.resendText}>Send Code</Text>
                </TouchableOpacity>}
                {otpSent && <TouchableOpacity style={styles.resendBtn} onPress={resendOtp} disabled={busy}>
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>}
              </>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.button} onPress={step === "details" ? sendOtpCode : submit} disabled={busy} activeOpacity={0.85}>
              <LinearGradient
                colors={brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{step === "details" ? "Send Code" : "Verify & Sign Up"}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={goBack}>
              <Text style={styles.linkText}>
                {step === "details"
                  ? "Already have an account? Log in"
                  : "Back to details"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  tricolor: {
    flexDirection: "row",
    marginTop: 12,
    borderRadius: 3,
    overflow: "hidden",
  },
  tricolorBar: {
    width: 28,
    height: 4,
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
  otpInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  strong: {
    fontWeight: "700",
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
  resendBtn: {
    alignItems: "center",
    marginBottom: 12,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
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
    marginTop: 16,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkStrong: {
    color: colors.primary,
    fontWeight: "700",
  },
});