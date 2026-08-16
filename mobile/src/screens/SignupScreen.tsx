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

export default function SignupScreen({ navigation }: any) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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

  const submit = async () => {
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
      await register(name.trim(), phone, password);
    } catch (e: any) {
      setError(e.message ?? "Signup failed");
    } finally {
      setBusy(false);
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
            <Text style={[styles.logo, compact && styles.logoCompact]}>TheSocialBook</Text>
            <Text style={[styles.tagline, compact && styles.taglineCompact]}>Join India's social network</Text>
            <View style={styles.tricolor}>
              <View style={[styles.tricolorBar, { backgroundColor: colors.saffron }]} />
              <View style={[styles.tricolorBar, { backgroundColor: colors.white }]} />
              <View style={[styles.tricolorBar, { backgroundColor: colors.green }]} />
            </View>
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

            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.button} onPress={submit} disabled={busy} activeOpacity={0.85}>
              <LinearGradient
                colors={brandGradient}
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
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkStrong}>Log in</Text>
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