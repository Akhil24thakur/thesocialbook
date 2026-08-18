import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from "expo-image-picker";
import { api, uploadImage } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import RichPasteModal from "../components/RichPasteModal";
import { colors } from "../theme";

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

  const canPost = (content.trim().length > 0 || !!photo) && !busy && !uploading;

  const wrap = (open: string, close: string) => {
    const start = selection?.start ?? content.length;
    const end = selection?.end ?? start;
    if (end < start) {
      // normalize reverse selection
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
    if (w > 0 && ratio) setImgH(Math.max(160, Math.min(480, w * ratio)));
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={busy || uploading}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Post</Text>
        <TouchableOpacity onPress={submit} disabled={!canPost}>
          {busy || uploading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.postBtn, !canPost && styles.postBtnDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.row}>
          <Avatar name={user?.name ?? "?"} size={40} />
          <Text style={styles.name}>{user?.name}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textSecondary}
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

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => wrap("**", "**")}
            accessibilityLabel="Bold"
          >
            <Text style={[styles.toolText, styles.toolBold]}>B</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => wrap("*", "*")}
            accessibilityLabel="Italic"
          >
            <Text style={[styles.toolText, styles.toolItalic]}>I</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => wrap("_", "_")}
            accessibilityLabel="Underline"
          >
            <Text style={[styles.toolText, styles.toolUnderline]}>U</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={openLinkDialog}
            accessibilityLabel="Add link"
          >
            <Icon name="link-outline" size={19} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setPasteOpen(true)}
            accessibilityLabel="Paste rich text"
          >
            <Icon name="clipboard-outline" size={19} color={colors.text} />
          </TouchableOpacity>
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
              <Text style={styles.modalTitle}>Add Link</Text>
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
                <TouchableOpacity style={styles.modalBtn} onPress={() => setLinkOpen(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtn} onPress={insertLink}>
                  <Text style={styles.modalOk}>Insert</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {photo && (
          <View style={styles.photoWrap} onLayout={onWrapLayout}>
            <Image
              source={{ uri: photo.uri }}
              style={[styles.photo, imgH ? { height: imgH } : null]}
              resizeMode="contain"
              onLoad={onImageLoad}
            />
            <TouchableOpacity
              style={styles.removePhoto}
              onPress={() => setPhoto(null)}
              disabled={uploading}
            >
              <Icon name="close" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>Uploading photo…</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.photoBtn, (busy || uploading) && styles.photoBtnDisabled]}
          onPress={pickPhoto}
          disabled={busy || uploading}
        >
          <Icon name="image-outline" size={20} color={colors.primary} />
          <Text style={styles.photoBtnText}>Add Photo</Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.counter}>{content.length}/5000</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  postBtn: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  bodyScroll: {
    flex: 1,
  },
  body: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  name: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  input: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
    minHeight: 90,
    maxHeight: 240,
    textAlignVertical: "top",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  toolBtn: {
    width: 38,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: {
    fontSize: 17,
    color: colors.text,
  },
  toolBold: {
    fontWeight: "700",
  },
  toolItalic: {
    fontStyle: "italic",
  },
  toolUnderline: {
    textDecorationLine: "underline",
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
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 14,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  modalOk: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  photoWrap: {
    marginTop: 10,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  removePhoto: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },
  photoBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
  },
  photoBtnDisabled: {
    opacity: 0.5,
  },
  photoBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 8,
  },
  counter: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
  },
});