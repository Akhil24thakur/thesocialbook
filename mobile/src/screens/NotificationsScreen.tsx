import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { colors, formatTime } from "../theme";
import type { Post } from "../types";

const UPDATES = [
  {
    icon: "sparkles-outline",
    title: "New Home experience",
    body: "We redesigned your feed with stories, tabs and a fresh look.",
    time: "2d ago",
  },
  {
    icon: "camera-outline",
    title: "Photo sharing is live",
    body: "You can now add photos to your posts.",
    time: "5d ago",
  },
  {
    icon: "people-outline",
    title: "Groups & Messages",
    body: "New tabs to help you connect with friends.",
    time: "1w ago",
  },
];

type Item =
  | { type: "post"; post: Post }
  | { type: "update"; icon: string; title: string; body: string; time: string };

export default function NotificationsScreen() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!token) return;
      refresh && setRefreshing(true);
      try {
        const res = await api.feed(token);
        setPosts(res.posts);
      } catch {} finally {
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const friends = posts.filter((p) => p.author.id !== user?.id).slice(0, 8);

  const items: Item[] = [
    ...friends.map((p) => ({ type: "post" as const, post: p })),
    ...UPDATES.map((u) => ({ type: "update" as const, ...u })),
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) =>
          item.type === "post" ? (
            <View style={styles.row}>
              <Avatar name={item.post.author.name} size={44} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>
                  <Text style={styles.strong}>{item.post.author.name}</Text> posted
                </Text>
                <Text style={styles.rowPreview} numberOfLines={2}>
                  {item.post.content || "Shared a photo"}
                </Text>
              </View>
              <Text style={styles.time}>{formatTime(item.post.createdAt)}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={styles.updateIcon}>
                <Icon name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowPreview} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="notifications-off-outline" size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>New posts from friends will show up here.</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
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
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  rowBody: {
    flex: 1,
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
    alignSelf: "flex-start",
  },
  updateIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
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