import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Icon from "../components/Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";
import type { ReelFeedItem } from "../types";

const PAGE_SIZE = 6;
const MOUNT_WINDOW = 1;
const YT_STATE_PLAYING = 1;
const YT_STATE_PAUSED = 2;

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
        controls: 1,
        rel: 0,
        modestbranding: 1,
        disablekb: 1,
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
  muted,
  onToggleMute,
  registerPlayer,
}: {
  item: ReelFeedItem;
  index: number;
  activeIndex: number;
  height: number;
  muted: boolean;
  onToggleMute: () => void;
  registerPlayer: (videoId: string, ref: WebView | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const webRef = useRef<WebView | null>(null);
  const isActive = index === activeIndex;
  const inWindow = Math.abs(index - activeIndex) <= MOUNT_WINDOW;
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedCode, setFailedCode] = useState<number | null>(null);

  const send = useCallback(
    (play: boolean, mute: boolean) => {
      webRef.current?.postMessage(JSON.stringify({ play, mute }));
    },
    []
  );

  useEffect(() => {
    registerPlayer(item.videoId, inWindow ? webRef.current : null);
    return () => registerPlayer(item.videoId, null);
  }, [item.videoId, inWindow, registerPlayer]);

  useEffect(() => {
    send(isActive, muted);
  }, [isActive, muted, send]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const m = JSON.parse(e.nativeEvent.data) as { t?: string; s?: number; c?: number };
        if (m.t === "ready") {
          setReady(true);
          send(isActive, muted);
        } else if (m.t === "state") {
          if (m.s === YT_STATE_PLAYING) setPlaying(true);
          else if (m.s === YT_STATE_PAUSED) setPlaying(false);
        } else if (m.t === "error") {
          setFailedCode(m.c ?? null);
          setFailed(true);
        }
      } catch {}
    },
    [isActive, muted, send]
  );

  const togglePlay = useCallback(() => {
    send(!playing, muted);
  }, [playing, muted, send]);

  const openOnYouTube = () => {
    Linking.openURL(`https://youtube.com/shorts/${item.videoId}`).catch(() => {});
  };

  return (
    <View style={[styles.item, { height }]}>
      {item.thumbnailUrl && (
        <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {inWindow && !failed ? (
        <WebView
          ref={(ref) => {
            webRef.current = ref;
          }}
          source={{ html: playerHtml(item.videoId), baseUrl: "https://thesocialbook.app" }}
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
              <View style={styles.fallbackRow}>
                <TouchableOpacity style={styles.fallbackBtn} onPress={() => setFailed(false)} activeOpacity={0.85}>
                  <Icon name="refresh" size={18} color={colors.white} />
                  <Text style={styles.fallbackBtnText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fallbackBtnOutline} onPress={openOnYouTube} activeOpacity={0.85}>
                  <Icon name="logo-youtube" size={18} color={colors.white} />
                  <Text style={styles.fallbackBtnText}>Open on YouTube</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
      {!ready && !failed && inWindow && (
        <View style={styles.loadingWrap} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      )}

      <TouchableOpacity style={styles.ytChip} onPress={openOnYouTube} activeOpacity={0.85}>
        <Icon name="logo-youtube" size={18} color={colors.white} />
        <Text style={styles.ytChipText}>YouTube</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute} activeOpacity={0.8}>
        <Icon name={muted ? "volume-mute" : "volume-high"} size={20} color={colors.white} />
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.channelRow}>
          <Icon name="person-circle-outline" size={16} color="#C7CFDA" />
          <Text style={styles.channel}>{item.channelTitle}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.playBtn} onPress={togglePlay} activeOpacity={0.8}>
        <Icon name={playing ? "pause" : "play"} size={22} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

export default function ReelsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<ReelFeedItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hasLoadedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const loadingMoreRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [muted, setMuted] = useState(true);
  const [height, setHeight] = useState(0);
  const playersRef = useRef<Map<string, WebView | null>>(new Map());
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const load = useCallback(
    async (refresh = false) => {
      if (!token) return;
      if (refresh) {
        setRefreshing(true);
      } else if (!hasLoadedRef.current) {
        setStatus("loading");
      }
      try {
        const res = await api.reels(token, { limit: PAGE_SIZE });
        const newItems = res.items;
        const unchanged =
          hasLoadedRef.current &&
          itemsRef.current.length === newItems.length &&
          itemsRef.current.every((it, i) => it.videoId === newItems[i]?.videoId);
        if (!unchanged) {
          hasLoadedRef.current = true;
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

  const itemsRef = useRef<ReelFeedItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const resumeActive = useCallback(() => {
    const item = itemsRef.current[activeIndexRef.current];
    if (!item) return;
    const ref = playersRef.current.get(item.videoId);
    ref?.postMessage(JSON.stringify({ play: true, mute: mutedRef.current }));
  }, []);

  const mutedRef = useRef(true);
  mutedRef.current = muted;

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
      if (state !== "active") {
        pauseAll();
      } else {
        resumeActive();
      }
    });
    return () => sub.remove();
  }, [pauseAll, resumeActive]);

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
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              registerPlayer={registerPlayer}
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
    fallbackBtnOutline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: "#3A4150",
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
    fallbackRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
    ytChip: {
      position: "absolute",
      top: 44,
      left: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(17,19,24,0.6)",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    ytChipText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "700",
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
    info: {
      position: "absolute",
      left: 14,
      right: 84,
      bottom: 24,
      gap: 5,
    },
    title: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 20,
    },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    channel: {
      color: "#C7CFDA",
      fontSize: 13,
    },
    playBtn: {
      position: "absolute",
      right: 14,
      bottom: 26,
      width: 44,
      height: 44,
      borderRadius: 22,
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