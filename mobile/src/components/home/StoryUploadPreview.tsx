import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../Avatar";
import Icon from "../Icon";
import StoryCropScreen from "./StoryCropScreen";
import { type Colors } from "../../theme";
import { useTheme } from "../../theme-context";
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const confirm = () => {
    if (uploading) return;
    onConfirm();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.userRow}>
            <Avatar name={userName} size={36} gradient />
            <Text style={styles.name} numberOfLines={1}>
              {userName}
            </Text>
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

        <View style={styles.musicArea}>
          {music ? (
            <View style={styles.musicChip}>
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
          ) : (
            <TouchableOpacity
              style={styles.addMusicBtn}
              onPress={onAddMusic}
              disabled={uploading}
              accessibilityLabel="Add music"
            >
              <Icon name="musical-notes" size={18} color={colors.white} />
              <Text style={styles.addMusicText}>Add Music</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.imageWrap}>
          {uri && (
            <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          )}
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
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

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0A0E16",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  userRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 12,
  },
  name: {
    flexShrink: 1,
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
  musicArea: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  addMusicBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addMusicText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  musicChip: {
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
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
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
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 12,
    justifyContent: "center",
  },
  uploadText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
});