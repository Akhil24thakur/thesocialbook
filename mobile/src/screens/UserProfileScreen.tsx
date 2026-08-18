import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import PostCard from "../components/PostCard";
import { colors, isOnline } from "../theme";
import type { ApiUser, Post } from "../types";

export default function UserProfileScreen({ route }: any) {
  const { userId } = route.params;
  const { token, user: me } = useAuth();
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, p] = await Promise.all([api.user(token, userId), api.userPosts(token, userId)]);
      setUser(u.user);
      setPosts(p.posts);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isMe = me?.id === userId;

  const toggleFollow = useCallback(async () => {
    if (!token || !user || followBusy) return;
    setFollowBusy(true);
    const wasFollowing = !!user.followedByMe;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            followedByMe: !wasFollowing,
            followerCount: Math.max(0, (prev.followerCount ?? 0) + (wasFollowing ? -1 : 1)),
          }
        : prev
    );
    try {
      const res = wasFollowing ? await api.unfollow(token, userId) : await api.follow(token, userId);
      setUser(res.user);
    } catch (e: any) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              followedByMe: wasFollowing,
              followerCount: Math.max(0, (prev.followerCount ?? 0) + (wasFollowing ? 1 : -1)),
            }
          : prev
      );
      Alert.alert("Error", e.message ?? "Could not update follow");
    } finally {
      setFollowBusy(false);
    }
  }, [token, user, userId, followBusy]);

  const toggleLike = useCallback(
    async (post: Post) => {
      if (!token) return;
      const liked = !post.likedByMe;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }
            : p
        )
      );
      try {
        await api.toggleLike(token, post.id);
      } catch (e: any) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, likedByMe: !liked, likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)) }
              : p
          )
        );
        Alert.alert("Error", e.message ?? "Could not like post");
      }
    },
    [token]
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} onToggleLike={toggleLike} onChanged={() => load()} />,
    [toggleLike, load]
  );

  if (loading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <Avatar name={user.name} size={72} imageUrl={user.avatarUrl} online={isOnline(user.lastSeenAt)} verified={user.isVerified} />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}</Text>
              {!!user.isVerified && (
                <Icon name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </View>
            {!!user.username && <Text style={styles.username}>@{user.username}</Text>}
            {isOnline(user.lastSeenAt) ? (
              <Text style={styles.online}>Online</Text>
            ) : (
              !!user.bio && <Text style={styles.bio}>{user.bio}</Text>
            )}
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user.postCount ?? posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user.followerCount ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
        {!isMe && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.messageBtn]}
              onPress={async () => {
                if (!token) return;
                try {
                  const res = await api.getOrCreateConversation(token, userId);
                  navigation.navigate("Chat", {
                    conversationId: res.conversation.id,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    otherId: user.id,
                  });
                } catch (e: any) {
                  Alert.alert("Error", e?.message ?? "Could not start conversation");
                }
              }}
              accessibilityLabel="Message"
            >
              <Icon name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                user.followedByMe ? styles.followingBtn : styles.followBtnActive,
              ]}
              onPress={toggleFollow}
              disabled={followBusy}
              accessibilityLabel={user.followedByMe ? "Unfollow" : "Follow"}
            >
              {followBusy ? (
                <ActivityIndicator size="small" color={user.followedByMe ? colors.text : colors.white} />
              ) : (
                <Text
                  style={[styles.followBtnText, user.followedByMe && styles.followingBtnText]}
                >
                  {user.followedByMe ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No posts yet.</Text>
          </View>
        }
      />
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
  header: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
  },
  online: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.online,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "baseline",
    marginRight: 24,
  },
  statNum: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  messageBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  messageBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  followBtnActive: {
    backgroundColor: colors.primary,
  },
  followingBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  followBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  followingBtnText: {
    color: colors.text,
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  empty: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});