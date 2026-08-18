import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Caveat_700Bold } from "@expo-google-fonts/caveat";
import { NavigationContainer, createNavigationContainerRef, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { api } from "./src/api";
import CreateMenu from "./src/components/CreateMenu";
import Icon from "./src/components/Icon";
import TopAppBar from "./src/components/home/TopAppBar";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import FeedScreen from "./src/screens/FeedScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import PostDetailScreen from "./src/screens/PostDetailScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import Constants from "expo-constants";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import MessagesScreen from "./src/screens/MessagesScreen";
import ChatScreen from "./src/screens/ChatScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import StoriesScreen from "./src/screens/StoriesScreen";
import { brandGradient, colors } from "./src/theme";
import { setPendingPush, usePendingPush } from "./src/pushBadge";

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

const Notifications = require("expo-notifications") as typeof import("expo-notifications");

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Notifications",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  }).catch(() => {});
}

Notifications.addNotificationReceivedListener(() => setPendingPush(true));

function PushTapNavigator() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data ?? {};
      if (!navigationRef.isReady()) return;
      if (data.type === "message" && data.conversationId) {
        navigationRef.navigate("Chat", {
          conversationId: Number(data.conversationId),
        });
      } else if (data.type === "post" && data.postId) {
        navigationRef.navigate("PostDetail", { postId: Number(data.postId) });
      } else {
        setPendingPush(true);
      }
    });
    return () => sub.remove();
  }, []);
  return null;
}

const RELEASES_URL = "https://api.github.com/repos/Akhil24thakur/thesocialbook/releases/latest";
const RELEASES_PAGE = "https://github.com/Akhil24thakur/thesocialbook/releases/latest";

