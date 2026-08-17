import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Avatar from "./Avatar";
import Icon from "./Icon";
import ImageLightbox from "./ImageLightbox";
import ShareSheet from "./ShareSheet";
import ConfirmDialog from "./ConfirmDialog";
import MenuSheet from "./MenuSheet";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { colors, formatCount, formatTime } from "../theme";
import type { Post } from "../types";

interface Props {
  post: Post;
  onToggleLike: (post: Post) => Promise<void> | void;
  onChanged: () => void;
}

const CARD_PAD = 16;
const IMG_MAX_H = 420;
const IMG_MIN_H = 190;

function PostCard({ post, onToggleLike, onChanged }: Props) {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const [imgH, setImgH] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const onImageLoad = (e: any) => {
    const w = e.nativeEvent?.width ?? e.nativeEvent?.source?.width;
    const h = e.nativeEvent?.height ?? e.nativeEvent?.source?.height;
    if (!w || !h) return;
    const containerW = Dimensions.get("window").width - 32 - CARD_PAD * 2;
    const ratio = h / w;
    setImgH(Math.max(IMG_MIN_H, Math.min(IMG_MAX_H, containerW * ratio)));
  };

  const postMenu = () => {
    setMenuOpen(true);
  };

  const confirmDelete = () => {
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      await api.deletePost(token, post.id);
      setDeleteOpen(false);
      onChanged();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not delete post");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const onShare = async () => {
    setShareOpen(true);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorBtn}
          onPress={() => navigation.navigate("UserProfile", { userId: post.author.id })}
          accessibilityLabel={`${post.author.name}'s profile`}
        >
          <Avatar
            name={post.author.name}
            size={44}
            imageUrl={post.author.avatarUrl}
            gradient={post.author.id === user?.id}
          />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {post.author.name}
            </Text>
            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatTime(post.createdAt)}</Text>
              <Icon name="globe-outline" size={12} color={colors.textSecondary} />
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={postMenu}
          accessibilityLabel="Post options"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Icon name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.content}>{post.content}</Text>
      {!!post.imageUrl && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setLightbox(true)}
          accessibilityLabel="View image fullscreen"
        >
          <Image
            source={{ uri: post.imageUrl }}
            style={[styles.image, imgH ? { height: imgH } : null]}
            resizeMode="cover"
            onLoad={onImageLoad}
          />
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          onPress={() => onToggleLike(post)}
          android_ripple={{ color: "#00000012", borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={post.likedByMe ? "Unlike" : "Like"}
          accessibilityState={{ selected: post.likedByMe }}
        >
          <Icon
            name={post.likedByMe ? "heart" : "heart-outline"}
            size={18}
            color={post.likedByMe ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.actionText, post.likedByMe && styles.actionTextActive]}>
            {post.likedByMe ? "Liked" : "Like"}
            {post.likeCount > 0 ? ` · ${formatCount(post.likeCount)}` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          onPress={() => navigation.navigate("PostDetail", { postId: post.id, post })}
          android_ripple={{ color: "#00000012", borderless: false }}
          accessibilityLabel="Comment"
        >
          <Icon name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.actionText}>
            Comment{post.commentCount > 0 ? ` · ${formatCount(post.commentCount)}` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          onPress={onShare}
          android_ripple={{ color: "#00000012", borderless: false }}
          accessibilityLabel="Share"
        >
          <Icon name="paper-plane-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
      </View>

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={post.id}
        content={post.content}
      />

      <ConfirmDialog
        visible={deleteOpen}
        title="Delete post?"
        message="This post and everything linked to it will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        icon="trash-outline"
        destructive
        loading={deleting}
        onConfirm={doDelete}
        onClose={() => setDeleteOpen(false)}
      />

      <MenuSheet
        visible={menuOpen}
        title={post.author.name}
        options={
          user?.id === post.author.id
            ? [{ label: "Delete post", icon: "trash-outline", danger: true, onPress: confirmDelete }]
            : [{ label: "Report", icon: "flag-outline", danger: true, onPress: () => setReportOpen(true) }]
        }
        onClose={() => setMenuOpen(false)}
      />

      <ConfirmDialog
        visible={reportOpen}
        title="Report post?"
        message="We'll review this post and take action if it breaks our community guidelines."
        confirmLabel="Report"
        icon="flag-outline"
        onConfirm={() => {
          setReportOpen(false);
          Alert.alert("Thanks", "We'll review this post.");
        }}
        onClose={() => setReportOpen(false)}
      />

      <ImageLightbox
        post={lightbox ? post : null}
        onToggleLike={(p) => onToggleLike(p)}
        onComment={(p) => navigation.navigate("PostDetail", { postId: p.id, post: p })}
        onAuthorPress={(p) => navigation.navigate("UserProfile", { userId: p.author.id })}
        onClose={() => setLightbox(false)}
      />
    </View>
  );
}

export default React.memo(PostCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    marginBottom: 14,
    paddingHorizontal: CARD_PAD,
    paddingTop: 14,
    shadowColor: "#172033",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  authorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  name: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  time: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    marginBottom: 12,
  },
  image: {
    width: "100%",
    borderRadius: 21,
    backgroundColor: colors.border,
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 42,
    borderRadius: 10,
  },
  actionPressed: {
    opacity: 0.55,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  actionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});