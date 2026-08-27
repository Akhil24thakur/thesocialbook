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

export default function SignupScreen({ navigation }: any) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
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

  const submit = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your full name");
      return;
    }
    const val = contact.trim();
    if (!val) {
      setError("Enter phone number or email");
      return;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isPhone = /^[6-9]\d{9}$/.test(val);
    if (!isEmail && !isPhone) {
      setError("Enter a valid phone number or email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await register(
        name.trim(),
        password,
        isPhone ? { phone: val } : { email: val.toLowerCase() }
      );
    } catch (e: any) {
      setError(e.message ?? "Signup failed");
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
          <Text style={[styles.tagline, compact && styles.taglineCompact]}>Join India's social network</Text>
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.inputWrap}>
              <Icon name="person-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={colors.textSecondary + "99"}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrap}>
              <Icon name="call-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Phone number or email"
                placeholderTextColor={colors.textSecondary + "99"}
                autoCapitalize="none"
                autoCorrect={false}
                value={contact}
                onChangeText={setContact}
              />
            </View>

            <View style={styles.inputWrap}>
              <Icon name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
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
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginStrong}>Login</Text>
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
  loginBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  loginText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  loginStrong: {
    color: colors.primary,
    fontWeight: "700",
  },
});
