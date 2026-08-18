import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  AppState,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { colors, isOnline } from "../theme";
import { API_URL } from "../config";

export default function SearchScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Array<{ id: number; name: string; username?: string; avatarUrl?: string | null; isVerified?: boolean; lastSeenAt?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      const loadUsers = async (q: string) => {
        if (!q || q.trim().length === 0) {
          setUsers([]);
          setError(null);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(
            q.trim()
          )}`, {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error("Network error");
          const data = await res.json();
          setUsers(Array.isArray(data.users) ? data.users : [data.users ?? data]);
        } catch (e) {
          setError("Failed to search users");
        } finally {
          setLoading(false);
        }
      };

      const debounce = setTimeout(() => {
        loadUsers(query);
      }, 300);
      return () => clearTimeout(debounce);
    }, [query, token])
  );

  const handlePress = (user: any) => {
    ;(navigation as any).navigate("UserProfile", { userId: user.id });
  };

  const renderUser = ({ item }: { item: any }) => {
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
          <Text style={styles.userName}>{item.name}</Text>
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
    if (inputRef.current) {
      inputRef.current.blur?.();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={clearInput}>
          Try again
        </Text>
      </View>
    );
  }

  if (users.length === 0 && query.trim().length > 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No users found matching "{query}"</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search users…"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={colors.textSecondary}
        />
        {query.trim().length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearInput}>
            <Icon name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  header: {
    padding: 16,
    paddingTop: 16,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    color: colors.text,
  },
  clearBtn: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -8 }],
    opacity: 1,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    padding: 24,
    alignItems: "center",
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    marginBottom: 8,
  },
  retryText: {
    color: colors.primary,
    fontSize: 14,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
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
    backgroundColor: colors.white,
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
  userUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});