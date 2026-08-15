import React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { colors, formatCount } from "../theme";
import type { Post } from "../types";

export default function ImageLightbox({
  post,
  onToggleLike,
  onComment,
  onAuthorPress,
  onClose,
}: {
  post: Post | null;
  onToggleLike: (post: Post) => void;
  onComment: (post: Post) => void;
  onAuthorPress: (post: Post) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={post !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {post && (
          <>
            <Image
              source={{ uri: post.imageUrl! }}
              style={styles.image}
              resizeMode="contain"
            />

            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => onAuthorPress(post)}
                accessibilityLabel={`${post.author.name}'s profile`}
              >
                <Avatar name={post.author.name} size={38} imageUrl={post.author.avatarUrl} />
                <Text style={styles.name} numberOfLines={1}>
                  {post.author.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel="Close image"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={26} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
              <Pressable
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                onPress={() => onToggleLike(post)}
                accessibilityRole="button"
                accessibilityLabel={post.likedByMe ? "Unlike" : "Like"}
              >
                <Icon
                  name={post.likedByMe ? "heart" : "heart-outline"}
                  size={24}
                  color={post.likedByMe ? colors.primary : colors.white}
                />
                <Text style={styles.actionText}>
                  {formatCount(post.likeCount)} {post.likeCount === 1 ? "like" : "likes"}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                onPress={() => onComment(post)}
                accessibilityRole="button"
                accessibilityLabel="Comment"
              >
                <Icon name="chatbubble-outline" size={22} color={colors.white} />
                <Text style={styles.actionText}>
                  {formatCount(post.commentCount)} {post.commentCount === 1 ? "comment" : "comments"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },
  image: {
    flex: 1,
    width: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  name: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  closeBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  actionPressed: {
    opacity: 0.55,
  },
  actionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});