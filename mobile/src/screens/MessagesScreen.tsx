import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { formatTime, isOnline, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import { decryptMessage, loadOrCreateKeyPair } from "../crypto";
import { onWsEvent } from "../ws";
import type { Conversation } from "../types";

const LOCK = "\u{1F512}";

export default function MessagesScreen({ active }: { active: boolean }) {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const myKeysRef = useRef<{ publicKey: string; privateKey: string } | null>(null);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadOrCreateKeyPair()
      .then((kp) => {
        myKeysRef.current = kp;
      })
      .catch(() => {});
  }, []);

  const previewText = (c: Conversation): string => {
    const last = c.lastMessage;
    if (!last) return "Say hello!";
    if (!last.body.startsWith("enc:v1:")) return last.body;
    const kp = myKeysRef.current;
    const theirKey = c.other?.publicKey;
    if (!kp || !theirKey) return `${LOCK} Encrypted message`;
    const plain = decryptMessage(last.body, kp.privateKey, theirKey);
    return plain ?? `${LOCK} Encrypted message`;
  };

  const load = useCallback(
    async (refresh = false) => {
      if (!token) return;
      if (refresh) setRefreshing(true);
      try {
        const res = await api.conversations(token);
        setConversations(res.conversations);
      } catch {
        // silent fail
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      if (!active) return;
      load();
      const interval = setInterval(() => load(), 30000);
      const msgSub = onWsEvent("message", null, () => load());
      const readSub = onWsEvent("read", null, () => load());
      return () => {
        clearInterval(interval);
        msgSub();
        readSub();
      };
    }, [active, load])
  );

  const renderItem = ({ item }: { item: Conversation }) => {
    const other = item.other;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("Chat", {
            conversationId: item.id,
            name: other?.name,
            avatarUrl: other?.avatarUrl,
          })
        }
      >
        <View style={styles.avatarWrap}>
          <Avatar name={other?.name ?? "?"} size={52} imageUrl={other?.avatarUrl} online={isOnline(other?.lastSeenAt)} verified={other?.isVerified} />
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>
            {other?.name ?? "Unknown"}
          </Text>
          <Text
            style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {previewText(item)}
          </Text>
        </View>
        <Text style={styles.time}>{item.lastMessage ? formatTime(item.lastMessage.createdAt) : ""}</Text>
      </TouchableOpacity>
    );
  };

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
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="chatbubble-ellipses-outline" size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>
              Open a user's profile, tap Message, and the conversation will show up here.
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
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
    padding: 16,
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
  avatarWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  preview: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewUnread: {
    color: colors.text,
    fontWeight: "600",
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
    alignSelf: "flex-start",
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