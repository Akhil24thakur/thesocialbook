import React, { useMemo, useState } from "react";
import { Linking, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import Icon from "./Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [copied, setCopied] = useState(false);

  const link = `https://thesocialbook.app/p/${postId}`;
  const message = `${content || "Check out this post"}\n${link} · SocialBook`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 900);
  };

  const shareSocial = () => {
    onClose();
    navigation.navigate("CreatePost", { prefill: `Check out this post: ${link}` });
  };

  const openWhatsApp = () => {
    onClose();
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => {});
  };

  const openMessages = () => {
    onClose();
    Linking.openURL(`sms:?body=${encodeURIComponent(message)}`).catch(() => {});
  };

  const openInstagram = () => {
    onClose();
    Linking.openURL("https://www.instagram.com/").catch(() => {});
  };

  const more = () => {
    onClose();
    Share.share({ message }).catch(() => {});
  };

  const OPTIONS = [
    { label: copied ? "Link copied" : "Copy Link", icon: copied ? "checkmark" : "link-outline", color: colors.primary, action: copyLink },
    { label: "Share to SocialBook", icon: "paper-plane-outline", color: colors.primary, action: shareSocial },
    { label: "WhatsApp", icon: "logo-whatsapp", color: colors.green, action: openWhatsApp },
    { label: "Instagram", icon: "logo-instagram", color: colors.pink, action: openInstagram },
    { label: "Messages", icon: "chatbubble-ellipses-outline", color: colors.primary, action: openMessages },
    { label: "More", icon: "ellipsis-horizontal", color: colors.textSecondary, action: more },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Share</Text>
          {OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.label}
              style={styles.item}
              onPress={o.action}
              accessibilityLabel={o.label}
            >
              <View style={[styles.iconBox, { backgroundColor: `${o.color}1A` }]}>
                <Icon name={o.icon as any} size={20} color={o.color} />
              </View>
              <Text style={styles.itemLabel}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(23,32,51,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
});