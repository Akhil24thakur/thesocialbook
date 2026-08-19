import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

const USERNAME_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export default function EditProfileScreen({ navigation }: any) {
  const { token, user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const changedAt = user?.usernameChangedAt ? new Date(user.usernameChangedAt).getTime() : 0;
  const lockedUntil = changedAt + USERNAME_COOLDOWN_MS;
  const usernameLocked = changedAt > 0 && Date.now() < lockedUntil;
  const unlockDate = new Date(lockedUntil).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const save = async () => {
    if (!token || !user) return;
    setError("");
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username.trim())) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores");
      return;
    }
    setBusy(true);
    try {
      const res = await api.updateMe(token, {
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
      });
      setUser(res.user);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message ?? "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={60}
          placeholder="Full name"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={styles.label}>Username</Text>
        <View style={styles.usernameWrap}>
          <Text style={styles.usernamePrefix}>@</Text>
          <TextInput
            style={[styles.input, styles.usernameInput]}
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!usernameLocked}
            placeholder="username"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        {usernameLocked && (
          <Text style={styles.lockHint}>You can change your username again on {unlockDate}</Text>
        )}
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          maxLength={200}
          multiline
          placeholder="Tell people about yourself…"
          placeholderTextColor={colors.textSecondary}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  usernameWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  usernamePrefix: {
    fontSize: 15,
    color: colors.textSecondary,
    paddingLeft: 14,
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
  },
  lockHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  bioInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 10,
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});