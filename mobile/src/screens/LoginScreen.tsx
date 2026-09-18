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
import { useAuth } from "../auth/AuthContext";
import BrandLogo from "../components/BrandLogo";
import Icon from "../components/Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <BrandLogo size={56} />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Icon name="person-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Phone, email, or username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={setIdentifier}
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
              >
                <Icon
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={submit} disabled={busy} activeOpacity={0.8}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.footerLink}>Sign up</Text>
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
    backgroundColor: colors.card,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
  },
  form: {
    gap: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: colors.background,
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
    textAlign: "center",
    marginBottom: 4,
  },
  button: {
    backgroundColor: colors.accent,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  linkBtn: {
    alignItems: "center",
    marginTop: 8,
  },
  linkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
});
