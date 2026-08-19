import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, uploadImage } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import type { StoryMusicSelection } from "../../music/catalog";

export function useStoryUpload() {
  const { token } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [music, setMusic] = useState<StoryMusicSelection | null>(null);

  const pickCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to add photos to your story.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setAddOpen(false);
      setPreviewUri(result.assets[0].uri);
    }
  }, []);

  const pickGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to add photos to your story.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setAddOpen(false);
      setPreviewUri(result.assets[0].uri);
    }
  }, []);

  const openMusic = useCallback(() => {
    setAddOpen(false);
    setMusicOpen(true);
  }, []);

  const confirmUpload = useCallback(async (): Promise<boolean> => {
    if (!previewUri || !token) return false;
    setUploading(true);
    try {
      const url = await uploadImage(token, previewUri);
      await api.createStory(
        token,
        url,
        music
          ? {
              musicSongId: music.song.id,
              musicSongTitle: music.song.title,
              musicSongArtist: music.song.artist,
              musicAudioUrl: music.song.audioUrl,
              musicCoverUrl: music.song.coverUrl,
              musicStartTime: music.startTime,
              musicDuration: music.duration,
            }
          : null
      );
      setPreviewUri(null);
      setMusic(null);
      return true;
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload your story.");
      return false;
    } finally {
      setUploading(false);
    }
  }, [previewUri, token, music]);

  return {
    addOpen,
    setAddOpen,
    previewUri,
    setPreviewUri,
    uploading,
    musicOpen,
    setMusicOpen,
    music,
    setMusic,
    pickCamera,
    pickGallery,
    openMusic,
    confirmUpload,
  };
}