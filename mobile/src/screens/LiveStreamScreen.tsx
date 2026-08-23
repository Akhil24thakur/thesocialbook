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
} from "react-native";
import { Camera, CameraType, CameraFlashMode, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { api as wsApi, onWsEvent } from "../ws";
import Icon from "../components/Icon";
import { formatTime, brandGradient, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import { connectWs } from "../ws";

const { width, height } = Dimensions.get("window");

type RouteParams = {
  sessionId?: number;
  title?: string;
};

export default function LiveStreamScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<{ params: RouteParams }>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [hasPermission, setHasPermission] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<CameraFlashMode>("off");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<Array<{ id: number; user: any; content: string; createdAt: string }>>([]);
  const [newComment, setNewComment] = useState("");
  const [session, setSession] = useState<any>(null);
  const [showComments, setShowComments] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const cameraRef = useRef<Camera>(null);
  const streamKeyRef = useRef<string>("");
  const rtmpUrlRef = useRef<string>("");
  const commentEndRef = useRef<View>(null);
  const wsConnectedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted" && micStatus === "granted");
    })();

    connectWs(token);

    const unsubscribeViewerCount = onWsEvent("viewer_count", null, (payload: any) => {
      setViewerCount(payload?.count ?? 0);
    });

    const unsubscribeComment = onWsEvent("new_comment", null, (payload: any) => {
      if (payload?.comment) {
        setComments((prev) => [...prev, payload.comment].slice(-100));
      }
    });

    const unsubscribeLiveStarted = onWsEvent("live_started", null, (payload: any) => {
      if (payload?.session) setSession(payload.session);
    });

    const unsubscribeLiveEnded = onWsEvent("live_ended", null, (payload: any) => {
      if (payload?.sessionId === session?.id) {
        setIsStreaming(false);
        setStreamStatus("idle");
        navigation.goBack();
      }
    });

    return () => {
      unsubscribeViewerCount();
      unsubscribeComment();
      unsubscribeLiveStarted();
      unsubscribeLiveEnded();
    };
  }, [token, navigation, session?.id]);

  useEffect(() => {
    if (route.params?.sessionId) {
      joinExistingSession(route.params.sessionId);
    } else if (route.params?.title) {
      startNewLive(route.params.title);
    }
  }, []);

  const joinExistingSession = async (sessionId: number) => {
    try {
      const res = await api.live.get(token!, sessionId);
      setSession(res.session);
      streamKeyRef.current = res.session.streamKey ?? "";
      rtmpUrlRef.current = res.session.rtmpUrl ?? "";
      await joinLive(sessionId);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to join live");
      navigation.goBack();
    }
  };

  const startNewLive = async (title: string) => {
    try {
      setStreamStatus("connecting");
      const res = await api.live.start(token!, title);
      setSession(res.session);
      streamKeyRef.current = res.session.streamKey ?? "";
      rtmpUrlRef.current = res.session.rtmpUrl ?? "";
      await joinLive(res.session.id);
    } catch (e: any) {
      setStreamStatus("error");
      setStreamError(e.message ?? "Failed to start live");
    }
  };

  const joinLive = async (sessionId: number) => {
    try {
      await api.live.join(token!, sessionId);
      wsApi.send(JSON.stringify({ type: "join_live", sessionId }));
      wsConnectedRef.current = true;
      setIsStreaming(true);
      setStreamStatus("live");
      startRtmpStream();
      loadComments(sessionId);
    } catch (e: any) {
      setStreamStatus("error");
      setStreamError(e.message ?? "Failed to join live");
    }
  };

  const loadComments = async (sessionId: number) => {
    try {
      const res = await api.live.comments(token!, sessionId, undefined, 50);
      setComments(res.comments);
    } catch {}
  };

  const startRtmpStream = async () => {
    if (!streamKeyRef.current || !rtmpUrlRef.current) return;
    try {
      if (Platform.OS === "android") {
      }
    } catch (e: any) {
      setStreamError(e.message);
      setStreamStatus("error");
    }
  };

  const stopRtmpStream = async () => {
  };

  const endLive = async () => {
    if (!session) return;
    try {
      await api.live.end(token!, session.id);
      wsApi.send(JSON.stringify({ type: "leave_live", sessionId: session.id }));
      wsConnectedRef.current = false;
      await stopRtmpStream();
      setIsStreaming(false);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to end live");
    }
  };

  const sendComment = async () => {
    if (!newComment.trim() || !session) return;
    const content = newComment.trim();
    setNewComment("");
    try {
      await api.live.postComment(token!, session.id, content);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to send comment");
    }
  };

  const toggleFlash = () => {
    const modes: CameraFlashMode[] = ["off", "on", "auto"];
    const currentIndex = modes.indexOf(flashMode);
    setFlashMode(modes[(currentIndex + 1) % modes.length]);
  };

  const switchCamera = () => {
    setCameraType((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleBackPress = () => {
    if (isStreaming) {
      Alert.alert("End Live?", "Are you sure you want to end the live stream?", [
        { text: "Cancel", style: "cancel" },
        { text: "End Live", style: "destructive", onPress: endLive },
      ]);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => backHandler.remove();
  }, [isStreaming]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.permissionText}>Requesting camera & microphone permissions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        ratio="16:9"
        autoFocus={Camera.Constants.AutoFocus.on}
        whiteBalance={Camera.Constants.WhiteBalance.auto}
        videoStabilization={Camera.Constants.VideoStabilization.standard}
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBackPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="chevron-back" size={28} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.liveTitle}>{session?.title || "Live"}</Text>
              <View style={styles.liveBadge}>
                <View style={[styles.liveDot, { backgroundColor: streamStatus === "live" ? "#00FF00" : colors.danger }]} />
                <Text style={styles.liveText}>{streamStatus === "live" ? "LIVE" : streamStatus.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.viewerWrap}>
              <Icon name="people" size={18} color={colors.white} />
              <Text style={styles.viewerCount}>{viewerCount}</Text>
            </View>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.controlBtn} onPress={switchCamera} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="camera-reverse" size={26} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={toggleFlash} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={flashMode === "on" ? "flash" : flashMode === "auto" ? "flash-auto" : "flash-off"} size={26} color={colors.white} />
            </TouchableOpacity>

            {isStreaming && (
              <TouchableOpacity style={styles.endBtn} onPress={endLive} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="stop-circle" size={32} color={colors.white} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.controlBtn} onPress={toggleMic} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={micMuted ? "mic-off" : "mic"} size={26} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={() => setShowComments(!showComments)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={showComments ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={26} color={colors.white} />
            </TouchableOpacity>
          </View>

          {showComments && comments.length > 0 && (
            <View style={styles.commentsContainer}>
              <View ref={commentEndRef} />
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Text style={styles.commentUser}>{item.user.name}: </Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                )}
                inverted
                onContentSizeChange={() => commentEndRef.current?.scrollIntoView()}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            </View>
          )}

          {showComments && (
            <View style={styles.commentInputWrap}>
              <TouchableOpacity
                style={styles.commentInput}
                onPress={() => setShowComments(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="chatbubble" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.commentPlaceholder}>Add a comment...</Text>
              </TouchableOpacity>
            </View>
          )}

          {showComments && (
            <View style={styles.commentInputActive}>
              <TextInput
                style={styles.textInput}
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={sendComment}
                placeholder="Add a comment..."
                maxLength={500}
                autoFocus
                blurOnSubmit={false}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendComment} disabled={!newComment.trim()}>
                <Icon name="send" size={22} color={newComment.trim() ? colors.primary : "rgba(255,255,255,0.4)"} />
              </TouchableOpacity>
            </View>
          )}

          {streamError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{streamError}</Text>
            </View>
          )}
        </View>
      </Camera>
    </SafeAreaView>
  );
}