function isNewerVersion(latest: string, current: string) {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

interface UpdateInfo {
  version: string;
  notes: string;
  apkUrl: string | null;
  apkSize?: number;
}

interface DownloadState {
  phase: "downloading" | "installing" | "error";
  progress: number;
  message?: string;
}

async function checkForUpdates(setUpdate: (u: UpdateInfo | null) => void) {
  try {
    const current = Constants.expoConfig?.version;
    if (!current) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(RELEASES_URL, { signal: controller.signal });
      if (!res.ok) return;
      const release = await res.json();
      const latest = String(release.tag_name ?? "").replace(/^v/, "");
      if (!latest || !isNewerVersion(latest, current)) return;
      const apk = (release.assets ?? []).find(
        (a: any) => typeof a.name === "string" && a.name.endsWith(".apk")
      );
      setUpdate({
        version: latest,
        notes: String(release.body ?? ""),
        apkUrl: apk?.browser_download_url ?? null,
        apkSize: typeof apk?.size === "number" ? apk.size : undefined,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Silent - update check is best effort
  }
}
const Tab = createBottomTabNavigator();

function CreatePlaceholder() {
  return null;
}

function HomeTabs() {
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const pendingPush = usePendingPush();
  const navigation = useNavigation<any>();
  const { logout, token } = useAuth();

  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const [notifRes, chatRes] = await Promise.all([
        api.notificationsUnreadCount(token),
        api.conversationsUnreadCount(token),
      ]);
      setUnreadCount(notifRes.unreadCount ?? 0);
      setChatUnread(chatRes.unreadCount ?? 0);
    } catch {
      // Silent - badges are best effort
    }
  }, [token]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => refreshUnread());
    refreshUnread();
    const interval = setInterval(refreshUnread, 45000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [navigation, refreshUnread]);

  const dotUnread = pendingPush || unreadCount > 0;

  const goTab = (tab: string) => navigation.navigate("Home", { screen: tab });

  const openCreate = (key: "post" | "photo" | "live") => {
    if (key === "post") navigation.navigate("CreatePost", {});
    else if (key === "photo") navigation.navigate("CreatePost", { withPhoto: true });
    else navigation.navigate("CreatePost", { prefill: "Going live now!" });
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() },
    ]);
  };

  const MENU_ITEMS: { label: string; icon: string; action: () => void; danger?: boolean }[] = [
    { label: "My Profile", icon: "person-outline", action: () => goTab("Profile") },
    { label: "Stories", icon: "albums-outline", action: () => navigation.navigate("Stories") },
    { label: "Messages", icon: "chatbubble-ellipses-outline", action: () => goTab("Messages") },
    { label: "Notifications", icon: "notifications-outline", action: () => navigation.navigate("Notifications") },
    { label: "Create Post", icon: "create-outline", action: () => navigation.navigate("CreatePost", {}) },
    { label: "Change Password", icon: "key-outline", action: () => navigation.navigate("ChangePassword") },
    { label: "Logout", icon: "log-out-outline", danger: true, action: confirmLogout },
  ];

  const CreateButton = useCallback(
    (props: any) => (
      <TouchableOpacity
        {...props}
        style={styles.createSlot}
        onPress={() => setCreateOpen(true)}
        accessibilityLabel="Create"
      >
        <View style={styles.createShadow}>
          <LinearGradient
            colors={brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.plusButton}
          >
            <Icon name="add" size={32} color={colors.white} />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    ),
    []
  );

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: styles.tabBar,
          headerTitleAlign: "center",
        }}
      >
        <Tab.Screen
          name="Feed"
          component={FeedScreen}
          options={{
            header: () => (
              <TopAppBar
                onMenu={() => setMenuOpen(true)}
                onNotify={() => navigation.navigate("Notifications")}
                onNewPost={() => navigation.navigate("CreatePost", {})}
                unreadCount={dotUnread ? 1 : 0}
              />
            ),
            tabBarLabel: "Home",
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? "home" : "home-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Create"
          component={CreatePlaceholder}
          options={{
            tabBarButton: CreateButton,
            tabBarLabel: "",
          }}
        />
        <Tab.Screen
          name="Messages"
          component={MessagesScreen}
          options={{
            tabBarBadge: chatUnread > 0 ? (chatUnread > 99 ? "99+" : chatUnread) : undefined,
            tabBarBadgeStyle: styles.tabBadge,
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            headerTitle: "My Profile",
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? "person" : "person-outline"} size={24} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
      <CreateMenu visible={createOpen} onClose={() => setCreateOpen(false)} onSelect={openCreate} />
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>TheSocialBook</Text>
            <Text style={styles.menuVersion}>v{Constants.expoConfig?.version ?? "1.2.4"}</Text>
            {MENU_ITEMS.map((m) => (
              <TouchableOpacity
                key={m.label}
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  m.action();
                }}
              >
                <View style={styles.menuIcon}>
                  <Icon name={m.icon as any} size={20} color={m.danger ? colors.danger : colors.primary} />
                </View>
                <Text style={[styles.menuLabel, m.danger && styles.menuDanger]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function RootNavigator() {
  const { user, token, loading } = useAuth();

  useEffect(() => {
    if (!user || !token) return;
    const version = Constants.expoConfig?.version;
    if (!version) return;
    api.reportVersion(token, version).catch(() => {});
  }, [user, token]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.card },
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: "Create Post" }} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: "Post" }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
          <Stack.Screen name="Stories" component={StoriesScreen} options={{ title: "Stories" }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Caveat_700Bold });
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dl, setDl] = useState<DownloadState | null>(null);

  useEffect(() => {
    checkForUpdates(setUpdate);
  }, []);

  const closeUpdate = () => {
    if (dl?.phase === "downloading") return;
    setUpdate(null);
    setDl(null);
  };

  const startUpdate = async () => {
    if (!update) return;
    if (Platform.OS !== "android" || !update.apkUrl) {
      Linking.openURL(RELEASES_PAGE);
      return;
    }
    setDl({ phase: "downloading", progress: 0 });
    const dest = new File(Paths.cache, "thesocialbook-update.apk");
    try {
      if (dest.exists) dest.delete();
      const task = File.createDownloadTask(update.apkUrl, dest, {
        onProgress: ({ bytesWritten, totalBytes }) => {
          if (totalBytes > 0) {
            setDl({ phase: "downloading", progress: Math.min(1, bytesWritten / totalBytes) });
          }
        },
      });
      const file = await task.downloadAsync();
      if (!file) throw new Error("Download failed");
      if (update.apkSize && file.size < update.apkSize * 0.98) {
        throw new Error("Download incomplete - try again");
      }
      setDl({ phase: "installing", progress: 1 });
      try {
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: file.contentUri,
          type: "application/vnd.android.package-archive",
          flags: 1,
        });
      } catch {
        setDl({
          phase: "error",
          progress: 0,
          message:
            "Your phone blocked the automatic install. Tap \"Allow installs\" to enable it, or download the APK manually.",
        });
        return;
      }
      setUpdate(null);
      setDl(null);
    } catch (e: any) {
      setDl({
        phase: "error",
        progress: 0,
        message: e?.message && !String(e.message).includes("[") ? e.message : "Could not download the update. Check your connection and try again.",
      });
    }
  };

  const openInstallSettings = () => {
    IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
      data: "package:com.thesocialbook.app",
    }).catch(() => Linking.openURL(RELEASES_PAGE));
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
        <PushTapNavigator />
      </AuthProvider>
      {update && (
        <Modal visible transparent animationType="fade" onRequestClose={closeUpdate}>
          <View style={styles.updateOverlay}>
            <View style={styles.updateCard}>
              <LinearGradient
                colors={brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.updateHeader}
              >
                <View style={styles.updateIconWrap}>
                  <Icon name="cloud-download-outline" size={30} color={colors.white} />
                </View>
                <Text style={styles.updateTitle}>Update Available</Text>
                <View style={styles.updatePill}>
                  <Text style={styles.updatePillText}>v{update.version}</Text>
                </View>
              </LinearGradient>

              {dl?.phase === "downloading" ? (
                <View style={styles.updateBody}>
                  <Text style={styles.updateStatus}>Downloading update…</Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.max(4, Math.round(dl.progress * 100))}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.updatePct}>{Math.round(dl.progress * 100)}%</Text>
                </View>
              ) : dl?.phase === "installing" ? (
                <View style={styles.updateBody}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.updateStatus}>Opening installer…</Text>
                </View>
              ) : dl?.phase === "error" ? (
                <View style={styles.updateBody}>
                  <Text style={styles.updateError}>{dl.message}</Text>
                  <View style={styles.updateRow}>
                    <TouchableOpacity
                      style={[styles.updateBtn, styles.updateBtnGhost]}
                      onPress={openInstallSettings}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.updateBtnGhostText}>Allow installs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.updateBtn, styles.updateBtnGhost]}
                      onPress={() => Linking.openURL(RELEASES_PAGE)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.updateBtnGhostText}>Download APK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.updateBtn, styles.updateBtnPrimary]}
                      onPress={startUpdate}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.updateBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <ScrollView style={styles.updateNotes} showsVerticalScrollIndicator={false}>
                    <Text style={styles.updateNotesText}>
                      {update.notes.trim()
                        ? update.notes.trim()
                        : `A new version of TheSocialBook is available. Update now for the best experience.`}
                    </Text>
                  </ScrollView>
                  <View style={styles.updateRow}>
                    <TouchableOpacity
                      style={[styles.updateBtn, styles.updateBtnGhost]}
                      onPress={closeUpdate}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.updateBtnGhostText}>Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.updateBtn, styles.updateBtnPrimary]}
                      onPress={startUpdate}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.updateBtnText}>
                        {Platform.OS === "android" ? "Update Now" : "Go to Release"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tabBadge: {
    backgroundColor: colors.primary,
    fontSize: 10,
  },
  createSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    top: -16,
  },
  createShadow: {
    shadowColor: "#172033",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderRadius: 30,
  },
  plusButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(23,32,51,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
    fontFamily: "Caveat_700Bold",
  },
  menuVersion: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  menuDanger: {
    color: colors.danger,
  },
  updateOverlay: {
    flex: 1,
    backgroundColor: "rgba(23,32,51,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  updateCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#172033",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  updateHeader: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  updateIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  updateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.white,
  },
  updatePill: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  updatePillText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  updateBody: {
    alignItems: "center",
    padding: 22,
    gap: 12,
    minHeight: 110,
    justifyContent: "center",
  },
  updateStatus: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  updateError: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger,
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  updatePct: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  updateNotes: {
    maxHeight: 150,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  updateNotesText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  updateRow: {
    flexDirection: "row",
    gap: 12,
    padding: 22,
  },
  updateBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  updateBtnGhost: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  updateBtnGhostText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  updateBtnPrimary: {
    backgroundColor: colors.primary,
  },
  updateBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
});