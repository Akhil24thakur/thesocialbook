import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { isOnline, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import { API_URL } from "../config";

type SearchUser = {
  id: number;
  name: string;
  username?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  lastSeenAt?: string | null;
};

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const runSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      const seq = ++seqRef.current;
      if (!trimmed) {
        setUsers([]);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/users/search?q=${encodeURIComponent(trimmed)}&limit=20`,
          { method: "GET", headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (!res.ok) throw new Error("Network error");
        const data = await res.json();
        if (seq !== seqRef.current) return;
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch {
        if (seq !== seqRef.current) return;
        setUsers([]);
        setError("Failed to search users");
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      seqRef.current++;
      setUsers([]);
      setError(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const searchNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  };

  const handlePress = (user: SearchUser) => {
    (navigation as any).navigate("UserProfile", { userId: user.id });
  };

  const renderUser = ({ item }: { item: SearchUser }) => {
    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => handlePress(item)}
        accessibilityLabel={`View profile for ${item.name}`}
      >
        <View style={styles.userAvatar}>
          <Avatar
            name={item.name}
            size={48}
            imageUrl={item.avatarUrl ?? null}
            online={isOnline(item.lastSeenAt)}
            verified={item.isVerified}
          />
        </View>
        <View style={styles.userDetails}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {item.isVerified && (
              <Icon name="checkmark-circle" size={16} color={colors.primary} />
            )}
          </View>
          {!!item.username && (
            <Text style={styles.userUsername}>@{item.username}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const clearInput = () => {
    setQuery("");
    setUsers([]);
    setError(null);
  };

  const showEmpty =
    !loading && !error && query.trim().length > 0 && users.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.inputWrap}>
          <Icon name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Search by username or name"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchNow}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.trim().length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={clearInput}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]}
          onPress={searchNow}
          disabled={!query.trim()}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Text style={styles.retryText} onPress={searchNow}>
            Try again
          </Text>
        </View>
      )}

      {!loading && !error && !query.trim() && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Type a username or name to find people.
          </Text>
        </View>
      )}

      {!loading && !error && showEmpty && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No users found matching "{query.trim()}".
          </Text>
        </View>
      )}

      {!loading && !error && users.length > 0 && (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    height: 48,
    padding: 0,
    fontSize: 15,
    color: colors.text,
  },
  clearBtn: {
    padding: 4,
  },
  searchBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
  },
  retryText: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  userRow: {
    flexDirection: "row",
    marginBottom: 12,
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});