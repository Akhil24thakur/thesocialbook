import React, { useMemo, useState } from "react";
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
import { useAuth } from "../auth/AuthContext";
import BrandLogo from "../components/BrandLogo";
import Icon from "../components/Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function SignupScreen({ navigation }: any) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join SocialBook today</Text>
          </View>

          <View style={styles.form}>
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
                placeholder="Phone number or email"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                value={contact}
                onChangeText={setContact}
              />
            </View>

            <View style={styles.inputWrap}>
              <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
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
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Log in</Text>
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
    marginBottom: 36,
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
