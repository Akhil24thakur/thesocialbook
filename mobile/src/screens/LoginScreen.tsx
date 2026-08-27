import React, { useEffect, useMemo, useState } from "react";
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
import { brandGradient, type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const compact = kbHeight > 0;

  const detectType = (val: string): "phone" | "email" | "username" => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return "email";
    if (/^[6-9]\d{9}$/.test(val)) return "phone";
    return "username";
  };

  const submit = async () => {
    setError("");
    const val = identifier.trim();
    if (!val) {
      setError("Enter phone number, email, or username");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const type = detectType(val);
      await login(type === "email" ? val.toLowerCase() : val, password, type);
    } catch (e: any) {
      setError(e.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.pink]} style={styles.topGradient}>
        <View style={[styles.brand, compact && styles.brandCompact]}>
          <BrandLogo size={compact ? 48 : 80} />
          <Text style={[styles.logo, compact && styles.logoCompact]}>SocialBook</Text>
          <Text style={[styles.tagline, compact && styles.taglineCompact]}>India's own social network</Text>
        </View>
        <View style={styles.tricolor}>
          <View style={[styles.tricolorBar, { backgroundColor: colors.saffron }]} />
          <View style={[styles.tricolorBar, { backgroundColor: colors.white }]} />
          <View style={[styles.tricolorBar, { backgroundColor: colors.green }]} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.inputWrap}>
              <Icon name="person-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Phone, email, or username"
                placeholderTextColor={colors.textSecondary + "99"}
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            <View style={styles.inputWrap}>
              <Icon name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary + "99"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={submit} disabled={busy} activeOpacity={0.85}>
              <LinearGradient
                colors={brandGradient(colors)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.signupBtn} onPress={() => navigation.navigate("Signup")} activeOpacity={0.85}>
              <Text style={styles.signupText}>
                New here? <Text style={styles.signupStrong}>Create account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topGradient: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
  },
  brand: {
    alignItems: "center",
    marginBottom: 16,
  },
  brandCompact: {
    marginBottom: 6,
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.3,
    marginTop: 10,
  },
  logoCompact: {
    fontSize: 24,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    fontWeight: "500",
  },
  taglineCompact: {
    fontSize: 12,
    marginTop: 2,
  },
  tricolor: {
    flexDirection: "row",
    marginTop: 14,
    borderRadius: 3,
    overflow: "hidden",
  },
  tricolorBar: {
    width: 28,
    height: 4,
  },
  formWrap: {
    flex: 1,
    marginTop: -20,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 30,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: colors.background,
    height: 52,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
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
    borderRadius: 14,
    marginTop: 4,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  linkBtn: {
    alignItems: "center",
    marginTop: 14,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  signupBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  signupText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  signupStrong: {
    color: colors.primary,
    fontWeight: "700",
  },
});
