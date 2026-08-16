import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "../auth/AuthContext";
import BrandLogo from "../components/BrandLogo";
import Icon from "../components/Icon";
import { brandGradient, colors } from "../theme";

type Mode = "phone" | "username" | "email" | "emailOtp";

export default function LoginScreen({ navigation }: any) {
  const { login, emailSendOtp, emailLogin } = useAuth();
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const compact = kbHeight > 0;

  const submitPhone = async () => {
    setError("");
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
      await login(phone, password, true);
    } catch (e: any) {
      setError(e.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const submitUsername = async () => {
    setError("");
    if (!username.trim()) {
      setError("Enter your username");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await login(username, password, false);
    } catch (e: any) {
      setError(e.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const sendEmailOtp = async () => {
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      const devCode = await emailSendOtp(email);
      if (devCode) {
        setOtp(devCode);
        setMode("emailOtp");
        setTimeout(() => submitEmailOtp(), 300);
        return;
      }
      setMode("emailOtp");
    } catch (e: any) {
      setError(e.message ?? "Failed to send code");
    } finally {
      setBusy(false);
    }
  };

  const submitEmailOtp = async () => {
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      await emailLogin(email, otp);
    } catch (e: any) {
      setError(e.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const goBackToPhone = () => {
    if (mode === "emailOtp") setMode("email");
    else if (mode === "email") setMode("phone");
    else if (mode === "username") setMode("phone");
    else navigation.navigate("Signup");
  };

  return (
    <LinearGradient colors={[colors.primaryLight, colors.background]} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={[styles.brand, compact && styles.brandCompact]}>
          <BrandLogo size={compact ? 46 : 76} />
          <Text style={[styles.logo, compact && styles.logoCompact]}>TheSocialBook</Text>
          <Text style={[styles.tagline, compact && styles.taglineCompact]}>India's own social network</Text>
          <View style={styles.tricolor}>
            <View style={[styles.tricolorBar, { backgroundColor: colors.saffron }]} />
            <View style={[styles.tricolorBar, { backgroundColor: colors.white }]} />
            <View style={[styles.tricolorBar, { backgroundColor: colors.green }]} />
          </View>
        </View>

        <View style={styles.form}>
          {mode === "phone" && (
            <>
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
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === "username" && (
            <>
              <View style={styles.inputWrap}>
                <Icon name="person-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
              <View style={styles.inputWrap}>
                <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === "email" && (
            <>
              <Text style={styles.modeTitle}>Log in with Email</Text>
              <View style={styles.inputWrap}>
                <Icon name="mail-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </>
          )}

          {mode === "emailOtp" && (
            <>
              <Text style={styles.modeTitle}>Enter Code</Text>
              <Text style={styles.otpInfo}>We sent a 6-digit code to <Text style={styles.strong}>{email}</Text></Text>
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
                      if (next.length === 6) submitEmailOtp();
                    }}
                    autoFocus={i === 0}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.resendBtn} onPress={sendEmailOtp} disabled={busy}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={styles.button}
            onPress={
              mode === "phone" ? submitPhone : mode === "username" ? submitUsername : mode === "email" ? sendEmailOtp : submitEmailOtp
            }
            disabled={busy}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === "phone"
                    ? "Log In"
                    : mode === "username"
                    ? "Log In"
                    : mode === "email"
                    ? "Send Code"
                    : "Verify & Log In"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {mode === "phone" && (
            <>
              <TouchableOpacity style={styles.linkBtn} onPress={() => setMode("username")}>
                <Text style={styles.linkText}>
                  Log in with username instead
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => setMode("email")}>
                <Text style={styles.linkText}>
                  Log in with email instead
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.linkText}>
                  New to TheSocialBook? <Text style={styles.linkStrong}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {(mode === "email" || mode === "emailOtp") && (
            <TouchableOpacity style={styles.linkBtn} onPress={goBackToPhone}>
              <Text style={styles.linkText}>Back to phone login</Text>
            </TouchableOpacity>
          )}

          {mode === "username" && (
            <TouchableOpacity style={styles.linkBtn} onPress={goBackToPhone}>
              <Text style={styles.linkText}>Back to phone login</Text>
            </TouchableOpacity>
          )}
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
  inner: {
    flex: 1,
    justifyContent: "center",
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
  },
  taglineCompact: {
    fontSize: 12,
    marginTop: 2,
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
  modeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
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
    marginTop: 12,
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