import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { colors } from "../theme";

export default function CreatePostScreen({ navigation, route }: any) {
  const { token, user } = useAuth();
  const [content, setContent] = useState(route?.params?.prefill ?? "");
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [imgH, setImgH] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const photoRequested = route?.params?.withPhoto === true;

  const canPost = (content.trim().length > 0 || !!photo) && !busy && !uploading;

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
        />

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