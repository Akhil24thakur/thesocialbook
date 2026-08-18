import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { colors, formatTime, isOnline } from "../theme";
import type { ChatMessage } from "../types";

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, name: initialName, avatarUrl: initialAvatar, otherId: initialOtherId } = route.params ?? {};
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [other, setOther] = useState<{ id: number; name: string; avatarUrl: string | null; lastSeenAt?: string | null } | null>(
    initialOtherId || initialName ? { id: initialOtherId ?? 0, name: initialName ?? "", avatarUrl: initialAvatar ?? null } : null
  );
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const meIdRef = useRef<number | null>(null);

  const { user: me } = useAuth();
  meIdRef.current = me?.id ?? null;

  const loadMeta = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.conversation(token, conversationId);
      const o = res.conversation.other;
      if (o) setOther({ id: o.id, name: o.name, avatarUrl: o.avatarUrl, lastSeenAt: o.lastSeenAt });
      navigation.setOptions({ title: o?.name ?? "Chat" });
    } catch {
      // header already set from params
    }
  }, [token, conversationId, navigation]);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!token) return;
      try {
        const res = await api.conversationMessages(token, conversationId);
        setMessages(res.messages);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    },
    [token, conversationId]
  );

  useFocusEffect(
    useCallback(() => {
      if (!initialName) loadMeta();
      loadMessages();
      const interval = setInterval(() => loadMessages(true), 5000);
      return () => clearInterval(interval);
    }, [loadMeta, loadMessages, initialName])
  );

  useEffect(() => {
    if (other?.name) navigation.setOptions({ title: other.name });
  }, [other?.name, navigation]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || !token || sending) return;
    setSending(true);
    const optimistic: ChatMessage = {
      id: Date.now(),
      body,
      senderId: meIdRef.current ?? 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res = await api.sendMessage(token, conversationId, body);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.message : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(body);
    } finally {
      setSending(false);
    }
  }, [text, token, sending, conversationId]);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === meIdRef.current;
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
          <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerUser}
          activeOpacity={0.7}
          onPress={() => other?.id && navigation.navigate("UserProfile", { userId: other.id })}
        >
          <Avatar
            name={other?.name ?? "?"}
            size={36}
            imageUrl={other?.avatarUrl}
            online={isOnline(other?.lastSeenAt)}
          />
          <View>
            <Text style={styles.headerName}>{other?.name ?? "Chat"}</Text>
            <Text style={styles.headerStatus}>
              {isOnline(other?.lastSeenAt) ? "Online" : "Tap to view profile"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        }
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          <Icon name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTime: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.75)",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 21,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});