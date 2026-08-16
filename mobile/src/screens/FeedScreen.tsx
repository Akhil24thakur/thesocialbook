import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import PostCard from "../components/PostCard";
import FeedTabs, { FeedTab } from "../components/home/FeedTabs";
import { EmptyFeed, ErrorFeed } from "../components/home/FeedStates";
import SkeletonFeed from "../components/home/SkeletonFeed";
import StoriesStrip from "../components/home/StoriesStrip";
import { Story, StoryGroup } from "../components/home/StoryViewer";
import { storyGroupsFromApi } from "../data/stories";
import { colors } from "../theme";
import type { Post, StoryItem } from "../types";

export default function FeedScreen() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [storyItems, setStoryItems] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<FeedTab>("foryou");

  const load = useCallback(
    async (refresh = false) => {
      if (!token) return;
      refresh ? setRefreshing(true) : setLoading(true);
      try {
        const [feedRes, storiesRes] = await Promise.all([api.feed(token), api.stories(token)]);
        setPosts(feedRes.posts);
        setStoryItems(storiesRes.stories);
        setError("");
      } catch (e: any) {
        setError(e.message ?? "Could not load feed");
      } finally {
        setLoading(false);
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

  const displayPosts = useMemo(() => {
    if (tab === "following") return [];
    if (tab === "trending") return [...posts].sort((a, b) => b.likeCount - a.likeCount);
    return posts;
  }, [posts, tab]);

  const friendGroups = useMemo<StoryGroup[]>(
    () => storyGroupsFromApi(storyItems.filter((s) => s.author.id !== user?.id)),
    [storyItems, user?.id]
  );

  const myStories = useMemo(
    () => storyItems.filter((s) => s.author.id === user?.id),
    [storyItems, user?.id]
  );

  const myStoryGroup = useMemo<StoryGroup | null>(() => {
    if (!myStories.length) return null;
    return {
      name: user?.name ?? "You",
      avatarUrl: user?.avatarUrl,
      stories: myStories.map<Story>((s) => ({
        id: s.id,
        name: user?.name ?? "You",
        content: "",
        imageUrl: s.imageUrl,
        createdAt: s.createdAt,
      })),
    };
  }, [myStories, user?.name, user?.avatarUrl]);

  const onDeleteStory = useCallback(
    async (id: number) => {
      if (!token) return;
      await api.deleteStory(token, id);
      await load();
    },
    [token, load]
  );

  const header = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <StoriesStrip
          groups={friendGroups}
          myStoryGroup={myStoryGroup}
          userName={user?.name ?? "?"}
          userAvatarUrl={user?.avatarUrl}
          onRefresh={load}
          onDeleteStory={onDeleteStory}
        />
        <FeedTabs active={tab} onChange={setTab} />
      </View>
    ),
    [friendGroups, myStoryGroup, user?.name, user?.avatarUrl, load, onDeleteStory, tab]
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} onToggleLike={toggleLike} onChanged={() => load()} />,
    [toggleLike, load]
  );

  let empty: React.ReactElement | null = null;
  if (loading) {
    empty = <SkeletonFeed />;
  } else if (error) {
    empty = <ErrorFeed onRetry={() => load()} />;
  } else {
    empty = <EmptyFeed compact={tab === "following"} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayPosts}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
    paddingBottom: 28,
  },
  headerContainer: {
    padding: 16,
  },
});