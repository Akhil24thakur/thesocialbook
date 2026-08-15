import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { colors, formatCount, formatTime } from "../theme";
import type { Comment, Post } from "../types";

export default function PostDetailScreen({ route }: any) {
  const { postId } = route.params;
  const initialPost = route.params?.post as Post | undefined;
  const { token, user } = useAuth();
  const [post, setPost] = useState<Post | null>(initialPost ?? null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Comment>>(null);
  const scrollToBottom = useRef(false);
  const [kb, setKb] = useState(0);

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
      setPost((prev) => (prev ? { ...prev, commentCount: res.comments.length } : prev));
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
  }, [load, loadPost]);

  const send = async () => {
    const content = draft.trim();
    if (!token || !content || sending) return;
    setSending(true);
    try {
      const res = await api.addComment(token, postId, content);
      setComments((c) => [...c, res.comment]);
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
      scrollToBottom.current = true;
      setDraft("");
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
                <Avatar name={post.author.name} />
                <View style={styles.headerText}>
                  <Text style={styles.name}>{post.author.name}</Text>
                  <Text style={styles.time}>{formatTime(post.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.content}>{post.content}</Text>
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
              <Text style={styles.commentsTitle}>{comments.length} comments</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Avatar name={item.author.name} size={32} />
            <View style={styles.commentBody}>
              <View style={styles.commentBubble}>
                <Text style={styles.commentName}>{item.author.name}</Text>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
              <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.composer, kb > 0 && { paddingBottom: kb + 28 }]}>
        <Avatar name={user?.name ?? "?"} size={34} />
        <TextInput
          style={styles.input}
          placeholder="Write a comment…"
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={1000}
        />
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
  headerText: {
    marginLeft: 10,
  },
  name: {
    fontWeight: "700",
    fontSize: 15,
    color: colors.text,
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