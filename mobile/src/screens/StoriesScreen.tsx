import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import AddStorySheet from "../components/home/AddStorySheet";
import StoryUploadPreview from "../components/home/StoryUploadPreview";
import StoryViewer, { Story, StoryGroup } from "../components/home/StoryViewer";
import { useStoryUpload } from "../components/home/useStoryUpload";
import Icon from "../components/Icon";
import { storyGroupsFromApi } from "../data/stories";
import { colors, storyGradient } from "../theme";
import type { StoryItem } from "../types";

export default function StoriesScreen() {
  const { token, user } = useAuth();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { addOpen, setAddOpen, previewUri, setPreviewUri, uploading, pickCamera, pickGallery, confirmUpload } =
    useStoryUpload();

  const load = useCallback(
    async (refresh = false) => {
      if (!token) return;
      refresh && setRefreshing(true);
      try {
        const res = await api.stories(token);
        setStories(res.stories);
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

  const myStories = useMemo(
    () => stories.filter((s) => s.author.id === user?.id),
    [stories, user?.id]
  );

  const friendGroups = useMemo<StoryGroup[]>(
    () => storyGroupsFromApi(stories.filter((s) => s.author.id !== user?.id)),
    [stories, user?.id]
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

  const allGroups = useMemo<StoryGroup[]>(
    () => (myStoryGroup ? [myStoryGroup, ...friendGroups] : friendGroups),
    [myStoryGroup, friendGroups]
  );

  const onUploadConfirmed = async () => {
    if (await confirmUpload()) {
      await load();
      setViewerIndex(0);
    }
  };

  const onDeleteOwnStory = async (storyId?: number) => {
    if (!storyId || !token) return;
    try {
      await api.deleteStory(token, storyId);
      await load();
      if (myStories.length <= 1) setViewerIndex(null);
    } catch {}
  };

  const ownRingImage = myStoryGroup?.stories[0]?.imageUrl ?? null;

  return (
    <View style={styles.container}>
      <FlatList
        data={friendGroups}
        keyExtractor={(_, i) => String(i)}
        numColumns={3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No stories yet. Tap + on "Your story" to share your first one.
          </Text>
        }
        ListHeaderComponent={
          <View style={styles.addCard}>
            <TouchableOpacity
              onPress={() => (myStoryGroup ? setViewerIndex(0) : setAddOpen(true))}
              accessibilityLabel={myStoryGroup ? "Watch your story" : "Add to your story"}
            >
              <LinearGradient colors={storyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addAvatar}>
                {ownRingImage ? (
                  <View style={styles.addAvatarPad}>
                    <Image source={{ uri: ownRingImage }} style={styles.addAvatarImg} />
                  </View>
                ) : (
                  <View style={styles.addAvatarPad}>
                    <Avatar name={user?.name ?? "?"} size={62} gradient imageUrl={user?.avatarUrl} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.plusBadge}
                  onPress={pickGallery}
                  accessibilityLabel="Add photo to your story"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="add" size={16} color={colors.white} />
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.addLabel}>Your story</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setViewerIndex(index + (myStoryGroup ? 1 : 0))}
            accessibilityLabel={`${item.name}'s story`}
          >
            <LinearGradient colors={storyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
              <View style={styles.avatarPad}>
                <Avatar name={item.name} size={62} imageUrl={item.avatarUrl} />
              </View>
            </LinearGradient>
            <Text style={styles.name} numberOfLines={1}>
              {item.name.split(" ")[0]}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />

      <AddStorySheet
        visible={addOpen}
        hasStory={!!myStoryGroup}
        onClose={() => setAddOpen(false)}
        onViewStory={() => {
          if (!myStoryGroup) return;
          setAddOpen(false);
          setViewerIndex(0);
        }}
        onGallery={pickGallery}
        onCamera={pickCamera}
      />

      <StoryUploadPreview
        uri={previewUri}
        userName={user?.name ?? "?"}
        visible={previewUri !== null}
        uploading={uploading}
        onCancel={() => setPreviewUri(null)}
        onCropped={setPreviewUri}
        onConfirm={onUploadConfirmed}
      />

      <StoryViewer
        groups={allGroups}
        groupIndex={viewerIndex}
        ownGroupIndex={myStoryGroup ? 0 : null}
        onDelete={onDeleteOwnStory}
        onClose={() => setViewerIndex(null)}
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
    padding: 12,
    paddingBottom: 28,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  card: {
    flex: 1 / 3,
    alignItems: "center",
    marginBottom: 18,
  },
  addCard: {
    width: "33.33%",
    alignItems: "center",
    marginBottom: 18,
  },
  addAvatar: {
    borderRadius: 36,
    padding: 3,
  },
  addAvatarPad: {
    borderRadius: 33,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  addAvatarImg: {
    width: 62,
    height: 62,
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    borderRadius: 36,
    padding: 3,
  },
  avatarPad: {
    borderRadius: 33,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  name: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
    maxWidth: 96,
  },
  addLabel: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
});