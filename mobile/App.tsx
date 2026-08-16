import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Caveat_700Bold } from "@expo-google-fonts/caveat";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
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
import NotificationsScreen from "./src/screens/NotificationsScreen";
import StoriesScreen from "./src/screens/StoriesScreen";
import { brandGradient, colors } from "./src/theme";

const Stack = createNativeStackNavigator();

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

async function checkForUpdates() {
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
      Alert.alert(
        "Update Available",
        `A new version of TheSocialBook is available (v${latest}). Update now for the best experience.`,
        [
          { text: "Later", style: "cancel" },
          { text: "Update", onPress: () => Linking.openURL(RELEASES_PAGE) },
        ]
      );
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
  const navigation = useNavigation<any>();
  const { logout } = useAuth();

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
  const { user, loading } = useAuth();

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
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Caveat_700Bold });

  useEffect(() => {
    checkForUpdates();
  }, []);

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
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </AuthProvider>
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
});