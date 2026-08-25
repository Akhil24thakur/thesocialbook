import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api";
import { attachKeyboardHeight } from "../../modules/notification-reply";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { formatTime, isOnline, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import { decryptMessage, encryptMessage, loadOrCreateKeyPair } from "../crypto";
import { onWsEvent } from "../ws";
import type { ChatMessage } from "../types";

const CANNOT_DECRYPT = "\u{1F512} This message cannot be decrypted";

const URL_RE = /(https?:\/\/[^\s]+)/g;

const isUrl = (s: string) => /^https?:\/\//.test(s);

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

type ChatRow =
  | { key: string; kind: "header"; label: string }
  | { key: string; kind: "msg"; msg: ChatMessage };

function buildRows(messages: ChatMessage[]): ChatRow[] {
  const rows: ChatRow[] = [];
  let last = "";
  for (const m of messages) {
    const label = dayLabel(m.createdAt);
    if (label !== last) {
      rows.push({ key: `h-${m.id}`, kind: "header", label });
      last = label;
    }
    rows.push({ key: `m-${m.id}`, kind: "msg", msg: m });
  }
  return rows;
}

export default function ChatScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { conversationId, name: initialName, avatarUrl: initialAvatar, otherId: initialOtherId } = route.params ?? {};
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [other, setOther] = useState<{
    id: number;
    name: string;
    avatarUrl: string | null;
    isVerified?: boolean;
    lastSeenAt?: string | null;
    publicKey?: string | null;
  } | null>(
    initialOtherId || initialName ? { id: initialOtherId ?? 0, name: initialName ?? "", avatarUrl: initialAvatar ?? null } : null
  );
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const textRef = useRef("");
  const [sending, setSending] = useState(false);
  const [revealedId, setRevealedId] = useState<number | null>(null);
  const [kbPad, setKbPad] = useState(0);
  const nativeKbRef = useRef(0);
  const listRef = useRef<FlatList>(null);
  const meIdRef = useRef<number | null>(null);
  const myKeysRef = useRef<{ publicKey: string; privateKey: string } | null>(null);
  const rows = useMemo(() => buildRows(messages), [messages]);

  useEffect(() => {
    const sub = attachKeyboardHeight((h) => {
      nativeKbRef.current = h;
      setKbPad(h);
    });
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKbPad((prev) => (nativeKbRef.current > 0 ? prev : e.endCoordinates.height))
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKbPad((prev) => (nativeKbRef.current > 0 ? prev : 0))
    );
    return () => {
      sub?.remove();
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (kbPad > 0) {
      const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 250);
      return () => clearTimeout(t);
    }
  }, [kbPad]);

  const { user: me } = useAuth();
  meIdRef.current = me?.id ?? null;
  const insets = useSafeAreaInsets();

  const loadMeta = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.conversation(token, conversationId);
      const o = res.conversation.other;
      if (o)
        setOther({
          id: o.id,
          name: o.name,
          avatarUrl: o.avatarUrl,
          isVerified: o.isVerified,
          lastSeenAt: o.lastSeenAt,
          publicKey: o.publicKey,
        });
      navigation.setOptions({ title: o?.name ?? "Chat" });
    } catch {
      // header already set from params
    }
  }, [token, conversationId, navigation]);

  const decryptMessageBody = useCallback(
    (raw: string): string => {
      if (!raw.startsWith("enc:v1:")) return raw;
      const kp = myKeysRef.current;
      const theirKey = other?.publicKey;
      if (!kp || !theirKey) return CANNOT_DECRYPT;
      const plain = decryptMessage(raw, kp.privateKey, theirKey);
      return plain ?? CANNOT_DECRYPT;
    },
    [other?.publicKey]
  );

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!token) return;
      try {
        const res = await api.conversationMessages(token, conversationId);
        const serverMessages = res.messages.map((m) => ({ ...m, body: decryptMessageBody(m.body) }));
        setMessages((prev) => {
          const optimistics = prev.filter((m) => m.id > 1000000000000);
          const serverIds = new Set(serverMessages.map((m) => m.id));
          const unconfirmed = optimistics.filter((m) => !serverIds.has(m.id));
          return [...serverMessages, ...unconfirmed];
        });
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    },
    [token, conversationId, decryptMessageBody]
  );

  useFocusEffect(
    useCallback(() => {
      loadMeta();
      if (AppState.currentState === "active") loadMessages();
      const interval = setInterval(() => {
        if (AppState.currentState === "active") loadMessages(true);
      }, 4000);
      const msgSub = onWsEvent("message", conversationId, () => {
        if (AppState.currentState === "active") loadMessages(true);
      });
      const readSub = onWsEvent("read", conversationId, () => {
        if (AppState.currentState === "active") loadMessages(true);
      });
      const appSub = AppState.addEventListener("change", (state) => {
        if (state === "active") loadMessages(true);
      });
      return () => {
        clearInterval(interval);
        msgSub();
        readSub();
        appSub.remove();
      };
    }, [loadMeta, loadMessages, conversationId])
  );

  useEffect(() => {
    if (other?.name) navigation.setOptions({ title: other.name });
  }, [other?.name, navigation]);

  const send = useCallback(async () => {
    const body = textRef.current.trim();
    if (!body || !token || sending) return;
    setSending(true);
    const kp = myKeysRef.current;
    const payload =
      kp && other?.publicKey ? encryptMessage(body, kp.privateKey, other.publicKey) : body;
    const optimistic: ChatMessage = {
      id: Date.now(),
      body,
      senderId: meIdRef.current ?? 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    textRef.current = "";
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res = await api.sendMessage(token, conversationId, payload);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...res.message, body } : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(body);
      textRef.current = body;
    } finally {
      setSending(false);
    }
  }, [token, sending, conversationId, other?.publicKey]);

  const renderItem = ({ item }: { item: ChatRow }) => {
    if (item.kind === "header") {
      return (
        <View style={styles.dayHeaderWrap}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{item.label}</Text>
          </View>
        </View>
      );
    }
    const msg = item.msg;
    const mine = msg.senderId === meIdRef.current;
    const pending = mine && msg.id > 1000000000000;
    const read = mine && !!msg.readAt;
    const shown = revealedId === msg.id;
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <Pressable
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
          onPress={() => setRevealedId(shown ? null : msg.id)}
        >
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
            {msg.body.split(URL_RE).map((part, i) =>
              isUrl(part) ? (
                <Text
                  key={`${msg.id}-l${i}`}
                  style={[styles.link, mine && styles.linkMine]}
                  onPress={() => void Linking.openURL(part)}
                >
                  {part}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
          {shown && (
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                {formatTime(msg.createdAt)}
              </Text>
              {mine &&
                (pending ? (
                  <Icon name="time-outline" size={13} color="rgba(255,255,255,0.6)" />
                ) : read ? (
                  <Icon name="checkmark-done" size={14} color={colors.primaryLight} />
                ) : (
                  <Icon name="checkmark" size={14} color="rgba(255,255,255,0.85)" />
                ))}
            </View>
          )}
        </Pressable>
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
    <View style={styles.container}>
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
            verified={other?.isVerified}
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
        style={styles.listArea}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        }
      />
      <View style={[styles.inputArea, { paddingBottom: kbPad }]}>
        <View
          style={[
            styles.inputBar,
            Platform.OS === "android" && { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(v) => { setText(v); textRef.current = v; }}
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
      </View>
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
  listArea: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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
    flexShrink: 0,
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
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  bubbleTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.75)",
  },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  linkMine: {
    color: "#D6EBFF",
  },
  dayHeaderWrap: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  dayHeader: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
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
  inputArea: {
    backgroundColor: colors.card,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderRadius: 23,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    lineHeight: 21,
    color: colors.text,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});