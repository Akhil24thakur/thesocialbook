import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { useVideoPlayer, VideoView } from "expo-video";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Icon from "../components/Icon";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function CreateReelScreen({ navigation }: any) {
  const { token, user } = useAuth();
  const [video, setVideo] = useState<{ uri: string; fileName?: string | null } | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"" | "uploading" | "creating" | "error">("");
  const [error, setError] = useState("");
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const player = useVideoPlayer(video?.uri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const canPost = !!video && !!token && !busy;

  const pickVideo = async () => {
    if (!token) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow video access to add a reel.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setVideo({ uri: a.uri, fileName: a.fileName });
      setError("");
    }
  };

  const extFor = (uri: string, fileName?: string | null) => {
    const fromName = fileName?.split(".").pop();
    if (fromName) return fromName.toLowerCase();
    const fromUri = uri.split(".").pop()?.split("?")[0];
    return fromUri ? fromUri.toLowerCase() : "mp4";
  };

  const mimeFor = (ext: string) => {
    if (ext === "mp4") return "video/mp4";
    if (ext === "webm") return "video/webm";
    if (ext === "mov") return "video/quicktime";
    return "video/mp4";
  };

  const submit = async () => {
    if (!token || !video || busy) return;
    setBusy(true);
    setError("");
    try {
      const ext = extFor(video.uri, video.fileName);
      const mime = mimeFor(ext);
      setStage("uploading");
      const { uploadUrl, publicUrl } = await api.reelUploadUrl(token, ext);
      const file = new File(video.uri);
      const bytes = await file.bytes();
      const up = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: bytes,
      });
      if (!up.ok) throw new Error(`Upload failed (${up.status})`);
      setStage("creating");
      await api.createReel(token, {
        caption: caption.trim() || undefined,
        videoUrl: publicUrl,
      });
      navigation.goBack();
    } catch (e: any) {
      setStage("error");
      setError(e.message ?? "Could not upload reel");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={busy}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Reel</Text>
        <TouchableOpacity onPress={submit} disabled={!canPost}>
          {busy ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.shareBtn, !canPost && styles.shareBtnDisabled]}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.previewWrap}>
          {video ? (
            <VideoView
              player={player}
              style={styles.preview}
              contentFit="cover"
              nativeControls={false}
              surfaceType="textureView"
            />
          ) : (
            <TouchableOpacity style={styles.picker} onPress={pickVideo} activeOpacity={0.8}>
              <Icon name="videocam-outline" size={44} color={colors.textSecondary} />
              <Text style={styles.pickerTitle}>Pick a video</Text>
              <Text style={styles.pickerSub}>Vertical videos work best</Text>
            </TouchableOpacity>
          )}
        </View>

        {video && (
          <TouchableOpacity style={styles.pickBtn} onPress={pickVideo} disabled={busy}>
            <Icon name="albums-outline" size={18} color={colors.primary} />
            <Text style={styles.pickBtnText}>Choose different video</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.input}
          placeholder="Write a caption…"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
          value={caption}
          onChangeText={setCaption}
          editable={!busy}
        />

        {stage === "uploading" && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.statusText}>Uploading video…</Text>
          </View>
        )}
        {stage === "creating" && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.statusText}>Creating your reel…</Text>
          </View>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  shareBtn: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  shareBtnDisabled: {
    opacity: 0.4,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  previewWrap: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 520,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.border,
    alignSelf: "center",
  },
  preview: {
    flex: 1,
  },
  picker: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  pickerSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
  },
  pickBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  input: {
    minHeight: 60,
    maxHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});