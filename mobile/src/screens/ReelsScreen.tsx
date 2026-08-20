import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Icon from "../components/Icon";
import { brandGradient, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import type { ReelFeedItem } from "../types";

const PAGE_SIZE = 6;
const MOUNT_WINDOW = 1;
const YT_STATE_PLAYING = 1;
const YT_STATE_PAUSED = 2;
const INDICATOR_MS = 650;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function playerHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  #player { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="player"></div>
<script>
  var player = null;
  var pending = { play: false, mute: true };
  function apply() {
    if (!player) return;
    try {
      if (pending.play) player.playVideo(); else player.pauseVideo();
      if (pending.mute) player.mute(); else player.unMute();
    } catch (e) {}
  }
  function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
      videoId: "${videoId}",
      width: "100%",
      height: "100%",
      playerVars: {
        playsinline: 1,
        autoplay: 0,
        mute: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        disablekb: 1,
        iv_load_policy: 3,
        showinfo: 0,
        loop: 1,
        playlist: "${videoId}"
      },
      events: {
        onReady: function () {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ t: "ready" }));
          apply();
        },
        onStateChange: function (e) {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ t: "state", s: e.data }));
        },
        onError: function (e) {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ t: "error", c: e.data }));
        }
      }
    });
  }
  function onMessage(ev) {
    try {
      var m = JSON.parse(ev.data);
      if (typeof m.play === "boolean") pending.play = m.play;
      if (typeof m.mute === "boolean") pending.mute = m.mute;
      apply();
    } catch (e) {}
  }
  window.addEventListener("message", onMessage);
  document.addEventListener("message", onMessage);
  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
