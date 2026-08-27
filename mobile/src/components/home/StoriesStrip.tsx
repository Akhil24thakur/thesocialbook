import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Avatar from "../Avatar";
import Icon from "../Icon";
import StoryViewer, { StoryGroup } from "./StoryViewer";
import StoryUploadPreview from "./StoryUploadPreview";
import AddStorySheet from "./AddStorySheet";
import MusicPickerModal from "./MusicPickerModal";
import { useStoryUpload } from "./useStoryUpload";
import { storyGradient, type Colors } from "../../theme";
import { useTheme } from "../../theme-context";
import type { LiveSession } from "../../types";

export default function StoriesStrip({
  groups,
  myStoryGroup,
  liveSessions,
  userName,
  userAvatarUrl,
  onRefresh,
  onDeleteStory,
  onProfile,
  onPressLive,
}: {
  groups: StoryGroup[];
  myStoryGroup: StoryGroup | null;
  liveSessions: LiveSession[];
  userName: string;
  userAvatarUrl?: string | null;
  onRefresh: () => Promise<void>;
  onDeleteStory: (id: number) => Promise<void>;
  onProfile?: (userId: number) => void;
  onPressLive?: (session: LiveSession) => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { addOpen, setAddOpen, previewUri, setPreviewUri, uploading, musicOpen, setMusicOpen, music, setMusic, pickCamera, pickGallery, openMusic, confirmUpload } =
    useStoryUpload();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const allGroups = useMemo<StoryGroup[]>(
    () => (myStoryGroup ? [myStoryGroup, ...groups] : groups),
    [myStoryGroup, groups]
  );

  const onUploadConfirmed = async () => {
    if (await confirmUpload()) {
      await onRefresh();
      setViewerIndex(0);
    }
  };

  const onDeleteOwnStory = async (storyId?: number) => {
    if (!storyId) return;
    try {
      await onDeleteStory(storyId);
    } finally {
      setViewerIndex(null);
    }
  };

  type StripItem =
    | { kind: "live"; session: LiveSession }
    | { kind: "story"; group: StoryGroup; index: number };

  const stripData = useMemo<StripItem[]>(() => {
    const items: StripItem[] = liveSessions.map((s) => ({ kind: "live", session: s }));
    groups.forEach((g, i) => items.push({ kind: "story", group: g, index: i }));
    return items;
  }, [liveSessions, groups]);

  const ownRingImage = myStoryGroup?.stories[0]?.imageUrl ?? null;

  return (
    <View style={styles.card}>
      <FlatList
        data={stripData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.kind === "live" ? `live-${item.session.id}` : `story-${item.index}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.item}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => (myStoryGroup ? setViewerIndex(0) : setAddOpen(true))}
              accessibilityLabel={myStoryGroup ? "Watch your story" : "Add to your story"}
            >
              {ownRingImage ? (
                <LinearGradient colors={storyGradient(colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
                  <View style={styles.avatarPad}>
                    <Image source={{ uri: ownRingImage }} style={styles.ownAvatar} />
                  </View>
                </LinearGradient>
              ) : (
                <Avatar name={userName} size={58} gradient imageUrl={userAvatarUrl} />
              )}
              <TouchableOpacity
                style={styles.plusBadge}
                onPress={pickGallery}
                accessibilityLabel="Add photo to your story"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="add" size={14} color={colors.white} />
              </TouchableOpacity>
            </TouchableOpacity>
            <Text style={styles.name} numberOfLines={1}>Yours</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "live") {
            const s = item.session;
            return (
              <TouchableOpacity
                style={styles.item}
                onPress={() => onPressLive?.(s)}
                accessibilityLabel={`${s.host.name} is live`}
              >
                <View style={styles.liveRing}>
                  <View style={styles.avatarPad}>
                    <Avatar name={s.host.name} size={52} imageUrl={s.host.avatarUrl} />
                  </View>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
                <Text style={[styles.name, styles.liveName]} numberOfLines={1}>
                  {s.host.name.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            );
          }
          const group = item.group;
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => setViewerIndex(item.index + (myStoryGroup ? 1 : 0))}
              accessibilityLabel={`${group.name}'s story`}
            >
              <LinearGradient colors={storyGradient(colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
                <View style={styles.avatarPad}>
                  <Avatar name={group.name} size={52} imageUrl={group.avatarUrl} />
                </View>
              </LinearGradient>
              <Text style={styles.name} numberOfLines={1}>
                {group.name.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <AddStorySheet
        visible={addOpen}
        hasStory={!!myStoryGroup}
        onClose={() => setAddOpen(false)}
        onViewStory={() => {
          setAddOpen(false);
          setViewerIndex(0);
        }}
        onGallery={pickGallery}
        onCamera={pickCamera}
        onMusic={openMusic}
      />

      <MusicPickerModal
        visible={musicOpen}
        onClose={() => setMusicOpen(false)}
        onDone={(sel) => {
          setMusic(sel);
          setMusicOpen(false);
        }}
      />

      <StoryUploadPreview
        uri={previewUri}
        userName={userName}
        visible={previewUri !== null}
        uploading={uploading}
        music={music}
        onCancel={() => setPreviewUri(null)}
        onCropped={setPreviewUri}
        onAddMusic={openMusic}
        onRemoveMusic={() => setMusic(null)}
        onConfirm={onUploadConfirmed}
      />

      <StoryViewer
        groups={allGroups}
        groupIndex={viewerIndex}
        ownGroupIndex={myStoryGroup ? 0 : null}
        onDelete={onDeleteOwnStory}
        onProfile={onProfile}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: "#172033",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  list: {
    paddingHorizontal: 8,
  },
  item: {
    alignItems: "center",
    marginHorizontal: 4,
    width: 68,
  },
  avatarWrap: {
    marginBottom: 5,
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    borderRadius: 34,
    padding: 2.5,
  },
  liveRing: {
    borderRadius: 34,
    padding: 2.5,
    borderWidth: 2.5,
    borderColor: "#FF3B30",
    position: "relative",
  },
  liveBadge: {
    position: "absolute",
    bottom: -2,
    left: "50%",
    marginLeft: -14,
    backgroundColor: "#FF3B30",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  liveBadgeText: {
    color: "#FFF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  avatarPad: {
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  ownAvatar: {
    width: 53,
    height: 53,
  },
  name: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    maxWidth: 68,
  },
  liveName: {
    color: "#FF3B30",
    fontWeight: "700",
  },
});
