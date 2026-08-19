import React, { useState } from "react";
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../Avatar";
import Icon from "../Icon";
import StoryCropScreen from "./StoryCropScreen";
import { colors } from "../../theme";
import type { StoryMusicSelection } from "../../music/catalog";

export default function StoryUploadPreview({
  uri,
  userName,
  visible,
  uploading,
  music,
  onCancel,
  onCropped,
  onAddMusic,
  onRemoveMusic,
  onConfirm,
}: {
  uri: string | null;
  userName: string;
  visible: boolean;
  uploading: boolean;
  music?: StoryMusicSelection | null;
  onCancel: () => void;
  onCropped: (uri: string) => void;
  onAddMusic: () => void;
  onRemoveMusic: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [cropping, setCropping] = useState(false);

  const confirm = () => {
    if (uploading) return;
    onConfirm();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        {uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
        <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
          <View style={styles.userRow}>
            <Avatar name={userName} size={36} gradient />
            <Text style={styles.name}>{userName}</Text>
          </View>
          <TouchableOpacity
            style={styles.close}
            onPress={onCancel}
            accessibilityLabel="Cancel upload"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {music && (
          <View style={[styles.musicChip, { bottom: insets.bottom + 92 }]}>
            <Icon name="musical-notes" size={16} color={colors.primary} />
            <View style={styles.musicChipInfo}>
              <Text style={styles.musicChipTitle} numberOfLines={1}>
                {music.song.title}
              </Text>
              <Text style={styles.musicChipSub} numberOfLines={1}>
                {music.song.artist} · {music.startTime}s – {music.startTime + music.duration}s
              </Text>
            </View>
            <TouchableOpacity
              onPress={onRemoveMusic}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Remove music"
            >
              <Icon name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.cropBtn}
            onPress={() => setCropping(true)}
            disabled={uploading}
            accessibilityLabel="Crop image"
          >
            <Icon name="crop-outline" size={18} color={colors.white} />
            <Text style={styles.cropText}>Crop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cropBtn, music && styles.musicBtnActive]}
            onPress={onAddMusic}
            disabled={uploading}
            accessibilityLabel="Add music"
          >
            <Icon name="musical-notes" size={18} color={music ? colors.primary : colors.white} />
            <Text style={[styles.cropText, music && { color: colors.primary }]}>
              {music ? "Music" : "Add Music"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={confirm}
            disabled={uploading}
            accessibilityLabel="Upload story"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={styles.uploadText}>Upload</Text>
                <Icon name="arrow-forward" size={18} color={colors.primary} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <StoryCropScreen
          uri={uri}
          visible={cropping}
          onCancel={() => setCropping(false)}
          onDone={(c) => {
            setCropping(false);
            onCropped(c);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0A0E16",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cropBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cropText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  musicChip: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(10,14,22,0.85)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  musicChipInfo: {
    flex: 1,
  },
  musicChipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  musicChipSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  musicBtnActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 12,
    minWidth: 120,
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
});