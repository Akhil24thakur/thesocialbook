import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../Avatar";
import Icon from "../Icon";
import { colors, formatTime, storyGradient } from "../../theme";

export type Story = {
  id?: number;
  name: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
};

export type StoryGroup = {
  name: string;
  avatarUrl?: string | null;
  stories: Story[];
};

const { width, height } = Dimensions.get("window");
const STORY_DURATION_MS = 15000;

export default function StoryViewer({
  groups,
  groupIndex,
  ownGroupIndex,
  onDelete,
  onClose,
}: {
  groups: StoryGroup[];
  groupIndex: number | null;
  ownGroupIndex?: number | null;
  onDelete?: (storyId?: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<StoryGroup>>(null);
  const skipMomentum = useRef(false);
  const [page, setPage] = useState(Math.max(0, groupIndex ?? 0));
  const [storyIdx, setStoryIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (groupIndex === null) return;
    setPage(Math.max(0, groupIndex));
    setStoryIdx(0);
  }, [groupIndex]);

  const goPrev = useCallback(() => {
    const g = groups[page];
    if (!g) return;
    if (storyIdx - 1 >= 0) {
      setStoryIdx(storyIdx - 1);
      return;
    }
    if (page - 1 >= 0 && groups[page - 1]) {
      skipMomentum.current = true;
      setPage(page - 1);
      setStoryIdx(groups[page - 1].stories.length - 1);
      listRef.current?.scrollToIndex({ index: page - 1, animated: true });
      return;
    }
  }, [page, storyIdx, groups]);

  const advance = useCallback(() => {
    const g = groups[page];
    if (!g) return;
    if (storyIdx + 1 < g.stories.length) {
      setStoryIdx(storyIdx + 1);
      return;
    }
    if (page + 1 < groups.length) {
      skipMomentum.current = true;
      setPage(page + 1);
      setStoryIdx(0);
      listRef.current?.scrollToIndex({ index: page + 1, animated: true });
      return;
    }
    onClose();
  }, [page, storyIdx, groups, onClose]);

  useEffect(() => {
    if (groupIndex === null) return;
    progress.setValue(0);
    if (menuOpen) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) advance();
    });
    return () => anim.stop();
  }, [groupIndex, page, storyIdx, progress, advance, menuOpen]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      if (skipMomentum.current) {
        skipMomentum.current = false;
        return;
      }
      setPage((prev) => {
        if (i !== prev) setStoryIdx(0);
        return i;
      });
    },
    []
  );

  return (
    <Modal visible={groupIndex !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {groupIndex !== null && groups.length > 0 && (
          <FlatList
            ref={listRef}
            data={groups}
            horizontal
            pagingEnabled
            initialScrollIndex={Math.min(groupIndex, groups.length - 1)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            renderItem={({ item, index }) => (
              <GroupPage
                group={item}
                isActive={page === index}
                storyIdx={page === index ? storyIdx : 0}
                progress={progress}
                insets={insets}
                own={index === ownGroupIndex}
                menuOpen={menuOpen && index === ownGroupIndex}
                onMenuChange={setMenuOpen}
                onDelete={onDelete}
                onNext={advance}
                onPrev={goPrev}
                onClose={onClose}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const GroupPage = memo(function GroupPage({
  group,
  isActive,
  storyIdx,
  progress,
  insets,
  own,
  menuOpen,
  onMenuChange,
  onDelete,
  onNext,
  onPrev,
  onClose,
}: {
  group: StoryGroup;
  isActive: boolean;
  storyIdx: number;
  progress: Animated.Value;
  insets: { top: number };
  own: boolean;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
  onDelete?: (storyId?: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const story = group.stories[Math.min(storyIdx, group.stories.length - 1)];
  const name = group.name.split(" · ")[0];
  const dotRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const popScale = useRef(new Animated.Value(0)).current;
  const popFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!menuOpen) return;
    popScale.setValue(0);
    popFade.setValue(0);
    Animated.parallel([
      Animated.spring(popScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(popFade, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [menuOpen, popScale, popFade]);

  const openMenu = () => {
    dotRef.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
      setAnchor({ x: x + w / 2, y: y + h / 2 });
    });
    onMenuChange(true);
  };

  return (
    <View style={[styles.page, { width, height }]}>
      {story?.imageUrl ? (
        <Image source={{ uri: story.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <LinearGradient
          colors={storyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.textBg}
        >
          <Text style={styles.textContent}>{story?.content}</Text>
        </LinearGradient>
      )}

      <View style={[styles.progress, { top: insets.top + 10 }]}>
        {group.stories.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i < storyIdx && styles.progressDone,
              i > storyIdx && styles.progressIdle,
            ]}
          >
            {isActive && i === storyIdx && (
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 26 }]}>
        <View style={styles.userRow}>
          <Avatar name={name} size={36} imageUrl={group.avatarUrl} />
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={styles.time}>{story ? formatTime(story.createdAt) : ""}</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          {own && onDelete && (
            <TouchableOpacity
              ref={dotRef}
              style={styles.close}
              onPress={openMenu}
              accessibilityLabel="Story options"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="ellipsis-vertical" size={22} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.close}
            onPress={onClose}
            accessibilityLabel="Close story"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.tapZone, styles.tapLeft]}
        onPress={onPrev}
        activeOpacity={1}
        accessibilityLabel="Previous story"
      />
      <TouchableOpacity
        style={[styles.tapZone, styles.tapRight]}
        onPress={onNext}
        activeOpacity={1}
        accessibilityLabel="Next story"
      />

      {menuOpen && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => onMenuChange(false)}
        >
          <Animated.View
            style={[
              styles.menuPop,
              {
                top: anchor.y + 8,
                opacity: popFade,
                transformOrigin: "50% 0%",
                transform: [{ scale: popScale }],
              },
            ]}
          >
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuDeleteRow}
                onPress={() => {
                  onMenuChange(false);
                  onDelete?.(story?.id);
                }}
                accessibilityLabel="Delete story"
              >
                <Text style={styles.menuDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0A0E16",
  },
  page: {
    flex: 1,
  },
  image: {
    width,
    height,
  },
  textBg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  textContent: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "600",
    textAlign: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 30,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userInfo: {
    maxWidth: width * 0.55,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  time: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  progress: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
    zIndex: 20,
  },
  progressSegment: {
    flex: 1,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  progressDone: {
    backgroundColor: colors.white,
  },
  progressIdle: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.white,
  },
  tapZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: width / 3,
  },
  tapLeft: {
    left: 0,
  },
  tapRight: {
    right: 0,
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,14,22,0.45)",
    zIndex: 40,
  },
  menuPop: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "flex-end",
    paddingRight: 4,
  },
  menuCard: {
    width: 170,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#141A26",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  menuDeleteRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  menuDeleteText: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.danger,
  },
});