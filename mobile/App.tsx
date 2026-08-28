import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Caveat_700Bold } from "@expo-google-fonts/caveat";
import { NavigationContainer, createNavigationContainerRef, useNavigation, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PagerView, { type PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { api } from "./src/api";
import { API_URL } from "./src/config";
import CreateMenu from "./src/components/CreateMenu";
import Icon from "./src/components/Icon";
import TopAppBar from "./src/components/home/TopAppBar";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import FeedScreen from "./src/screens/FeedScreen";
import ReelsScreen from "./src/screens/ReelsScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import SearchScreen from "./src/screens/SearchScreen";
import PostDetailScreen from "./src/screens/PostDetailScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import UserProfileScreen from "./src/screens/UserProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import FollowersFollowingScreen from "./src/screens/FollowersFollowingScreen";
import Constants from "expo-constants";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import MessagesScreen from "./src/screens/MessagesScreen";
import ChatScreen from "./src/screens/ChatScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import StoriesScreen from "./src/screens/StoriesScreen";
import LiveStreamScreen from "./src/screens/LiveStreamScreen";
import { brandGradient, darkColors, lightColors, type Colors } from "./src/theme";
import { ThemeProvider, useTheme } from "./src/theme-context";
import { setPendingPush, usePendingPush } from "./src/pushBadge";
import { loadOrCreateKeyPair } from "./src/crypto";
import { connectWs, onWsEvent } from "./src/ws";
import { setupCrashLog } from "./src/crashLog";

setupCrashLog();

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

const LOGO_MARK = require("./assets/brand/logo-mark.png");

const lightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.primary,
    background: lightColors.background,
    card: lightColors.card,
    text: lightColors.text,
    border: lightColors.border,
    notification: lightColors.danger,
  },
};

const darkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.card,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.danger,
  },
};

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

const NotificationReply: any = (() => {
  try {
    return require("./modules/notification-reply");
  } catch {
    return null;
  }
})();

function setReplyApiUrl() {
  try {
    void NotificationReply?.setApiUrl(API_URL);
  } catch {
    // Native module unavailable - ignore
  }
}
setReplyApiUrl();

