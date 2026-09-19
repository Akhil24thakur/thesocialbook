import React, { useMemo, useState } from "react";
import { Alert, Linking, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import Icon from "./Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function ShareSheet({
  visible,
  onClose,
  postId,
  content,
}: {
  visible: boolean;
  onClose: () => void;
  postId: number;
  content: string;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [copied, setCopied] = useState(false);
  const [sharingToStory, setSharingToStory] = useState(false);
  const { token } = useAuth();

  const link = `https://akhil24thakur.github.io/thesocialbook/post/?id=${postId}`;
  const message = `${content || "Check out this post"}\n${link}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 900);
  };

  const shareSocial = () => {
    onClose();
    navigation.navigate("CreatePost", { prefill: `Check out this post: ${link}` });
  };

  const shareToStory = async () => {
    if (!token || sharingToStory) return;
    setSharingToStory(true);
    try {
      await api.shareToStory(token, postId);
      onClose();
      Alert.alert("Shared!", "Post has been added to your story.");
    } catch (e: any) {
      Alert.alert("Failed", e?.message ?? "Could not share to story.");
    } finally {
      setSharingToStory(false);
    }
  };

  const openWhatsApp = () => { onClose(); Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => {}); };
  const openMessages = () => { onClose(); Linking.openURL(`sms:?body=${encodeURIComponent(message)}`).catch(() => {}); };
  const openInstagram = () => { onClose(); Linking.openURL("https://www.instagram.com/").catch(() => {}); };
  const more = () => { onClose(); Share.share({ message }).catch(() => {}); };

  const OPTIONS = [
    { label: copied ? "Link copied" : "Copy Link", icon: copied ? "checkmark" : "link-outline", color: colors.text, action: copyLink },
    { label: sharingToStory ? "Sharing..." : "Share to Story", icon: "images-outline", color: colors.text, action: shareToStory },
    { label: "Share to SocialBook", icon: "paper-plane-outline", color: colors.text, action: shareSocial },
    { label: "WhatsApp", icon: "logo-whatsapp", color: colors.green, action: openWhatsApp },
    { label: "Instagram", icon: "logo-instagram", color: colors.pink, action: openInstagram },
    { label: "Messages", icon: "chatbubble-ellipses-outline", color: colors.text, action: openMessages },
    { label: "More", icon: "ellipsis-horizontal-outline", color: colors.text, action: more },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <BlurView intensity={isDark ? 50 : 70} tint={isDark ? "dark" : "light"} style={{ flex: 1 }}>
            <View style={styles.content}>
              <View style={styles.handle} />
              <Text style={styles.title}>Share to</Text>
              {OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.label}
                  style={styles.item}
                  onPress={o.action}
                  accessibilityLabel={o.label}
                >
                  <View style={styles.iconCircle}>
                    <Icon name={o.icon as any} size={20} color={o.color} />
                  </View>
                  <Text style={styles.itemLabel}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    overflow: "hidden",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
});
