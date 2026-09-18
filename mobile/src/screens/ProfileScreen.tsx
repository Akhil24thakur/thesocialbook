import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { api, uploadImage } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import PostCard from "../components/PostCard";
import { isOnline, type Colors } from "../theme";
import { useTheme } from "../theme-context";
import type { Post } from "../types";

export default function ProfileScreen({ active }: { active: boolean }) {
  const navigation = useNavigation<any>();
  const { token, user, setUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [counts, setCounts] = useState<{ followerCount: number; followingCount: number }>({
    followerCount: 0,
    followingCount: 0,
  });

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const load = useCallback(
    async (refresh = false) => {
      if (!token || !user) return;
      refresh ? setRefreshing(true) : setLoading(true);
      try {
        const [res, u] = await Promise.all([api.userPosts(token, user.id), api.user(token, user.id)]);
        setPosts(res.posts);
        setCounts({
          followerCount: u.user.followerCount ?? 0,
          followingCount: u.user.followingCount ?? 0,
        });
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, user]
  );

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const toggleLike = useCallback(
    async (post: Post) => {
      if (!token) return;
      const liked = !post.likedByMe;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }
            : p
        )
      );
      try {
        await api.toggleLike(token, post.id);
      } catch (e: any) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, likedByMe: !liked, likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)) }
              : p
          )
        );
        Alert.alert("Error", e.message ?? "Could not like post");
      }
    },
    [token]
  );

  const setAvatar = async (uri: string) => {
    if (!token || !user) return;
    setPhotoOpen(false);
    setUploading(true);
    try {
      const url = await uploadImage(token, uri);
      const res = await api.updateMe(token, { avatarUrl: url });
      setUser({ ...user, avatarUrl: res.user.avatarUrl });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not update profile photo");
    } finally {
      setUploading(false);
    }
  };

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to take a profile photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const pickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to choose a profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const removeAvatar = async () => {
    if (!token || !user) return;
    setPhotoOpen(false);
    setUploading(true);
    try {
      const res = await api.updateMe(token, { avatarUrl: null });
      setUser({ ...user, avatarUrl: res.user.avatarUrl });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not remove profile photo");
    } finally {
      setUploading(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} onToggleLike={toggleLike} onChanged={() => load()} />,
    [toggleLike, load]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <TouchableOpacity
            onPress={() => setPhotoOpen(true)}
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatarWrap}>
              <Avatar
                name={user?.name ?? "?"}
                size={84}
                imageUrl={user?.avatarUrl}
                online={isOnline(user?.lastSeenAt)}
              />
              {uploading ? (
                <View style={styles.uploadingBadge}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              ) : (
                <View style={styles.plusBadge}>
                  <Icon name="add" size={18} color={colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user?.name}</Text>
              {!!user?.isVerified && (
                <Icon name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </View>
            {!!user?.username && <Text style={styles.username}>@{user.username}</Text>}
            {!!user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{posts.length}</Text>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Posts</Text>
          </View>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate("FollowersFollowing", { userId: user!.id, userName: user!.name, mode: "followers" })}
          >
            <Text style={styles.statNum}>{counts.followerCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate("FollowersFollowing", { userId: user!.id, userName: user!.name, mode: "following" })}
          >
            <Text style={styles.statNum}>{counts.followingCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Following</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.photoBtn]}
            onPress={() => setPhotoOpen(true)}
            accessibilityLabel="Change profile photo"
          >
            <Icon name="camera-outline" size={18} color={colors.text} />
            <Text style={styles.photoBtnText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPhotoOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Change profile photo</Text>
            <TouchableOpacity
              style={styles.option}
              onPress={pickCamera}
              accessibilityLabel="Take a photo"
            >
              <View style={[styles.optionIcon, { backgroundColor: `${colors.pink}1A` }]}>
                <Icon name="camera-outline" size={20} color={colors.pink} />
              </View>
              <Text style={styles.optionLabel}>Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={pickGallery}
              accessibilityLabel="Choose from gallery"
            >
              <View style={[styles.optionIcon, { backgroundColor: `${colors.green}1A` }]}>
                <Icon name="image-outline" size={20} color={colors.green} />
              </View>
              <Text style={styles.optionLabel}>Choose from gallery</Text>
            </TouchableOpacity>
            {!!user?.avatarUrl && (
              <TouchableOpacity style={styles.option} onPress={removeAvatar}>
                <View style={[styles.optionIcon, { backgroundColor: `${colors.danger}1A` }]}>
                  <Icon name="trash-outline" size={20} color={colors.danger} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.danger }]}>Remove photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.list}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={11}
        initialNumToRender={5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't posted anything yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate("CreatePost")}>
              <Text style={styles.emptyLink}>Write your first post</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 86,
    height: 86,
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  username: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statNum: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    flexShrink: 1,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    backgroundColor: colors.accent,
  },
  editBtnText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  photoBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.primaryLight,
  },
  photoBtnText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  list: {
    paddingBottom: 20,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  emptyLink: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
    color: colors.accent,
  },
});