function PushTapNavigator() {
  const { user } = useAuth();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data ?? {};
      if (data.type === "update") {
        void Linking.openURL(RELEASES_PAGE);
        return;
      }
      if (!navigationRef.isReady() || !user) {
        setPendingPush(true);
        return;
      }
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
  }, [user]);
  useEffect(() => {
    if (!user || !navigationRef.isReady()) return;
    let cancelled = false;
    (async () => {
      try {
        const initial = await NotificationReply?.getInitialNotification();
        if (cancelled || !initial) return;
        if (initial.url) {
          void Linking.openURL(initial.url);
        } else if (initial.conversationId) {
          navigationRef.navigate("Chat", { conversationId: initial.conversationId });
        } else if (initial.postId) {
          navigationRef.navigate("PostDetail", { postId: initial.postId });
        }
      } catch {
        // Native module unavailable - ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
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
  channel?: "stable" | "beta";
  migrationDialog?: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isMigration: boolean;
  };
}

interface DownloadState {
  phase: "downloading" | "installing" | "error";
  progress: number;
  message?: string;
}

async function checkForUpdates(
  setUpdate: (u: UpdateInfo | null) => void,
  token: string | null = null
) {
  try {
    const current = Constants.expoConfig?.version;
    if (!current) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_URL}/api/update-info`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const upd = data?.update;
        const currentChannel = upd?.channel ?? "stable"; // default to stable
        const isDebugBaseline = current === "3.2.11";
        const isNewRelease = upd && typeof upd.version === "string" && isNewerVersion(upd.version, current);
        
        // Channel gating: users can only update within their channel
        // Beta users can see beta and stable releases
        // Stable users only see stable releases (unless forced migration)
        const isBetaUser = currentChannel === "beta";
        
        // Mandatory migration check: v3.2.11 (debug) -> newer release-signed
        const isReleaseMigration = isDebugBaseline && isNewRelease && upd.channel === "release";
        
        // If on debug baseline (v3.2.11) and new version is release-signed, show migration dialog
        if (isDebugBaseline && isReleaseMigration) {
          setUpdate({
            version: upd.version,
            notes: String(upd.notes ?? ""),
            apkUrl: upd.apkUrl ?? null,
            apkSize: typeof upd.apkSize === "number" ? upd.apkSize : undefined,
            migrationDialog: {
              title: "Migration Required",
              message: "This is a one-time migration from debug-signed to release-signed version.\n\n1. Uninstall \"SocialBook\" from your phone settings.\n2. Restart your phone.\n3. Tap \"Download Latest Version\" below to install v4.0.0.\n4. Launch the new app - future updates will work automatically.",
              confirmText: "Download Latest Version",
              cancelText: "Later",
              isMigration: true,
            },
          });
          return;
        }
        
        // Channel gating logic
        // Beta users can update to any newer version (beta or stable)
        // Stable users can only update to stable versions (unless migration)
        const stableUserCanUpdate = !isNewRelease || currentChannel === "stable";
        const betaUserCanUpdate = isBetaUser || currentChannel === "stable";
        
        // Normal update check with channel gating
        if (upd && typeof upd.version === "string" && isNewerVersion(upd.version, current)) {
          // Allow update if:
          // - Beta user, OR
          // - Stable user and new version is also stable (not beta)
          if (isBetaUser || currentChannel === "stable") {
            // If stable user trying to update to beta, show special message
            if (!isBetaUser && currentChannel === "stable" && upd.channel === "beta") {
              setUpdate({
                version: upd.version,
                notes: String(upd.notes ?? ""),
                apkUrl: upd.apkUrl ?? null,
                apkSize: typeof upd.apkSize === "number" ? upd.apkSize : undefined,
                // Show beta update with warning
                migrationDialog: {
                  title: "Beta Update Available",
                  message: "This is a beta version. Beta builds may contain bugs and are for testing purposes only.\n\nChangelog: " + (upd.notes ?? "New beta features and improvements"),
                  confirmText: "Update to Beta",
                  cancelText: "Stay on Stable",
                  isMigration: false,
                  isBeta: true,
                },
              });
              return;
            }
            setUpdate({
              version: upd.version,
              notes: String(upd.notes ?? ""),
              apkUrl: upd.apkUrl ?? null,
              apkSize: typeof upd.apkSize === "number" ? upd.apkSize : undefined,
            });
            return;
          }
        }
        return;
      }
    } catch {
      // Fall back to GitHub below
    } finally {
      clearTimeout(timer);
    }
    const ghController = new AbortController();
    const ghTimer = setTimeout(() => ghController.abort(), 15000);
    try {
      const res = await fetch(RELEASES_URL, { signal: ghController.signal });
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
      clearTimeout(ghTimer);
    }
  } catch {
    // Silent - update check is best effort
  }
}
function SectionHeader({ title, onMenu }: { title: string; onMenu?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
      <LinearGradient colors={[colors.primary, colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <View
        style={{
          paddingTop: insets.top + 2,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
        }}
      >
        {onMenu ? (
          <TouchableOpacity
            onPress={onMenu}
            style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Menu"
          >
            <Icon name="menu" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.white }}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
  );
}

function HomeTabs() {
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const pendingPush = usePendingPush();
  const navigation = useNavigation<any>();
  const { logout, token } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const [restartSignal, setRestartSignal] = useState(0);
  const [feedRefresh, setFeedRefresh] = useState(0);
  const lastHomeTapRef = useRef(0);
  const lastBackPressRef = useRef(0);

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
    const wsSub = onWsEvent("message", null, refreshUnread);
    const readSub = onWsEvent("read", null, refreshUnread);
    return () => {
      unsub();
      clearInterval(interval);
      wsSub();
      readSub();
    };
  }, [navigation, refreshUnread]);

  const dotUnread = pendingPush || unreadCount > 0;

  const goTo = useCallback((index: number) => {
    if (pageRef.current === index) return;
    pagerRef.current?.setPage(index);
  }, []);

  const onPageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    pageRef.current = e.nativeEvent.position;
    setPage(e.nativeEvent.position);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (menuOpen || themeOpen || createOpen) return false;
      if (!navigation.isFocused()) return false;
      if (pageRef.current !== 0) {
        pagerRef.current?.setPage(0);
        return true;
      }
      const now = Date.now();
      if (now - lastBackPressRef.current <= 2000) return false;
      lastBackPressRef.current = now;
      setFeedRefresh((s) => s + 1);
      return true;
    });
    return () => sub.remove();
  }, [navigation, menuOpen, themeOpen, createOpen]);

  const onTabPress = useCallback(
    (index: number) => {
      const now = Date.now();
      if (index === 0 && pageRef.current === 0) {
        if (now - lastHomeTapRef.current <= 350) {
          lastHomeTapRef.current = 0;
          setFeedRefresh((s) => s + 1);
        } else {
          lastHomeTapRef.current = now;
        }
        return;
      }
      if (index === 1 && pageRef.current === 1) {
        setRestartSignal((s) => s + 1);
        return;
      }
      goTo(index);
    },
    [goTo]
  );

  const openCreate = (key: "post" | "photo" | "live") => {
    if (key === "post") navigation.navigate("CreatePost", {});
    else if (key === "photo") navigation.navigate("CreatePost", { withPhoto: true });
    else navigation.navigate("Live", {});
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() },
    ]);
  };

  const MENU_ITEMS: { label: string; icon: string; action: () => void; danger?: boolean }[] = [
    { label: "Theme", icon: "contrast-outline", action: () => setThemeOpen(true) },
    { label: "Change Password", icon: "key-outline", action: () => navigation.navigate("ChangePassword") },
    { label: "Logout", icon: "log-out-outline", danger: true, action: confirmLogout },
  ];

  const tabItems = [
    { index: 0, label: "Home", icon: "home", iconOutline: "home-outline", badge: 0 },
    { index: 1, label: "Reels", icon: "play-circle", iconOutline: "play-circle-outline", badge: 0 },
    { index: 2, label: "Messages", icon: "chatbubble-ellipses", iconOutline: "chatbubble-ellipses-outline", badge: chatUnread },
    { index: 3, label: "Search", icon: "search", iconOutline: "search-outline", badge: 0 },
    { index: 4, label: "Profile", icon: "person", iconOutline: "person-outline", badge: 0 },
  ];

  const renderTab = (t: (typeof tabItems)[number]) => {
    const active = page === t.index;
    return (
      <TouchableOpacity
        key={t.index}
        style={[styles.tabItem, active && styles.tabItemActive]}
        onPress={() => onTabPress(t.index)}
        accessibilityLabel={t.label}
        accessibilityState={{ selected: active }}
      >
        {active ? (
          <LinearGradient colors={brandGradient(colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabIconActive}>
            <Icon name={t.icon as any} size={22} color={colors.white} />
          </LinearGradient>
        ) : (
          <Icon name={t.iconOutline as any} size={22} color={colors.textSecondary} />
        )}
        {t.badge > 0 && (
          <View style={[styles.tabBadgeDot, { backgroundColor: colors.danger }]}>
            <Text style={styles.tabBadgeText}>{t.badge > 99 ? "99+" : t.badge}</Text>
          </View>
        )}
        <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? "700" : "600" }]}>{t.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={styles.pagerWrap}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={onPageSelected}
          overdrag={false}
        >
          <View style={styles.page} key="feed" collapsable={false}>
            <TopAppBar
              onNotify={() => navigation.navigate("Notifications")}
              onNewPost={() => setCreateOpen(true)}
              unreadCount={unreadCount}
            />
            <FeedScreen active={page === 0} refreshSignal={feedRefresh} />
          </View>
          <View style={styles.page} key="reels" collapsable={false}>
            <ReelsScreen active={page === 1} restartSignal={restartSignal} />
          </View>
          <View style={styles.page} key="messages" collapsable={false}>
            <SectionHeader title="Messages" />
            <MessagesScreen active={page === 2} />
          </View>
          <View style={styles.page} key="search" collapsable={false}>
            <SearchScreen />
          </View>
          <View style={styles.page} key="profile" collapsable={false}>
            <SectionHeader title="My Profile" onMenu={() => setMenuOpen(true)} />
            <ProfileScreen active={page === 4} />
          </View>
        </PagerView>
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
{renderTab(tabItems[0])}
          {renderTab(tabItems[1])}
          {renderTab(tabItems[2])}
          {renderTab(tabItems[3])}
          {renderTab(tabItems[4])}
        </View>
      </View>
      <CreateMenu visible={createOpen} onClose={() => setCreateOpen(false)} onSelect={openCreate} />
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Image source={LOGO_MARK} style={styles.menuLogo} resizeMode="contain" />
            <Text style={styles.menuVersion}>v{Constants.expoConfig?.version ?? "2.0.25"}</Text>
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
      <Modal visible={themeOpen} transparent animationType="fade" onRequestClose={() => setThemeOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setThemeOpen(false)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Theme</Text>
            <Text style={styles.menuPush}>Choose how SocialBook looks</Text>
            {(
              [
                { key: "system", label: "System Theme", desc: "Follows your phone (Default)", icon: "phone-portrait-outline" },
                { key: "dark", label: "Dark", desc: "Always use dark mode", icon: "moon-outline" },
                { key: "light", label: "White", desc: "Always use light mode", icon: "sunny-outline" },
              ] as const
            ).map((t) => (
              <TouchableOpacity
                key={t.key}
                style={styles.menuItem}
                onPress={() => {
                  setMode(t.key);
                  setThemeOpen(false);
                }}
              >
                <View style={styles.menuIcon}>
                  <Icon name={t.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, mode === t.key && styles.themeOptionActive]}>{t.label}</Text>
                  <Text style={styles.menuPush}>{t.desc}</Text>
                </View>
                {mode === t.key && <Icon name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function RootNavigator({ onCheckUpdate }: { onCheckUpdate?: (token: string | null) => void }) {
  const { user, token, loading } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!user || !token) return;
    const version = Constants.expoConfig?.version;
    if (version) api.reportVersion(token, version).catch(() => {});
    loadOrCreateKeyPair()
      .then((kp) => api.registerPublicKey(token, kp.publicKey).catch(() => {}))
      .catch(() => {});
    connectWs(token);
    onCheckUpdate?.(token);
    return () => {
      connectWs(null);
    };
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
          <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: "Post" }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
          <Stack.Screen name="FollowersFollowing" component={FollowersFollowingScreen} options={{ title: "Followers" }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
          <Stack.Screen name="Stories" component={StoriesScreen} options={{ title: "Stories" }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
          <Stack.Screen name="Live" component={LiveStreamScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

function DeepLinkHandler() {
  const { token, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleDeepLink = (url: string) => {
      if (!navigationRef.isReady() || !user) return;
      try {
        const u = new URL(url);
        const hosts = ["thesocialbook.app", "www.thesocialbook.app", "web-nu-three-39.vercel.app"];
        if (!hosts.includes(u.hostname)) return;
        // Format 1: /p/123  ·  Format 2: /post/?id=123
        const pathMatch = u.pathname.match(/\/p\/(\d+)/);
        const postId = pathMatch?.[1] ?? u.searchParams.get("id");
        if (postId && !isNaN(Number(postId))) {
          navigationRef.navigate("PostDetail", { postId: Number(postId) });
        }
      } catch {}
    };

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle subsequent URLs
    const sub = Linking.addEventListener("url", ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [user]);

  return null;
}

function AppContent() {
  const [fontsLoaded] = useFonts({ Caveat_700Bold });
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dl, setDl] = useState<DownloadState | null>(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const handleMigrationDownload = () => {
    const apkUrl = update?.migrationDialog?.isMigration
      ? "https://github.com/Akhil24thakur/thesocialbook/releases/download/v3.2.12/app-release.apk"
      : update?.apkUrl;
    if (apkUrl) {
      Linking.openURL(apkUrl).catch(() => {
        Alert.alert("Error", "Could not open the download link. Please try again.");
      });
    }
    closeUpdate();
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef} theme={isDark ? darkNavTheme : lightNavTheme}>
          <RootNavigator onCheckUpdate={(t) => checkForUpdates(setUpdate, t)} />
        </NavigationContainer>
        <StatusBar style={isDark ? "light" : "dark"} />
        <PushTapNavigator />
        <DeepLinkHandler />
      </AuthProvider>
        {update && update.migrationDialog ? (
        <Modal visible transparent animationType="fade" onRequestClose={closeUpdate}>
          <View style={styles.updateOverlay}>
            <View style={styles.updateCard}>
              <LinearGradient
                colors={brandGradient(colors)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.updateHeader}
              >
                <View style={styles.updateIconWrap}>
                  <Icon name="warning" size={30} color={colors.amber} />
                </View>
                <Text style={styles.updateTitle}>{update.migrationDialog.title}</Text>
                <View style={styles.updatePill}>
                  <Text style={styles.updatePillText}>v{update.version}</Text>
                </View>
              </LinearGradient>

              <View style={styles.updateBody}>
                <Text style={styles.updateStatus}>{update.migrationDialog.message}</Text>
              </View>

              <View style={styles.updateRow}>
                <TouchableOpacity
                  style={[styles.updateBtn, styles.updateBtnPrimary]}
                  onPress={handleMigrationDownload}
                  activeOpacity={0.85}
                >
                  <Text style={styles.updateBtnText}>{update.migrationDialog.confirmText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.updateBtn, styles.updateBtnGhost]}
                  onPress={closeUpdate}
                  activeOpacity={0.7}
                >
                  <Text style={styles.updateBtnGhostText}>{update.migrationDialog.cancelText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : update && (
        <Modal visible transparent animationType="fade" onRequestClose={closeUpdate}>
          <View style={styles.updateOverlay}>
            <View style={styles.updateCard}>
              <LinearGradient
                colors={brandGradient(colors)}
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
                        : `A new version of SocialBook is available. Update now for the best experience.`}
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
      </KeyboardProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 0,
    shadowColor: "#172033",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  tabItemActive: {
    gap: 3,
  },
  tabIconActive: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeDot: {
    position: "absolute",
    top: -4,
    right: -18,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "700",
  },
  pagerWrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  menuLogo: {
    width: 190,
    height: 48,
    marginBottom: 2,
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
    marginBottom: 4,
  },
  menuPush: {
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
  themeOptionActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});