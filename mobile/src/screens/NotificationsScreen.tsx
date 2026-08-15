import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon, { type IconName } from "../components/Icon";
import { colors, formatTime } from "../theme";
import type { Notification } from "../types";

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [notifsRes, unreadRes] = await Promise.all([
        api.notifications(token),
        api.notificationsUnreadCount(token),
      ]);
      setNotifications(notifsRes.notifications);
      setUnreadCount(unreadRes.unreadCount);
    } catch {
      // silent fail
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await api.notificationsMarkRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent fail
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const renderItem = ({ item }: { item: Notification }) => {
    const typeIcons: Record<string, IconName> = {
      like: "heart-outline",
      comment: "chatbox-ellipses-outline",
      follow: "person-add-outline",
    };
    const typeColors: Record<string, string> = {
      like: colors.danger,
      comment: colors.primary,
      follow: colors.green,
    };

    return (
      <TouchableOpacity
        style={[
          styles.row,
          !item.read && styles.unread,
        ]}
        onPress={() => {
          // TODO: Navigate to post/user
        }}
      >
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconBg,
              { backgroundColor: typeColors[item.type] + "20" },
            ]}
          >
            <Icon
              name={typeIcons[item.type]}
              size={20}
              color={typeColors[item.type]}
            />
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>
            <Text style={styles.strong}>{item.actor.name}</Text>{" "}
            {item.type === "like"
              ? "liked your post"
              : item.type === "comment"
              ? "commented on your post"
              : "started following you"}
          </Text>
          {item.post && (
            <Text style={styles.rowPreview} numberOfLines={2}>
              {item.post.content ?? "Shared a photo"}
            </Text>
          )}
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="notifications-off-outline" size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>Likes, comments, and follows will appear here.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  markReadBtn: {
    padding: 12,
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  markReadText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  unread: {
    backgroundColor: colors.primaryLight,
  },
  iconWrap: {
    position: "relative",
    width: 44,
    height: 44,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.card,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    color: colors.text,
  },
  strong: {
    fontWeight: "700",
  },
  rowPreview: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  empty: {
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E8EBF1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});