</script>
</body>
</html>`;
}

function ShortsItem({
  item,
  index,
  activeIndex,
  height,
  registerPlayer,
}: {
  item: ReelFeedItem;
  index: number;
  activeIndex: number;
  height: number;
  registerPlayer: (videoId: string, ref: WebView | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const webRef = useRef<WebView | null>(null);
  const indTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playRef = useRef(false);
  const isActive = index === activeIndex;
  const inWindow = Math.abs(index - activeIndex) <= MOUNT_WINDOW;
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedCode, setFailedCode] = useState<number | null>(null);
  const [indicator, setIndicator] = useState<"play" | "pause" | null>(null);

  const html = useMemo(() => playerHtml(item.videoId), [item.videoId]);

  const send = useCallback((play: boolean, mute: boolean) => {
    webRef.current?.postMessage(JSON.stringify({ play, mute }));
  }, []);

  useEffect(() => {
    registerPlayer(item.videoId, inWindow ? webRef.current : null);
    return () => registerPlayer(item.videoId, null);
  }, [item.videoId, inWindow, registerPlayer]);

  useEffect(() => {
    playRef.current = false;
    setPlaying(false);
    setMuted(true);
    setLiked(false);
    setIndicator(null);
    if (indTimerRef.current) clearTimeout(indTimerRef.current);
  }, [item.videoId]);

  useEffect(() => {
    send(isActive, muted);
  }, [isActive, send, muted]);

  useEffect(() => {
    if (!isActive) {
      if (indTimerRef.current) clearTimeout(indTimerRef.current);
      setIndicator(null);
    }
  }, [isActive]);

  useEffect(
    () => () => {
      if (indTimerRef.current) clearTimeout(indTimerRef.current);
    },
    []
  );

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const m = JSON.parse(e.nativeEvent.data) as { t?: string; s?: number; c?: number };
        if (m.t === "ready") {
          setReady(true);
          send(isActive, muted);
        } else if (m.t === "state") {
          if (m.s === YT_STATE_PLAYING) {
            playRef.current = true;
            setPlaying(true);
          } else if (m.s === YT_STATE_PAUSED) {
            playRef.current = false;
            setPlaying(false);
          }
        } else if (m.t === "error") {
          setFailedCode(m.c ?? null);
          setFailed(true);
        }
      } catch {}
    },
    [isActive, send, muted]
  );

  const tap = useCallback(() => {
    if (!isActive) return;
    const next = !playRef.current;
    playRef.current = next;
    setIndicator(next ? "play" : "pause");
    if (indTimerRef.current) clearTimeout(indTimerRef.current);
    indTimerRef.current = setTimeout(() => setIndicator(null), INDICATOR_MS);
    send(next, muted);
  }, [isActive, send, muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      send(playRef.current, next);
      return next;
    });
  }, [send]);

  const onComment = () => {
    navigation.navigate("CreatePost", {
      prefill: `Watch this reel: https://youtube.com/shorts/${item.videoId}`,
    });
  };

  const onShare = () => {
    Share.share({
      title: `${item.title} · SocialBook`,
      message: `${item.title}\nhttps://youtube.com/shorts/${item.videoId} · SocialBook`,
    }).catch(() => {});
  };

  return (
    <View style={[styles.item, { height }]}>
      {item.thumbnailUrl && (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
      )}
      {inWindow && !failed ? (
        <WebView
          ref={(ref) => {
            webRef.current = ref;
          }}
          source={{ html, baseUrl: "https://thesocialbook.app" }}
          style={styles.player}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={onMessage}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.fallbackGradient}>
          {failed && (
            <>
              <Text style={styles.fallbackText}>
                {failedCode === 150 || failedCode === 101
                  ? "This video can't be embedded"
                  : "Couldn't play this video"}
              </Text>
              <TouchableOpacity style={styles.fallbackBtn} onPress={() => setFailed(false)} activeOpacity={0.85}>
                <Icon name="refresh" size={18} color={colors.white} />
                <Text style={styles.fallbackBtnText}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      {!ready && !failed && inWindow && (
        <View style={styles.loadingWrap} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      )}

      <TouchableOpacity style={styles.tapLayer} activeOpacity={1} onPress={tap} />

      {isActive && (
        <View style={styles.info}>
          <LinearGradient colors={brandGradient(colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.channelTitle || "?").charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <Text style={styles.username} numberOfLines={1}>
            @{item.channelTitle}
          </Text>
        </View>
      )}

      {isActive && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setLiked((prev) => !prev)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel={liked ? "Unlike" : "Like"}
            accessibilityState={{ selected: liked }}
          >
            <Icon name={liked ? "heart" : "heart-outline"} size={32} color={liked ? colors.primary : colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onComment}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Comment"
          >
            <Icon name="chatbubble-outline" size={30} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onShare}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Share"
          >
            <Icon name="arrow-redo-outline" size={30} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {isActive && (
        <TouchableOpacity
          style={styles.muteBtn}
          onPress={toggleMute}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={muted ? "Unmute" : "Mute"}
        >
          <Icon name={muted ? "volume-mute" : "volume-high"} size={24} color={colors.white} />
        </TouchableOpacity>
      )}

      {indicator && (
        <View style={styles.indicatorWrap} pointerEvents="none">
          <Icon name={indicator} size={60} color={colors.white} />
        </View>
      )}
    </View>
  );
}

export default function ReelsScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [items, setItems] = useState<ReelFeedItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hasLoadedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const loadingMoreRef = useRef(false);
  const loadingRef = useRef(false);
  const firstFocusRef = useRef(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [height, setHeight] = useState(0);
  const playersRef = useRef<Map<string, WebView | null>>(new Map());
  const itemsRef = useRef<ReelFeedItem[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const load = useCallback(
    async (refresh = false) => {
      if (!token || loadingRef.current) return;
      loadingRef.current = true;
      if (refresh) {
        setRefreshing(true);
      } else if (!hasLoadedRef.current) {
        setStatus("loading");
      }
      try {
        const res = await api.reels(token, { limit: PAGE_SIZE });
        hasLoadedRef.current = true;
        const newItems = refresh ? shuffle([...res.items]) : res.items;
        const unchanged =
          !refresh &&
          itemsRef.current.length === newItems.length &&
          itemsRef.current.every((it, i) => it.videoId === newItems[i]?.videoId);
        if (!unchanged) {
          seenRef.current = new Set(newItems.map((it) => it.videoId));
          setItems(newItems);
          setNextPageToken(res.nextPageToken);
          setActiveIndex(0);
          activeIndexRef.current = 0;
        }
        setErrorMsg("");
        setStatus("ready");
      } catch (e: any) {
        setErrorMsg(e.message ?? "Could not load reels");
        if (!hasLoadedRef.current) setStatus("error");
      } finally {
        loadingRef.current = false;
        setRefreshing(false);
      }
    },
    [token]
  );

  const loadMore = useCallback(async () => {
    if (!token || loadingMoreRef.current || !nextPageToken || refreshing) return;
    loadingMoreRef.current = true;
    try {
      const res = await api.reels(token, { pageToken: nextPageToken, limit: PAGE_SIZE });
      setItems((prev) => {
        const seen = seenRef.current;
        const fresh = res.items.filter((it) => !seen.has(it.videoId));
        fresh.forEach((it) => seen.add(it.videoId));
        return [...prev, ...fresh];
      });
      setNextPageToken(res.nextPageToken);
    } catch {
      // silent - next scroll retries
    } finally {
      loadingMoreRef.current = false;
    }
  }, [token, nextPageToken, refreshing]);

  const registerPlayer = useCallback((videoId: string, ref: WebView | null) => {
    if (ref) {
      playersRef.current.set(videoId, ref);
    } else {
      playersRef.current.delete(videoId);
    }
  }, []);

  const pauseAll = useCallback(() => {
    playersRef.current.forEach((ref) => {
      ref?.postMessage(JSON.stringify({ play: false }));
    });
  }, []);

  const resumeActive = useCallback(() => {
    const item = itemsRef.current[activeIndexRef.current];
    if (!item) return;
    const ref = playersRef.current.get(item.videoId);
    ref?.postMessage(JSON.stringify({ play: true }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        load(true);
      } else {
        resumeActive();
      }
      return () => {
        pauseAll();
      };
    }, [load, resumeActive, pauseAll])
  );

  useEffect(() => {
    const unsub = navigation.addListener("tabPress", () => {
      load(true);
    });
    return unsub;
  }, [navigation, load]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        pauseAll();
      } else if (isFocused) {
        load(true);
        resumeActive();
      }
    });
    return () => sub.remove();
  }, [pauseAll, resumeActive, load, isFocused]);

  const onMomentumEnd = useCallback(
    (e: any) => {
      if (height <= 0) return;
      const idx = Math.max(0, Math.round(e.nativeEvent.contentOffset.y / height));
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    },
    [height]
  );

  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 60 });

  const onViewableChanged = useCallback(({ viewableItems }: any) => {
    const first = viewableItems[0];
    if (first && typeof first.index === "number" && first.isViewable) {
      activeIndexRef.current = first.index;
      setActiveIndex(first.index);
    }
  }, []);

  const listFooter = loadingMoreRef.current ? (
    <ActivityIndicator style={styles.footer} color={colors.white} />
  ) : null;

  return (
    <View style={styles.container} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>Loading reels…</Text>
        </View>
      ) : status === "error" ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" size={52} color={colors.white} />
          <Text style={styles.emptyTitle}>Couldn't load reels</Text>
          <Text style={styles.emptySub}>{errorMsg || "Check your connection and try again"}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Icon name="film-outline" size={52} color={colors.white} />
          <Text style={styles.emptyTitle}>No reels available right now</Text>
          <Text style={styles.emptySub}>Check back in a few minutes</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.videoId}
          renderItem={({ item, index }) => (
            <ShortsItem
              item={item}
              index={index}
              activeIndex={activeIndex}
              height={height}
              registerPlayer={registerPlayer}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          onViewableItemsChanged={onViewableChanged}
          viewabilityConfig={viewabilityConfigRef.current}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          windowSize={5}
          maxToRenderPerBatch={3}
          initialNumToRender={2}
          removeClippedSubviews={true}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={listFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.white}
              colors={[colors.primary]}
              progressBackgroundColor="#11161F"
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    item: {
      width: "100%",
      backgroundColor: "#000000",
    },
    thumb: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    player: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#000000",
    },
    fallbackGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#111318",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    },
    fallbackBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
    },
    fallbackText: {
      color: "#C7CFDA",
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    fallbackBtnText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 14,
    },
    loadingWrap: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0B0D10",
    },
    tapLayer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    info: {
      position: "absolute",
      left: 14,
      right: 74,
      bottom: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "800",
    },
    username: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "800",
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    actions: {
      position: "absolute",
      right: 12,
      bottom: 200,
      alignItems: "center",
      gap: 22,
    },
    actionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.28)",
    },
    muteBtn: {
      position: "absolute",
      right: 18,
      bottom: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.28)",
    },
    indicatorWrap: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
    loadingText: {
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
  });