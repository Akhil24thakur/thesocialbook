import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Modal,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import * as Clipboard from "expo-clipboard";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import { formatCount, formatTime, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import type { Comment, Reel } from "../types";

const PAGE_SIZE = 8;
const MOUNT_WINDOW = 1;

function ReelVideo({
  reel,
  shouldPlay,
  muted,
  onMount,
}: {
  reel: Reel;
  shouldPlay: boolean;
  muted: boolean;
  onMount: (player: VideoPlayer | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(reel.videoUrl ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
    p.addListener("statusChange", ({ status }) => {
      if (status === "error") setFailed(true);
    });
  });

  useEffect(() => {
    onMount(player);
    return () => onMount(null);
  }, [player, onMount]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  if (failed) {
    return (
      <View style={styles.videoFallback}>
        <Icon name="videocam-off-outline" size={34} color={colors.textSecondary} />
        <Text style={styles.videoFallbackText}>Couldn't play this video</Text>
        <TouchableOpacity style={styles.fallbackBtn} onPress={() => setFailed(false)}>
          <Text style={styles.fallbackBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      surfaceType="textureView"
    />
  );
}

function ReelComments({
  reel,
  visible,
  onClose,
  onCountChange,
}: {
  reel: Reel;
  visible: boolean;
  onClose: () => void;
  onCountChange: (delta: number) => void;
}) {
  const { token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [kb, setKb] = useState(0);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setComments([]);
    if (token) {
      api
        .reelComments(token, reel.id)
        .then((res) => {
          if (!cancelled) setComments(res.comments);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [visible, reel.id, token]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e: any) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const send = async () => {
    const content = draft.trim();
    if (!token || !content || sending) return;
    setSending(true);
    try {
      const res = await api.addReelComment(token, reel.id, content, replyTo?.id);
      if (replyTo) {
        setComments((list) =>
          list.map((c) =>
            c.id === replyTo.id ? { ...c, replies: [...(c.replies ?? []), res.comment] } : c
          )
        );
      } else {
        setComments((c) => [...c, res.comment]);
      }
      onCountChange(1);
      setDraft("");
      setReplyTo(null);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not add comment");
    } finally {
      setSending(false);
    }
  };

  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { paddingBottom: Math.max(16, kb) }]} onStartShouldSetResponder={() => true}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Comments {total > 0 ? `(${total})` : ""}</Text>
          {loading ? (
            <ActivityIndicator style={styles.sheetLoading} color={colors.primary} />
          ) : comments.length === 0 ? (
            <Text style={styles.sheetEmpty}>No comments yet. Say something nice!</Text>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => String(c.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.commentList}
              renderItem={({ item }) => (
                <View>
                  <View style={styles.commentRow}>
                    <Avatar size={30} name={item.author.name} imageUrl={item.author.avatarUrl} />
                    <View style={styles.commentBody}>
                      <View style={styles.commentHead}>
                        <Text style={styles.commentName}>{item.author.name}</Text>
                        <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{item.content}</Text>
                      <TouchableOpacity onPress={() => setReplyTo(item)}>
                        <Text style={styles.commentReply}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {item.replies?.map((r) => (
                    <View key={r.id} style={[styles.commentRow, styles.replyRow]}>
                      <Avatar size={26} name={r.author.name} imageUrl={r.author.avatarUrl} />
                      <View style={styles.commentBody}>
                        <View style={styles.commentHead}>
                          <Text style={styles.commentName}>{r.author.name}</Text>
                          <Text style={styles.commentTime}>{formatTime(r.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentText}>{r.content}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            />
          )}
          {replyTo && (
            <TouchableOpacity style={styles.replyChip} onPress={() => setReplyTo(null)}>
              <Text style={styles.replyChipText}>Replying to @{replyTo.author.name}</Text>
              <Icon name="close" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
              placeholderTextColor={colors.textSecondary}
              multiline
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!draft.trim() || sending}
            >
              <Icon name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function ReelItem({
  reel,
  index,
  activeIndex,
  muted,
  height,
  onLike,
  onShare,
  onComments,
  onDelete,
  onProfile,
  onFollow,
  onMountPlayer,
}: {
  reel: Reel;
  index: number;
  activeIndex: number;
  muted: boolean;
  height: number;
  onLike: (r: Reel) => void;
  onShare: (r: Reel) => void;
  onComments: (r: Reel) => void;
  onDelete: (r: Reel) => void;
  onProfile: (id: number) => void;
  onFollow: (r: Reel) => void;
  onMountPlayer: (reelId: number, player: VideoPlayer | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const isActive = index === activeIndex;
  const inWindow = Math.abs(index - activeIndex) <= MOUNT_WINDOW;
  const [paused, setPaused] = useState(false);
  const isMe = user?.id === reel.author.id;

  useEffect(() => {
    if (!isActive) setPaused(false);
  }, [isActive]);

  const togglePlay = () => setPaused((p) => !p);

  const openExternal = () => {
    if (reel.externalUrl) Linking.openURL(reel.externalUrl).catch(() => {});
  };

  return (
    <View style={[styles.item, { height }]}>
      {reel.isExternal || !reel.videoUrl ? (
        <View style={styles.posterWrap}>
          {reel.posterUrl ? (
            <Image source={{ uri: reel.posterUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.posterGradient]} />
          )}
          <View style={styles.externalBadge}>
            <Icon name="logo-instagram" size={16} color={colors.white} />
            <Text style={styles.externalBadgeText}>Instagram Reel</Text>
          </View>
          <TouchableOpacity style={styles.openIgBtn} onPress={openExternal} activeOpacity={0.85}>
            <Icon name="open-outline" size={18} color={colors.white} />
            <Text style={styles.openIgText}>Open on Instagram</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.videoWrap}>
          {reel.posterUrl ? (
            <Image source={{ uri: reel.posterUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          {inWindow ? (
            <ReelVideo
              reel={reel}
              shouldPlay={isActive && !paused}
              muted={muted}
              onMount={(player) => onMountPlayer(reel.id, player)}
            />
          ) : (
            <View style={styles.posterGradient} />
          )}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={togglePlay}>
            {paused && (
              <View style={styles.playIconWrap}>
                <Icon name="play" size={44} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.rail}>
        <TouchableOpacity onPress={() => onProfile(reel.author.id)}>
          <Avatar size={44} name={reel.author.name} imageUrl={reel.author.avatarUrl} verified={reel.author.isVerified} />
        </TouchableOpacity>
        {!isMe && !reel.followedByMe && (
          <TouchableOpacity style={styles.followPill} onPress={() => onFollow(reel)} activeOpacity={0.8}>
            <Icon name="add" size={16} color={colors.white} />
          </TouchableOpacity>
        )}
        <RailButton
          icon={reel.likedByMe ? "heart" : "heart-outline"}
          active={reel.likedByMe}
          label={formatCount(reel.likeCount)}
          onPress={() => onLike(reel)}
        />
        <RailButton icon="chatbubble-ellipses-outline" label={formatCount(reel.commentCount)} onPress={() => onComments(reel)} />
        <RailButton icon="paper-plane-outline" label={formatCount(reel.shareCount)} onPress={() => onShare(reel)} />
        {isMe && <RailButton icon="trash-outline" label="" onPress={() => onDelete(reel)} />}
      </View>

      <View style={styles.info}>
        <View style={styles.infoHead}>
          <Text style={styles.infoName}>{reel.author.name}</Text>
          {reel.author.isVerified && <Icon name="checkmark-circle" size={14} color={colors.primary} />}
          <Text style={styles.infoUser}>@{reel.author.username ?? reel.author.name}</Text>
        </View>
        {!!reel.caption && (
          <Text style={styles.caption} numberOfLines={3}>
            {reel.caption}
          </Text>
        )}
        <Text style={styles.infoTime}>{formatTime(reel.createdAt)}</Text>
      </View>
    </View>
  );
}

function RailButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.railBtn} onPress={onPress} activeOpacity={0.7}>
      <Icon name={icon as any} size={27} color={active ? colors.pink : colors.white} />
      {label !== "" && <Text style={styles.railLabel}>{label}</Text>}
    </TouchableOpacity>
  );
}

export default function ReelsScreen() {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [height, setHeight] = useState(0);
  const [commentsReel, setCommentsReel] = useState<Reel | null>(null);
  const [shareReel, setShareReel] = useState<Reel | null>(null);
  const [copied, setCopied] = useState(false);
  const loadingMoreRef = useRef(false);
  const playersRef = useRef<Map<number, VideoPlayer>>(new Map());
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const load = useCallback(
    async (refresh = false) => {
      if (!token) return;
      refresh ? setRefreshing(true) : setLoading(true);
      try {
        const res = await api.reels(token, { limit: PAGE_SIZE });
        setReels(res.reels);
        setNextCursor(res.nextCursor);
        setError("");
        setActiveIndex(0);
      } catch (e: any) {
        setError(e.message ?? "Could not load reels");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  const loadMore = useCallback(async () => {
    if (!token || loadingMoreRef.current || !nextCursor || loading || refreshing) return;
    loadingMoreRef.current = true;
    try {
      const res = await api.reels(token, { cursor: nextCursor, limit: PAGE_SIZE });
      setReels((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...res.reels.filter((r) => !seen.has(r.id))];
      });
      setNextCursor(res.nextCursor);
    } catch {
      // silent - next scroll retries
    } finally {
      loadingMoreRef.current = false;
    }
  }, [token, nextCursor, loading, refreshing]);

  const pauseAll = useCallback(() => {
    playersRef.current.forEach((p) => p.pause());
  }, []);

  const resumeActive = useCallback(() => {
    const player = playersRef.current.get(reels[activeIndexRef.current]?.id ?? -1);
    if (player) player.play();
  }, [reels]);

  const activeIndexRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      load();
      resumeActive();
      return () => {
        pauseAll();
      };
    }, [load, resumeActive, pauseAll])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") pauseAll();
    });
    return () => sub.remove();
  }, [pauseAll]);

  const registerPlayer = useCallback((reelId: number, player: VideoPlayer | null) => {
    if (player) {
      playersRef.current.set(reelId, player);
    } else {
      playersRef.current.delete(reelId);
    }
  }, []);

  const toggleLike = useCallback(
    async (reel: Reel) => {
      if (!token) return;
      const liked = !reel.likedByMe;
      setReels((prev) =>
        prev.map((r) =>
          r.id === reel.id
            ? { ...r, likedByMe: liked, likeCount: Math.max(0, r.likeCount + (liked ? 1 : -1)) }
            : r
        )
      );
      try {
        await api.toggleReelLike(token, reel.id);
      } catch (e: any) {
        setReels((prev) =>
          prev.map((r) =>
            r.id === reel.id
              ? { ...r, likedByMe: !liked, likeCount: Math.max(0, r.likeCount + (liked ? -1 : 1)) }
              : r
          )
        );
        Alert.alert("Error", e.message ?? "Could not like reel");
      }
    },
    [token]
  );

  const toggleFollow = useCallback(
    async (reel: Reel) => {
      if (!token) return;
      const wasFollowing = reel.followedByMe;
      setReels((prev) => prev.map((r) => (r.id === reel.id ? { ...r, followedByMe: !wasFollowing } : r)));
      try {
        if (wasFollowing) await api.unfollow(token, reel.author.id);
        else await api.follow(token, reel.author.id);
      } catch (e: any) {
        setReels((prev) => prev.map((r) => (r.id === reel.id ? { ...r, followedByMe: wasFollowing } : r)));
        Alert.alert("Error", e.message ?? "Could not follow");
      }
    },
    [token]
  );

  const onDeleteReel = useCallback(
    (reel: Reel) => {
      Alert.alert("Delete Reel", "Delete this reel permanently?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await api.deleteReel(token, reel.id);
              setReels((prev) => prev.filter((r) => r.id !== reel.id));
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Could not delete reel");
            }
          },
        },
      ]);
    },
    [token]
  );

  const openShare = useCallback(
    (reel: Reel) => {
      setShareReel(reel);
      if (token) api.shareReel(token, reel.id).catch(() => {});
    },
    [token]
  );

  const share = useCallback(
    async (action: "copy" | "whatsapp" | "more") => {
      if (!shareReel) return;
      const link = `https://thesocialbook.app/reel/${shareReel.id}`;
      const message = `${shareReel.caption || "Check out this reel"}\n${link} · SocialBook`;
      if (action === "copy") {
        await Clipboard.setStringAsync(message);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setShareReel(null);
        }, 900);
      } else if (action === "whatsapp") {
        setShareReel(null);
        Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => {});
      } else {
        setShareReel(null);
        Share.share({ message }).catch(() => {});
      }
    },
    [shareReel]
  );

  const onMomentumEnd = useCallback(
    (e: any) => {
      if (height <= 0) return;
      const idx = Math.max(0, Math.round(e.nativeEvent.contentOffset.y / height));
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    },
    [height]
  );

  const listFooter = loadingMoreRef.current ? (
    <ActivityIndicator style={styles.footer} color={colors.white} />
  ) : null;

  let empty: React.ReactElement | null = null;
  if (loading) {
    empty = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  } else if (error) {
    empty = (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Couldn't load reels</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    empty = (
      <View style={styles.center}>
        <Icon name="film-outline" size={52} color={colors.white} />
        <Text style={styles.emptyTitle}>No reels yet</Text>
        <Text style={styles.emptySub}>Be the first to share a video reel</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate("CreateReel", {})}>
          <Text style={styles.retryText}>Share a Reel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <FlatList
          data={reels}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item, index }) => (
            <ReelItem
              reel={item}
              index={index}
              activeIndex={activeIndex}
              muted={muted}
              height={height}
              onLike={toggleLike}
              onShare={openShare}
              onComments={setCommentsReel}
              onDelete={onDeleteReel}
              onProfile={(id) => navigation.navigate("UserProfile", { userId: id })}
              onFollow={toggleFollow}
              onMountPlayer={registerPlayer}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          windowSize={5}
          maxToRenderPerBatch={3}
          initialNumToRender={2}
          removeClippedSubviews={true}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={listFooter}
          ListEmptyComponent={empty}
        />
      )}

      <TouchableOpacity style={styles.muteBtn} onPress={() => setMuted((m) => !m)} activeOpacity={0.8}>
        <Icon name={muted ? "volume-mute" : "volume-high"} size={20} color={colors.white} />
      </TouchableOpacity>

      {commentsReel && (
        <ReelComments
          reel={commentsReel}
          visible={!!commentsReel}
          onClose={() => setCommentsReel(null)}
          onCountChange={(delta) =>
            setReels((prev) =>
              prev.map((r) =>
                r.id === commentsReel.id ? { ...r, commentCount: Math.max(0, r.commentCount + delta) } : r
              )
            )
          }
        />
      )}

      <Modal visible={!!shareReel} transparent animationType="fade" onRequestClose={() => setShareReel(null)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShareReel(null)}>
          <View style={styles.shareSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Share Reel</Text>
            <TouchableOpacity style={styles.shareOption} onPress={() => share("copy")}>
              <Icon name={copied ? "checkmark" : "link-outline"} size={20} color={colors.primary} />
              <Text style={styles.shareOptionText}>{copied ? "Copied!" : "Copy link"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption} onPress={() => share("whatsapp")}>
              <Icon name="logo-whatsapp" size={20} color={colors.green} />
              <Text style={styles.shareOptionText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption} onPress={() => share("more")}>
              <Icon name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
              <Text style={styles.shareOptionText}>More options</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  item: {
    width: "100%",
  },
  videoWrap: {
    flex: 1,
    backgroundColor: "#000000",
  },
  posterWrap: {
    flex: 1,
    backgroundColor: "#000000",
  },
  posterGradient: {
    backgroundColor: "#111318",
  },
  videoFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111318",
    gap: 10,
    padding: 24,
  },
  videoFallbackText: {
    color: "#9AA4B2",
    fontSize: 14,
  },
  fallbackBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 999,
  },
  fallbackBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  playIconWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rail: {
    position: "absolute",
    right: 10,
    bottom: 96,
    alignItems: "center",
    gap: 16,
  },
  railBtn: {
    alignItems: "center",
    gap: 3,
  },
  railLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  followPill: {
    marginTop: -8,
    backgroundColor: colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  info: {
    position: "absolute",
    left: 14,
    right: 76,
    bottom: 28,
    gap: 4,
  },
  infoHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  infoUser: {
    color: "#C7CFDA",
    fontSize: 12,
  },
  caption: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 18,
  },
  infoTime: {
    color: "#9AA4B2",
    fontSize: 11,
    marginTop: 2,
  },
  muteBtn: {
    position: "absolute",
    top: 44,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(17,19,24,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  emptySub: {
    color: "#9AA4B2",
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
  },
  footer: {
    paddingVertical: 18,
    backgroundColor: "#000000",
  },
  externalBadge: {
    position: "absolute",
    top: 44,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,19,24,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  externalBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  openIgBtn: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
  },
  openIgText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "72%",
  },
  shareSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  sheetLoading: {
    paddingVertical: 30,
  },
  sheetEmpty: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 26,
    fontSize: 14,
  },
  commentList: {
    flexGrow: 0,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  replyRow: {
    marginLeft: 40,
  },
  commentBody: {
    flex: 1,
  },
  commentHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  commentTime: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  commentText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
  commentReply: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  replyChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
  },
  replyChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
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
    opacity: 0.45,
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  shareOptionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});