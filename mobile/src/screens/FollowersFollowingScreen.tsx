import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";
import type { ApiUser } from "../types";

type Mode = "followers" | "following";

export default function FollowersFollowingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<{ params: { userId: number; userName: string; mode: Mode } }>();
  const { userId, userName, mode } = route.params;
  const { token, user: me } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: mode === "followers" ? `${userName}'s Followers` : `${userName} Following`,
    });
  }, [mode, userName]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = mode === "followers"
        ? await api.followers(token, userId)
        : await api.following(token, userId);
      setUsers(res.users);
      setFollowingIds(new Set(res.users.filter((u) => u.followedByMe).map((u) => u.id)));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, userId, mode]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = useCallback(
    async (target: ApiUser) => {
      if (!token || busyId) return;
      setBusyId(target.id);
      const wasFollowing = followingIds.has(target.id);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        wasFollowing ? next.delete(target.id) : next.add(target.id);
        return next;
      });
      try {
        const res = wasFollowing ? await api.unfollow(token, target.id) : await api.follow(token, target.id);
        if (res.user) {
          setFollowingIds((prev) => {
            const next = new Set(prev);
            res.user.followedByMe ? next.add(target.id) : next.delete(target.id);
            return next;
          });
        }
      } catch (e: any) {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          wasFollowing ? next.add(target.id) : next.delete(target.id);
          return next;
        });
        Alert.alert("Error", e.message ?? "Could not update follow");
      } finally {
        setBusyId(null);
      }
    },
    [token, followingIds, busyId]
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiUser }) => {
      const isMe = me?.id === item.id;
      const isFollowing = followingIds.has(item.id);
      return (
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => {
            if (isMe) {
              navigation.goBack();
              navigation.navigate("Home", { screen: "profile" });
            } else {
              navigation.goBack();
              navigation.navigate("UserProfile", { userId: item.id });
            }
          }}
        >
          <Avatar name={item.name} size={44} imageUrl={item.avatarUrl} />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {!!item.isVerified && <Icon name="checkmark-circle" size={14} color={colors.primary} />}
            </View>
            {!!item.username && <Text style={styles.username}>@{item.username}</Text>}
          </View>
          {!isMe && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={() => toggleFollow(item)}
              disabled={busyId === item.id}
            >
              {busyId === item.id ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.text : colors.white} />
              ) : (
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [me, followingIds, busyId, toggleFollow, navigation, colors]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon
              name={mode === "followers" ? "people-outline" : "person-add-outline"}
              size={48}
              color={colors.border}
            />
            <Text style={styles.emptyText}>
              {mode === "followers" ? "No followers yet" : "Not following anyone yet"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      gap: 12,
    },
    userInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    name: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    username: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },
    followBtn: {
      paddingHorizontal: 18,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.primary,
      minWidth: 80,
      alignItems: "center",
    },
    followingBtn: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    followBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.white,
    },
    followingBtnText: {
      color: colors.text,
    },
    empty: {
      alignItems: "center",
      paddingTop: 60,
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
  });
