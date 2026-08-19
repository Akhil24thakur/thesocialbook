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
import { colors, storyGradient } from "../../theme";

export default function StoriesStrip({
  groups,
  myStoryGroup,
  userName,
  userAvatarUrl,
  onRefresh,
  onDeleteStory,
  onProfile,
}: {
  groups: StoryGroup[];
  myStoryGroup: StoryGroup | null;
  userName: string;
  userAvatarUrl?: string | null;
  onRefresh: () => Promise<void>;
  onDeleteStory: (id: number) => Promise<void>;
  onProfile?: (userId: number) => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { addOpen, setAddOpen, previewUri, setPreviewUri, uploading, musicOpen, setMusicOpen, music, setMusic, pickCamera, pickGallery, openMusic, confirmUpload } =
    useStoryUpload();

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

  const ownRingImage = myStoryGroup?.stories[0]?.imageUrl ?? null;

  return (
    <View style={styles.card}>
      <FlatList
        data={groups}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.item}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => (myStoryGroup ? setViewerIndex(0) : setAddOpen(true))}
              accessibilityLabel={myStoryGroup ? "Watch your story" : "Add to your story"}
            >
              {ownRingImage ? (
                <LinearGradient colors={storyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ownRing}>
                  <View style={styles.avatarPad}>
                    <Image source={{ uri: ownRingImage }} style={styles.ownAvatar} />
                  </View>
                </LinearGradient>
              ) : (
                <Avatar name={userName} size={56} gradient imageUrl={userAvatarUrl} />
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
            <Text style={styles.name}>Yours</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => setViewerIndex(index + (myStoryGroup ? 1 : 0))}
            accessibilityLabel={`${item.name}'s story`}
          >
            <LinearGradient colors={storyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
              <View style={styles.avatarPad}>
                <Avatar name={item.name} size={50} imageUrl={item.avatarUrl} />
              </View>
            </LinearGradient>
            <Text style={styles.name} numberOfLines={1}>
              {item.name.split(" ")[0]}
            </Text>
          </TouchableOpacity>
        )}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: "#172033",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  list: {
    paddingHorizontal: 10,
  },
  item: {
    alignItems: "center",
    marginHorizontal: 3,
    width: 64,
  },
  avatarWrap: {
    marginBottom: 5,
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    borderRadius: 32,
    padding: 2.5,
  },
  avatarPad: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  ownRing: {
    borderRadius: 31,
    padding: 2.5,
  },
  ownAvatar: {
    width: 51,
    height: 51,
  },
  name: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    maxWidth: 64,
  },
});