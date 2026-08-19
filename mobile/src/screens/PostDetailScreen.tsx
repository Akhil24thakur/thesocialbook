import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import RichText from "../components/RichText";
import { formatCount, formatTime, isOnline, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import type { Comment, Post } from "../types";

export default function PostDetailScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const initialPost = route.params?.post as Post | undefined;
  const { token, user } = useAuth();
  const [post, setPost] = useState<Post | null>(initialPost ?? null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Comment>>(null);
  const scrollToBottom = useRef(false);
  const [kb, setKb] = useState(0);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: any) => setKb(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKb(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.comments(token, postId);
      setComments(res.comments);
      const total = res.comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
      setPost((prev) => (prev ? { ...prev, commentCount: total } : prev));
    } finally {
      setLoading(false);
    }
  }, [token, postId]);

  const loadPost = useCallback(async () => {
    if (!token || post) return;
    try {
      const res = await api.feed(token);
      setPost(res.posts.find((p) => p.id === postId) ?? null);
    } catch {}
  }, [token, postId, post]);

  React.useEffect(() => {
    load();
    loadPost();
    if (token) api.markSeen(token, [postId]).catch(() => {});
  }, [load, loadPost, token, postId]);

  const send = async () => {
    const content = draft.trim();
    if (!token || !content || sending) return;
    setSending(true);
    try {
      const res = await api.addComment(token, postId, content, replyTo?.id);
      if (replyTo) {
        setComments((list) =>
          list.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies ?? []), res.comment] }
              : c
          )
        );
      } else {
        setComments((c) => [...c, res.comment]);
      }
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
      scrollToBottom.current = true;
      setDraft("");
      setReplyTo(null);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not add comment");
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async () => {
    if (!token || !post) return;
    const liked = !post.likedByMe;
    setPost({ ...post, likedByMe: liked, likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)) });
    try {
      await api.toggleLike(token, post.id);
    } catch {
      setPost((p) => p && { ...p, likedByMe: !liked, likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)) });
    }
  };

  if (loading && !post) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={comments}
        keyExtractor={(c) => String(c.id)}
        onContentSizeChange={() => {
          if (scrollToBottom.current) listRef.current?.scrollToEnd({ animated: true });
        }}
        ListHeaderComponent={
          post ? (
            <View style={styles.post}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.authorBtn}
                  onPress={() => navigation.navigate("UserProfile", { userId: post.author.id })}
                >
                  <Avatar
                    name={post.author.name}
                    imageUrl={post.author.avatarUrl}
                    online={isOnline(post.author.lastSeenAt)}
                    verified={post.author.isVerified}
                  />
                  <View style={styles.headerText}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{post.author.name}</Text>
                      {post.author.isVerified && (
                        <Icon name="checkmark-circle" size={15} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.time}>{formatTime(post.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <RichText style={styles.content}>{post.content}</RichText>
              <TouchableOpacity style={styles.likeBtn} onPress={toggleLike}>
                <Icon
                  name={post.likedByMe ? "heart" : "heart-outline"}
                  size={20}
                  color={post.likedByMe ? colors.danger : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.likeText,
                    post.likedByMe && { color: colors.danger, fontWeight: "700" },
                  ]}
                >
                  {post.likedByMe ? "Liked" : "Like"} · {formatCount(post.likeCount)}
                </Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <Text style={styles.commentsTitle}>
                {comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)} comments
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View>
            <View style={styles.comment}>
              <TouchableOpacity
                onPress={() => navigation.navigate("UserProfile", { userId: item.author.id })}
                accessibilityLabel={`${item.author.name}'s profile`}
              >
                <Avatar
                  name={item.author.name}
                  size={32}
                  imageUrl={item.author.avatarUrl}
                  online={isOnline(item.author.lastSeenAt)}
                  verified={item.author.isVerified}
                />
              </TouchableOpacity>
              <View style={styles.commentBody}>
                <View style={styles.commentBubble}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("UserProfile", { userId: item.author.id })}
                  >
                    <View style={styles.commentNameRow}>
                      <Text style={styles.commentName}>{item.author.name}</Text>
                      {item.author.isVerified && (
                        <Icon name="checkmark-circle" size={13} color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                  <RichText style={styles.commentText}>{item.content}</RichText>
                </View>
                <View style={styles.commentMeta}>
                  <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setReplyTo(item);
                      setDraft("");
                      inputRef.current?.focus();
                    }}
                  >
                    <Text style={styles.replyLink}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {(item.replies ?? []).map((r) => (
              <View key={r.id} style={styles.reply}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("UserProfile", { userId: r.author.id })}
                  accessibilityLabel={`${r.author.name}'s profile`}
                >
                  <Avatar
                    name={r.author.name}
                    size={28}
                    imageUrl={r.author.avatarUrl}
                    online={isOnline(r.author.lastSeenAt)}
                    verified={r.author.isVerified}
                  />
                </TouchableOpacity>
                <View style={styles.commentBody}>
                  <View style={styles.replyBubble}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("UserProfile", { userId: r.author.id })}
                    >
                      <Text style={styles.commentName}>
                        {r.author.name}
                        {r.author.id === item.author.id && (
                          <Text style={styles.opTag}> · OP</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                    <RichText style={styles.commentText}>{r.content}</RichText>
                  </View>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentTime}>{formatTime(r.createdAt)}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setReplyTo(r);
                        setDraft("");
                        inputRef.current?.focus();
                      }}
                    >
                      <Text style={styles.replyLink}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.composer, kb > 0 && { paddingBottom: kb + 28 }]}>
        <Avatar name={user?.name ?? "?"} size={34} />
        <View style={styles.composerBody}>
          {replyTo && (
            <TouchableOpacity style={styles.replyChip} onPress={() => setReplyTo(null)}>
              <Text style={styles.replyChipText} numberOfLines={1}>
                Replying to {replyTo.author.name} · <Text style={styles.replyChipX}>cancel</Text>
              </Text>
            </TouchableOpacity>
          )}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={1000}
          />
        </View>
        <TouchableOpacity onPress={send} disabled={!draft.trim() || sending}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.send, !draft.trim() && styles.sendDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
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
  list: {
    padding: 12,
  },
  post: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  authorBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 10,
  },
  name: {
    fontWeight: "700",
    fontSize: 15,
    color: colors.text,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  likeBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  liked: {
    color: colors.primary,
    fontWeight: "700",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  comment: {
    flexDirection: "row",
    marginBottom: 14,
  },
  commentBody: {
    marginLeft: 8,
    flex: 1,
  },
  commentBubble: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  commentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  replyLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 4,
    marginLeft: 10,
  },
  reply: {
    flexDirection: "row",
    marginBottom: 14,
    marginLeft: 40,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  replyBubble: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  opTag: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  composerBody: {
    flex: 1,
    marginHorizontal: 8,
  },
  replyChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  replyChipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  replyChipX: {
    color: colors.textSecondary,
    fontWeight: "700",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.card,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  send: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    paddingVertical: 6,
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
