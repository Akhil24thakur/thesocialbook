import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon, { type IconName } from "../components/Icon";
import { colors, formatTime } from "../theme";
import { setPendingPush } from "../pushBadge";
import type { Notification } from "../types";

export default function NotificationsScreen({ navigation }: any) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    setPendingPush(false);
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [notifsRes, unreadRes] = await Promise.all([
        api.notifications(token),
        api.notificationsUnreadCount(token),
      ]);
      setNotifications(notifsRes.notifications);
      if (unreadRes.unreadCount > 0) {
        // Opening the screen marks everything as read, but keep the
        // current view highlighted so the user sees what was new.
        api.notificationsMarkRead(token).catch(() => {});
      }
    } catch {
      // silent fail
    } finally {
      setRefreshing(false);
      setLoading(false);
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
      reply: "arrow-undo-outline",
      follow: "person-add-outline",
      post: "megaphone-outline",
      message: "chatbubble-ellipses-outline",
    };
    const typeColors: Record<string, string> = {
      like: colors.danger,
      comment: colors.primary,
      reply: colors.primary,
      follow: colors.green,
      post: colors.amber,
      message: colors.primary,
    };
    const typeText: Record<string, string> = {
      like: "liked your post",
      comment: "commented on your post",
      reply: "replied to your comment",
      follow: "started following you",
      post: "posted something new",
      message: "sent you a message",
    };

    const isMessage = item.type === "message";

    return (
      <TouchableOpacity
        style={[
          styles.row,
          !item.read && styles.unread,
        ]}
        onPress={() => {
          if (item.conversation) {
            navigation.navigate("Chat", {
              conversationId: item.conversation.id,
              name: item.actor.name,
              avatarUrl: item.actor.avatarUrl,
              otherId: item.actor.id,
            });
          } else if (item.post) {
            navigation.navigate("PostDetail", { postId: item.post.id });
          } else {
            navigation.navigate("UserProfile", { userId: item.actor.id });
          }
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("UserProfile", { userId: item.actor.id })}
          activeOpacity={0.7}
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
        </TouchableOpacity>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>
            <Text
              style={styles.strong}
              onPress={() => navigation.navigate("UserProfile", { userId: item.actor.id })}
            >
              {item.actor.name}
            </Text>
            {item.actor.isVerified && (
              <Text style={styles.verified}> ✓</Text>
            )}{" "}
            {typeText[item.type] ?? "posted something new"}
          </Text>
          {item.messageBody ? (
            <Text style={styles.rowPreview} numberOfLines={2}>
              {item.messageBody}
            </Text>
          ) : (
            item.post && (
              <Text style={styles.rowPreview} numberOfLines={2}>
                {item.post.content ?? "Shared a photo"}
              </Text>
            )
          )}
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          {isMessage && item.conversation && (
            <TouchableOpacity
              style={styles.replyBtn}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate("Chat", {
                  conversationId: item.conversation!.id,
                  name: item.actor.name,
                  avatarUrl: item.actor.avatarUrl,
                  otherId: item.actor.id,
                })
              }
            >
              <Icon name="arrow-undo-outline" size={15} color={colors.white} />
              <Text style={styles.replyBtnText}>Reply</Text>
            </TouchableOpacity>
          )}
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
  verified: {
    color: colors.primary,
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
  replyBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },
  replyBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
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