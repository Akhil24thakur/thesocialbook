import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { CameraView, Camera, useCameraPermissions, type CameraType, type FlashMode } from "expo-camera";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { onWsEvent, sendWs } from "../ws";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";
import { connectWs } from "../ws";

type RouteParams = {
  sessionId?: number;
  name?: string;
  avatarUrl?: string;
  otherId?: number;
};

export default function LiveStreamScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<{ params: RouteParams }>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const isViewer = !!route.params?.sessionId && route.params.sessionId > 0;

  const [hasPermission, setHasPermission] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [viewerCount, setViewerCount] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);

  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const sessionRef = useRef<any>(null);
  const hasJoinedRef = useRef(false);

  const isHost = session?.hostId === user?.id;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!isViewer) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        const { status: micStatus } = await requestRecordingPermissionsAsync();
        if (status === "denied" || micStatus === "denied") {
          setPermDenied(true);
        }
        setHasPermission(status === "granted" && micStatus === "granted");
      })();
    } else {
      setHasPermission(true);
    }

    connectWs(token);

    const unsubscribeViewerCount = onWsEvent("viewer_count", null, (payload: any) => {
      if (payload?.sessionId && payload.sessionId !== (sessionRef.current?.id ?? route.params?.sessionId)) return;
      setViewerCount(payload?.count ?? 0);
    });

    const unsubscribeLiveStarted = onWsEvent("live_started", null, (payload: any) => {
      if (payload?.session && payload.session.id === route.params?.sessionId) {
        setSession(payload.session);
      }
    });

    const unsubscribeLiveEnded = onWsEvent("live_ended", null, (payload: any) => {
      const currentSessionId = sessionRef.current?.id ?? route.params?.sessionId;
      if (payload?.sessionId === currentSessionId) {
        setIsStreaming(false);
        setStreamStatus("idle");
        if (isViewer) {
          Alert.alert("Live Ended", "The live stream has ended.");
        }
        navigation.goBack();
      }
    });

    return () => {
      unsubscribeViewerCount();
      unsubscribeLiveStarted();
      unsubscribeLiveEnded();
      hasJoinedRef.current = false;
    };
  }, [token, navigation, route.params?.sessionId, isViewer]);

  useEffect(() => {
    if (!route.params?.sessionId || hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    joinExistingSession(route.params.sessionId);
  }, [route.params?.sessionId]);

  useEffect(() => {
    if (!session?.id) return;
    const interval = setInterval(() => {
      api.live.viewerCount(token!, session.id).then((r) => setViewerCount(r.count)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [session?.id]);

  const joinExistingSession = async (sessionId: number) => {
    try {
      setStreamStatus("connecting");
      const res = await api.live.get(token!, sessionId);
      setSession(res.session);
      await joinLive(sessionId);
    } catch (e: any) {
      setStreamStatus("error");
      setStreamError(e.message ?? "Failed to join live");
    }
  };

  const startNewLive = async () => {
    try {
      setStreamStatus("connecting");
      const res = await api.live.start(token!);
      setSession(res.session);
      await joinLive(res.session.id);
    } catch (e: any) {
      setStreamStatus("error");
      setStreamError(e.message ?? "Failed to start live");
    }
  };

  const joinLive = async (sessionId: number) => {
    try {
      await api.live.join(token!, sessionId);
      sendWs({ type: "join_live", sessionId });
      setIsStreaming(true);
      setStreamStatus("live");
    } catch (e: any) {
      setStreamStatus("error");
      setStreamError(e.message ?? "Failed to join live");
    }
  };

  const endLive = async () => {
    if (!session) return;
    try {
      if (isHost) {
        await api.live.end(token!, session.id);
      } else {
        await api.live.leave(token!, session.id);
      }
      sendWs({ type: "leave_live", sessionId: session.id });
      setIsStreaming(false);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to end live");
    }
  };

  const toggleFlash = () => {
    const modes: FlashMode[] = ["off", "on", "auto"];
    const currentIndex = modes.indexOf(flashMode);
    setFlashMode(modes[(currentIndex + 1) % modes.length]);
  };

  const toggleMic = () => setMicMuted((m) => !m);

  const switchCamera = () => {
    setCameraType((prev) => (prev === "back" ? "front" : "back"));
  };

  const loadViewers = async () => {
    if (!session) return;
    setViewersModalVisible(true);
    setViewersLoading(true);
    try {
      const res = await api.live.viewers(token!, session.id);
      setViewers(res.viewers ?? res.users ?? []);
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  };

  const handleBackPress = () => {
    if (isStreaming && isHost) {
      Alert.alert("End Live?", "Are you sure you want to end the live stream?", [
        { text: "Cancel", style: "cancel" },
        { text: "End Live", style: "destructive", onPress: endLive },
      ]);
      return true;
    }
    if (isStreaming && !isHost) {
      endLive();
      return true;
    }
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => backHandler.remove();
  }, [isStreaming, isHost]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        {permDenied ? (
          <>
            <Icon name="camera-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.permissionText}>Camera & microphone permissions are required for live streaming.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 20 }}>
              <Text style={styles.retryText}>Go Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.permissionText}>Requesting camera & microphone permissions...</Text>
          </>
        )}
      </View>
    );
  }

  const hostName = route.params?.name || session?.host?.name || "Live";
  const hostAvatar = route.params?.avatarUrl || session?.host?.avatarUrl || null;

  if (isViewer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.viewerBg}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBackPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="chevron-back" size={28} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <View style={styles.hostInfo}>
                <Avatar name={hostName} size={28} imageUrl={hostAvatar} />
                <Text style={styles.liveTitle}>{hostName}</Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={[styles.liveDot, { backgroundColor: streamStatus === "live" ? "#00FF00" : colors.danger }]} />
                <Text style={styles.liveText}>{streamStatus === "live" ? "LIVE" : streamStatus.toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewerWrap} onPress={loadViewers} disabled={!isStreaming}>
              <Icon name="people" size={18} color={colors.white} />
              <Text style={styles.viewerCount}>{viewerCount}</Text>
            </TouchableOpacity>
          </View>

          {streamStatus === "connecting" && (
            <View style={styles.centerContent}>
              <Avatar name={hostName} size={100} imageUrl={hostAvatar} />
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
              <Text style={styles.connectingText}>Joining live...</Text>
            </View>
          )}

          {streamStatus === "live" && (
            <View style={styles.centerContent}>
              <View style={styles.pulseRing}>
                <Avatar name={hostName} size={120} imageUrl={hostAvatar} />
              </View>
              <Text style={styles.viewerLiveText}>{hostName} is live</Text>
              <View style={styles.viewerWatchingRow}>
                <Icon name="people" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.viewerCountText}>{viewerCount} watching</Text>
              </View>
            </View>
          )}

          {streamError && (
            <View style={styles.centerContent}>
              <Icon name="alert-circle" size={48} color={colors.danger} />
              <Text style={styles.errorText}>{streamError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setStreamError(null); setStreamStatus("idle"); navigation.goBack(); }}>
                <Text style={styles.retryText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.leaveBtn} onPress={endLive} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close-circle" size={56} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={viewersModalVisible} transparent animationType="slide" onRequestClose={() => setViewersModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.viewersModal}>
              <View style={styles.viewersHeader}>
                <Text style={styles.viewersTitle}>Viewers ({viewerCount})</Text>
                <TouchableOpacity onPress={() => setViewersModalVisible(false)}>
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              {viewersLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
              ) : viewers.length === 0 ? (
                <Text style={styles.noViewers}>No viewers yet</Text>
              ) : (
                <FlatList
                  data={viewers}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <View style={styles.viewerRow}>
                      <Avatar name={item.name} size={36} imageUrl={item.avatarUrl} />
                      <View style={styles.viewerInfo}>
                        <View style={styles.viewerNameRow}>
                          <Text style={styles.viewerName}>{item.name}</Text>
                          {item.isVerified && <Icon name="checkmark-circle" size={14} color="#1877F2" />}
                        </View>
                        <Text style={styles.viewerUsername}>@{item.username}</Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
        videoStabilizationMode="standard"
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
            <TouchableOpacity style={styles.viewerWrap} onPress={loadViewers} disabled={!isStreaming}>
              <Icon name="people" size={18} color={colors.white} />
              <Text style={styles.viewerCount}>{viewerCount}</Text>
            </TouchableOpacity>
          </View>

          {!isStreaming && streamStatus === "idle" && (
            <View style={styles.centerContent}>
              <TouchableOpacity style={styles.goLiveBtn} onPress={startNewLive}>
                <Icon name="videocam" size={40} color={colors.white} />
                <Text style={styles.goLiveText}>Go Live</Text>
                <Text style={styles.goLiveSub}>Tap to start broadcasting</Text>
              </TouchableOpacity>
            </View>
          )}

          {streamStatus === "connecting" && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.connectingText}>Connecting...</Text>
            </View>
          )}

          {streamError && (
            <View style={styles.centerContent}>
              <Icon name="alert-circle" size={48} color={colors.danger} />
              <Text style={styles.errorText}>{streamError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setStreamError(null); setStreamStatus("idle"); }}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.controlBtn} onPress={switchCamera} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="camera-reverse" size={26} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={toggleFlash} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={flashMode === "on" ? "flash" : flashMode === "auto" ? "aperture" : "flash-off"} size={26} color={colors.white} />
            </TouchableOpacity>

            {isStreaming && (
              <TouchableOpacity style={styles.endBtn} onPress={endLive} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="stop-circle" size={32} color={colors.white} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.controlBtn} onPress={toggleMic} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name={micMuted ? "mic-off" : "mic"} size={26} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      <Modal visible={viewersModalVisible} transparent animationType="slide" onRequestClose={() => setViewersModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.viewersModal}>
            <View style={styles.viewersHeader}>
              <Text style={styles.viewersTitle}>Viewers ({viewerCount})</Text>
              <TouchableOpacity onPress={() => setViewersModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {viewersLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
            ) : viewers.length === 0 ? (
              <Text style={styles.noViewers}>No viewers yet</Text>
            ) : (
              <FlatList
                data={viewers}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.viewerRow}>
                    <Avatar name={item.name} size={36} imageUrl={item.avatarUrl} />
                    <View style={styles.viewerInfo}>
                      <View style={styles.viewerNameRow}>
                        <Text style={styles.viewerName}>{item.name}</Text>
                        {item.isVerified && <Icon name="checkmark-circle" size={14} color="#1877F2" />}
                      </View>
                      <Text style={styles.viewerUsername}>@{item.username}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors, insets: EdgeInsets) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    camera: { flex: 1 },
    viewerBg: { flex: 1, backgroundColor: "#1A1A2E" },
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
    hostInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
    liveTitle: { fontSize: 17, fontWeight: "700", color: colors.white },
    liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontSize: 11, fontWeight: "800", color: colors.white },
    viewerWrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    viewerCount: { fontSize: 14, fontWeight: "700", color: colors.white },
    centerContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    goLiveBtn: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    goLiveText: { fontSize: 20, fontWeight: "800", color: colors.white },
    goLiveSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "center" },
    connectingText: { fontSize: 16, color: colors.white, marginTop: 12 },
    viewerLiveText: { fontSize: 20, fontWeight: "700", color: colors.white, marginTop: 12 },
    viewerWatchingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    viewerCountText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
    pulseRing: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 3,
      borderColor: "#FF3B30",
      alignItems: "center",
      justifyContent: "center",
    },
    errorText: { fontSize: 14, color: colors.white, marginTop: 8, textAlign: "center", paddingHorizontal: 32 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 20 },
    retryText: { fontSize: 14, fontWeight: "700", color: colors.white },
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingBottom: insets.bottom + 16,
      paddingHorizontal: 8,
    },
    controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(10,14,22,0.6)", alignItems: "center", justifyContent: "center" },
    endBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
    leaveBtn: { alignItems: "center", justifyContent: "center" },
    permissionText: { marginTop: 16, color: colors.white, textAlign: "center" },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },

    viewersModal: {
      width: "100%",
      maxHeight: "60%",
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      marginTop: "auto",
    },
    viewersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    viewersTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    noViewers: { fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: 32 },
    viewerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
    viewerInfo: { flex: 1 },
    viewerNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    viewerName: { fontSize: 15, fontWeight: "600", color: colors.text },
    viewerUsername: { fontSize: 13, color: colors.textSecondary },
  });
}
