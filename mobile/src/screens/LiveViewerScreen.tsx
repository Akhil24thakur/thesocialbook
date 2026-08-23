import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Image,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { api as wsApi, onWsEvent } from "../ws";
import { connectWs } from "../ws";
import Icon from "../components/Icon";
import { formatTime, type Colors } from "../theme";
import { useTheme } from "../theme-context";

const { width, height } = Dimensions.get("window");

type RouteParams = {
  sessionId: number;
};

export default function LiveViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<{ params: RouteParams }>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sessionId = route.params.sessionId;
  const [session, setSession] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<Array<{ id: number; user: any; content: string; createdAt: string }>>([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [videoStatus, setVideoStatus] = useState<"loading" | "playing" | "error" | "ended">("loading");
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  const commentEndRef = useRef<View>(null);
  const wsConnectedRef = useRef(false);

  useEffect(() => {
    connectWs(token);
    loadSession();
    joinLive();
    loadComments();

    const unsubscribeViewerCount = onWsEvent("viewer_count", null, (payload: any) => {
      setViewerCount(payload?.count ?? 0);
    });

    const unsubscribeComment = onWsEvent("new_comment", null, (payload: any) => {
      if (payload?.comment) {
        setComments((prev) => [...prev, payload.comment].slice(-100));
      }
    });

    const unsubscribeViewerJoined = onWsEvent("viewer_joined", null, (payload: any) => {
      // Could show join animation
    });

    const unsubscribeViewerLeft = onWsEvent("viewer_left", null, (payload: any) => {
      // Could show leave animation
    });

    const unsubscribeLiveEnded = onWsEvent("live_ended", null, (payload: any) => {
      if (payload?.sessionId === sessionId) {
        setVideoStatus("ended");
        setSession((s) => s ? { ...s, status: "ended" } : null);
      }
    });

    return () => {
      unsubscribeViewerCount();
      unsubscribeComment();
      unsubscribeViewerJoined();
      unsubscribeViewerLeft();
      unsubscribeLiveEnded();
      leaveLive();
    };
  }, [sessionId, token]);

  const loadSession = async () => {
    try {
      const res = await api.live.get(token!, sessionId);
      setSession(res.session);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to load live");
      navigation.goBack();
    }
  };

  const joinLive = async () => {
    try {
      await api.live.join(token!, sessionId);
      wsApi.send(JSON.stringify({ type: "join_live", sessionId }));
      wsConnectedRef.current = true;
      setIsJoined(true);
      initializeVideo();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to join live");
      navigation.goBack();
    }
  };

  const leaveLive = async () => {
    if (!isJoined) return;
    try {
      await api.live.leave(token!, sessionId);
      wsApi.send(JSON.stringify({ type: "leave_live", sessionId }));
      wsConnectedRef.current = false;
      setIsJoined(false);
    } catch {}
  };

  const initializeVideo = () => {
    if (!session?.playbackUrl) {
      setVideoStatus("error");
      setVideoError("No playback URL available");
      return;
    }
    setVideoStatus("loading");
    setVideoError(null);
  };

  const loadComments = async () => {
    try {
      const res = await api.live.comments(token!, sessionId, undefined, 50);
      setComments(res.comments);
    } catch {}
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    const content = newComment.trim();
    setNewComment("");
    try {
      await api.live.postComment(token!, sessionId, content);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to send comment");
    }
  };

  const handleVideoError = useCallback((error: any) => {
    console.error("Video error:", error);
    setVideoStatus("error");
    setVideoError("Failed to load stream. The live may have ended.");
  }, []);

  const handlePlaybackStatusUpdate = useCallback((status: any) => {
    if (status.didJustFinish) {
      setVideoStatus("ended");
    } else if (status.isPlaying) {
      setVideoStatus("playing");
    } else if (status.isBuffering) {
      // Keep loading
    } else if (status.error) {
      handleVideoError(status.error);
    }
  }, [handleVideoError]);

  const handleBackPress = () => {
    leaveLive();
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => backHandler.remove();
  }, []);

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isLiveEnded = session.status === "ended" || videoStatus === "ended";

  return (
    <SafeAreaView style={styles.container}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: session.playbackUrl }}
        useNativeControls={false}
        resizeMode="contain"
        shouldPlay={!isLiveEnded}
        isLooping={false}
        rate={1.0}
        volume={1.0}
        onError={handleVideoError}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoadStart={() => setVideoStatus("loading")}
        onLoad={() => {}}
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevron-back" size={28} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <TouchableOpacity onPress={() => navigation.navigate("UserProfile", { userId: session.hostId })} style={styles.hostRow}>
              <Image source={{ uri: session.host.avatarUrl }} style={styles.hostAvatar} />
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{session.host.name}</Text>
                <View style={styles.liveBadge}>
                  <View style={[styles.liveDot, { backgroundColor: isLiveEnded ? "rgba(255,255,255,0.5)" : "#00FF00" }]} />
                  <Text style={styles.liveText}>{isLiveEnded ? "ENDED" : "LIVE"}</Text>
                </View>
              </View>
            </TouchableOpacity>
            {session.title && <Text style={styles.liveTitle}>{session.title}</Text>}
          </View>
          <View style={styles.viewerWrap}>
            <Icon name="people" size={18} color={colors.white} />
            <Text style={styles.viewerCount}>{viewerCount}</Text>
          </View>
        </View>

        {videoStatus === "loading" && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.loadingText}>Connecting to live...</Text>
          </View>
        )}

        {(videoStatus === "error" || isLiveEnded) && (
          <View style={styles.endedOverlay}>
            <Icon name={isLiveEnded ? "videocam-off" : "alert-circle"} size={48} color="rgba(255,255,255,0.7)" />
            <Text style={styles.endedText}>{isLiveEnded ? "This live has ended" : "Unable to load stream"}</Text>
            <Text style={styles.endedSubtext}>{isLiveEnded ? "Thanks for watching!" : "The live may have ended or there's a connection issue"}</Text>
          </View>
        )}

        {showComments && comments.length > 0 && (
          <View style={styles.commentsContainer}>
            <FlatList
              ref={commentEndRef}
              data={comments}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <TouchableOpacity onPress={() => navigation.navigate("UserProfile", { userId: item.user.id })}>
                    <Image source={{ uri: item.user.avatarUrl }} style={styles.commentAvatar} />
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <TouchableOpacity onPress={() => navigation.navigate("UserProfile", { userId: item.user.id })}>
                      <Text style={styles.commentUser}>{item.user.name}</Text>
                    </TouchableOpacity>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                </View>
              )}
              inverted
              onContentSizeChange={() => commentEndRef.current?.scrollIntoView()}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          </View>
        )}

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.commentToggle}
            onPress={() => setShowComments(!showComments)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name={showComments ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={26} color={colors.white} />
            {comments.length > 0 && <View style={styles.commentBadge}><Text style={styles.commentBadgeText}>{comments.length > 99 ? "99+" : comments.length}</Text></View>}
          </TouchableOpacity>

          {showComments && (
            <View style={styles.commentInputActive}>
              <TextInput
                style={styles.textInput}
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={sendComment}
                placeholder="Add a comment..."
                maxLength={500}
                autoFocus={false}
                blurOnSubmit={false}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendComment} disabled={!newComment.trim()}>
                <Icon name="send" size={22} color={newComment.trim() ? colors.primary : "rgba(255,255,255,0.4)"} />
              </TouchableOpacity>
            </View>
          )}

          {showComments && <View style={styles.keyboardSpacer} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const { useMemo } = React;

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    video: { ...StyleSheet.absoluteFillObject },
    overlay: { flex: 1, backgroundColor: "transparent" },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    backBtn: { padding: 4 },
    titleWrap: { flex: 1, paddingHorizontal: 8 },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    hostAvatar: { width: 36, height: 36, borderRadius: 18 },
    hostInfo: { flex: 1 },
    hostName: { fontSize: 15, fontWeight: "700", color: colors.white },
    liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontSize: 11, fontWeight: "800", color: colors.white },
    liveTitle: { fontSize: 15, fontWeight: "600", color: colors.white, marginTop: 4, textAlign: "center" },
    viewerWrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    viewerCount: { fontSize: 14, fontWeight: "700", color: colors.white },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.8)" },
    loadingText: { marginTop: 16, color: colors.white, fontSize: 16 },
    endedOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.85)", paddingHorizontal: 32 },
    endedText: { marginTop: 16, color: colors.white, fontSize: 20, fontWeight: "700", textAlign: "center" },
    endedSubtext: { marginTop: 8, color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center" },
    commentsContainer: {
      position: "absolute",
      bottom: insets.bottom + 120,
      left: 12,
      right: 12,
      maxHeight: height * 0.5,
      backgroundColor: "rgba(10,14,22,0.9)",
      borderRadius: 16,
      padding: 12,
    },
    commentRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    commentAvatar: { width: 32, height: 32, borderRadius: 16 },
    commentContent: { flex: 1 },
    commentUser: { fontSize: 14, fontWeight: "700", color: colors.primary },
    commentText: { fontSize: 14, color: colors.white, marginTop: 1 },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: insets.bottom,
      paddingHorizontal: 12,
    },
    commentToggle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(10,14,22,0.6)", alignItems: "center", justifyContent: "center", position: "relative" },
    commentBadge: { position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    commentBadgeText: { fontSize: 10, fontWeight: "800", color: colors.white },
    commentInputActive: { flexDirection: "row", gap: 8, alignItems: "center", marginLeft: 8, flex: 1 },
    textInput: { flex: 1, backgroundColor: "rgba(10,14,22,0.9)", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: colors.white, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    keyboardSpacer: { height: 0 },
  });
}