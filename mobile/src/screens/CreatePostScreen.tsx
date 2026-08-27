import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { api, uploadImage } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import RichPasteModal from "../components/RichPasteModal";
import { brandGradient, type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function CreatePostScreen({ navigation, route }: any) {
  const { token, user } = useAuth();
  const [content, setContent] = useState(route?.params?.prefill ?? "");
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [imgH, setImgH] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const photoRequested = route?.params?.withPhoto === true;

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const canPost = (content.trim().length > 0 || !!photo) && !busy && !uploading;

  const wrap = (open: string, close: string) => {
    const start = selection?.start ?? content.length;
    const end = selection?.end ?? start;
    if (end < start) {
      const t = start;
      selection.start = end;
      selection.end = t;
    }
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const sel = content.slice(s, e);
    const next = content.slice(0, s) + open + sel + close + content.slice(e);
    setContent(next);
    const pos = s + open.length + sel.length + close.length;
    setSelection({ start: pos, end: pos });
  };

  const openLinkDialog = () => {
    const start = selection?.start ?? content.length;
    const end = selection?.end ?? start;
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const sel = content.slice(s, e);
    setLinkUrl(sel.trim().startsWith("http") ? sel.trim() : "");
    setLinkOpen(true);
  };

  const insertLink = () => {
    const url = linkUrl.trim().replace(/^https?:\/\//i, "");
    if (!url) {
      setLinkOpen(false);
      return;
    }
    const start = selection?.start ?? content.length;
    const end = selection?.end ?? start;
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const sel = content.slice(s, e).trim() || url;
    const token = `[${sel}](https://${url})`;
    const next = content.slice(0, s) + token + content.slice(e);
    setContent(next);
    const pos = s + token.length;
    setSelection({ start: pos, end: pos });
    setLinkOpen(false);
    setLinkUrl("");
  };

  const insertPasted = (text: string) => {
    const start = selection?.start ?? content.length;
    const end = selection?.end ?? start;
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const next = content.slice(0, s) + text + content.slice(e);
    setContent(next);
    const pos = s + text.length;
    setSelection({ start: pos, end: pos });
    setPasteOpen(false);
  };

  const pickPhoto = async () => {
    if (!token) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to add pictures to your post.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto({ uri: result.assets[0].uri });
    }
  };

  React.useEffect(() => {
    if (photoRequested) pickPhoto();
  }, []);

  const onImageLoad = (e: any) => {
    const w = e.nativeEvent?.width ?? e.nativeEvent?.source?.width;
    const h = e.nativeEvent?.height ?? e.nativeEvent?.source?.height;
    if (!w || !h) return;
    setRatio(h / w);
  };

  const onWrapLayout = (e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && ratio) setImgH(Math.max(180, Math.min(440, w * ratio)));
  };

  const submit = async () => {
    if (!token || !canPost) return;
    setBusy(true);
    setError("");
    try {
      let imageUrl: string | undefined;
      if (photo) {
        setUploading(true);
        imageUrl = await uploadImage(token, photo.uri);
        setUploading(false);
      }
      await api.createPost(token, {
        content: content.trim(),
        ...(imageUrl ? { imageUrl } : {}),
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e.message ?? "Could not create post");
      setBusy(false);
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <LinearGradient colors={[colors.primary, colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={busy || uploading} style={styles.headerBtn}>
            <Icon name="close" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            onPress={submit}
            disabled={!canPost}
            style={[styles.headerBtn, styles.postBtn, !canPost && styles.postBtnDisabled]}
          >
            {busy || uploading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.postBtnText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authorRow}>
          <Avatar name={user?.name ?? "?"} size={44} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{user?.name}</Text>
            <View style={styles.audienceRow}>
              <Icon name="globe-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.audienceText}>Public</Text>
            </View>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textSecondary + "99"}
          multiline
          autoFocus
          maxLength={5000}
          value={content}
          onChangeText={setContent}
          onSelectionChange={(e) =>
            setSelection({
              start: e.nativeEvent.selection.start,
              end: e.nativeEvent.selection.end,
            })
          }
        />

        {photo && (
          <View style={styles.photoPreview} onLayout={onWrapLayout}>
            <Image
              source={{ uri: photo.uri }}
              style={[styles.photo, imgH ? { height: imgH } : null]}
              resizeMode="cover"
              onLoad={onImageLoad}
            />
            <TouchableOpacity
              style={styles.removePhoto}
              onPress={() => setPhoto(null)}
              disabled={uploading}
            >
              <Icon name="close-circle" size={28} color={colors.white} />
            </TouchableOpacity>
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color={colors.white} />
                <Text style={styles.uploadText}>Uploading...</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsCard}>
          <Text style={styles.addLabel}>Add to your post</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionItem} onPress={pickPhoto} disabled={busy || uploading}>
              <View style={[styles.actionIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Icon name="image" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.actionLabel}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => wrap("**", "**")}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: "#EDE9FE" }]}>
                <Text style={[styles.actionBold, { color: colors.primary }]}>B</Text>
              </View>
              <Text style={styles.actionLabel}>Bold</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => wrap("*", "*")}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: "#DBEAFE" }]}>
                <Text style={[styles.actionItalic, { color: "#3B82F6" }]}>I</Text>
              </View>
              <Text style={styles.actionLabel}>Italic</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={openLinkDialog}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: "#D1FAE5" }]}>
                <Icon name="link" size={20} color="#10B981" />
              </View>
              <Text style={styles.actionLabel}>Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setPasteOpen(true)}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: "#FCE7F3" }]}>
                <Icon name="clipboard" size={20} color="#EC4899" />
              </View>
              <Text style={styles.actionLabel}>Paste</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RichPasteModal
          visible={pasteOpen}
          onInsert={insertPasted}
          onClose={() => setPasteOpen(false)}
        />

        <Modal
          visible={linkOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLinkOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Insert Link</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://example.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                value={linkUrl}
                onChangeText={setLinkUrl}
                autoFocus
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLinkOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOkBtn} onPress={insertLink}>
                  <Text style={styles.modalOkText}>Insert</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {!!error && (
          <View style={styles.errorRow}>
            <Icon name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        <Text style={styles.counter}>{content.length} / 5000</Text>
      </ScrollView>
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
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.white,
  },
  postBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 16,
    width: "auto",
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  bodyScroll: {
    flex: 1,
  },
  body: {
    padding: 16,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  audienceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  audienceText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  input: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
    minHeight: 120,
    maxHeight: 280,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  photoPreview: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 16,
  },
  removePhoto: {
    position: "absolute",
    top: 8,
    right: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionItem: {
    alignItems: "center",
    gap: 6,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  actionBold: {
    fontSize: 20,
    fontWeight: "800",
  },
  actionItalic: {
    fontSize: 20,
    fontWeight: "700",
    fontStyle: "italic",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "84%",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modalOkBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalOkText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  counter: {
    marginTop: 14,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
  },
});