const { useMemo, TextInput } = React;

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    camera: { flex: 1 },
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
    titleWrap: { flex: 1, alignItems: "center" },
    liveTitle: { fontSize: 17, fontWeight: "700", color: colors.white },
    liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontSize: 11, fontWeight: "800", color: colors.white },
    viewerWrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    viewerCount: { fontSize: 14, fontWeight: "700", color: colors.white },
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingBottom: insets.bottom + 16,
      paddingHorizontal: 8,
    },
    controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(10,14,22,0.6)", alignItems: "center", justifyContent: "center" },
    endBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
    commentsContainer: {
      position: "absolute",
      bottom: insets.bottom + 120,
      left: 12,
      right: 12,
      maxHeight: height * 0.4,
      backgroundColor: "rgba(10,14,22,0.85)",
      borderRadius: 16,
      padding: 12,
    },
    commentRow: { flexDirection: "row", marginBottom: 8, flexWrap: "wrap" },
    commentUser: { fontSize: 14, fontWeight: "700", color: colors.primary },
    commentText: { fontSize: 14, color: colors.white, flex: 1 },
    commentInputWrap: { position: "absolute", bottom: insets.bottom + 12, left: 12, right: 12 },
    commentInput: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(10,14,22,0.85)", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
    commentPlaceholder: { fontSize: 16, color: "rgba(255,255,255,0.6)" },
    commentInputActive: { position: "absolute", bottom: insets.bottom + 12, left: 12, right: 12, flexDirection: "row", gap: 8, alignItems: "center" },
    textInput: { flex: 1, backgroundColor: "rgba(10,14,22,0.9)", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: colors.white, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    errorBanner: { position: "absolute", top: insets.top + 8, left: 16, right: 16, backgroundColor: colors.danger, borderRadius: 12, padding: 12 },
    errorText: { color: colors.white, fontSize: 14, textAlign: "center" },
    permissionText: { marginTop: 16, color: colors.white, textAlign: "center" },
  });
}