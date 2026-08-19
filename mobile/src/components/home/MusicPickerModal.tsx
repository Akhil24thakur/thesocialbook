import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import Icon from "../Icon";
import { colors } from "../../theme";
import {
  DEFAULT_MUSIC_CLIP_SECONDS,
  fetchMusicCatalog,
  searchMusic,
  type StoryMusic,
  type StoryMusicSelection,
} from "../../music/catalog";

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function MusicPickerModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (selection: StoryMusicSelection) => void;
}) {
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState<StoryMusic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StoryMusic | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [songDuration, setSongDuration] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const player = useAudioPlayer(null);

  const filtered = useMemo(() => searchMusic(songs, query), [songs, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const catalog = await fetchMusicCatalog();
    setLoading(false);
    if (!catalog.length) {
      setLoadError(true);
      return;
    }
    setSongs(catalog);
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (songs.length === 0) load();
  }, [visible, songs.length, load]);

  const stopPreview = useCallback(() => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    try {
      player.pause();
    } catch {}
    setPreviewing(false);
  }, [player]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      stopPreview();
      setSelected(null);
      setStartTime(0);
      setSongDuration(null);
      setPreviewError(false);
      setQuery("");
    }
  }, [visible, stopPreview]);

  const startPreview = useCallback(
    async (song: StoryMusic, from: number) => {
      stopPreview();
      setPreviewError(false);
      try {
        player.replace(song.audioUrl);
        await player.seekTo(from);
        player.play();
        setPreviewing(true);
        const dur = player.duration;
        if (dur && isFinite(dur) && dur > 0) setSongDuration(dur);
        stopTimer.current = setTimeout(() => {
          try {
            player.pause();
          } catch {}
          setPreviewing(false);
        }, DEFAULT_MUSIC_CLIP_SECONDS * 1000);
      } catch {
        setPreviewing(false);
        setPreviewError(true);
      }
    },
    [player, stopPreview]
  );

  const maxStart = useMemo(() => {
    const d = songDuration ?? 60;
    return Math.max(0, d - DEFAULT_MUSIC_CLIP_SECONDS);
  }, [songDuration]);

  const sliderRef = useRef<View>(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        if (!sliderWidth) return;
        const x = e.nativeEvent.locationX;
        setStartTime(Math.round(Math.min(maxStart, Math.max(0, (x / sliderWidth) * maxStart))));
      },
      onPanResponderMove: (e) => {
        if (!sliderWidth) return;
        const x = e.nativeEvent.locationX;
        setStartTime(Math.round(Math.min(maxStart, Math.max(0, (x / sliderWidth) * maxStart))));
      },
      onPanResponderRelease: () => {
        if (selected) startPreview(selected, startTime);
      },
    })
  ).current;

  const onSelectSong = (song: StoryMusic) => {
    setSelected(song);
    setStartTime(0);
    setSongDuration(null);
    setPreviewError(false);
    stopPreview();
  };

  const renderSong = ({ item }: { item: StoryMusic }) => {
    const isSel = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.row, isSel && styles.rowSelected]}
        onPress={() => onSelectSong(item)}
        activeOpacity={0.7}
        accessibilityLabel={`Select ${item.title}`}
      >
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Icon name="musical-notes" size={20} color={colors.white} />
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        {isSel && (
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => (previewing ? stopPreview() : startPreview(item, startTime))}
            accessibilityLabel={previewing ? "Stop preview" : "Preview song"}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={previewing ? "pause" : "play"} size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        {isSel && (
          <View style={styles.checkBadge}>
            <Icon name="checkmark" size={14} color={colors.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const clipPreviewing = previewing && selected;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            accessibilityLabel="Close music picker"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Music</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.searchWrap}>
          <Icon name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs…"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerText}>Loading music…</Text>
          </View>
        )}

        {!loading && loadError && (
          <View style={styles.center}>
            <Icon name="musical-notes" size={40} color={colors.textSecondary} />
            <Text style={styles.centerText}>Could not load music.</Text>
            <Text style={styles.centerText}>You can still create your story without music.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.centerText}>No songs found.</Text>
          </View>
        )}

        {!loading && !loadError && filtered.length > 0 && (
          <FlatList
            data={filtered}
            renderItem={renderSong}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {selected && !loading && !loadError && (
          <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.clipHeader}>
              <Text style={styles.clipTitle} numberOfLines={1}>
                {selected.title} — {selected.artist}
              </Text>
              <Text style={styles.clipTime}>
                {formatSec(startTime)} – {formatSec(startTime + DEFAULT_MUSIC_CLIP_SECONDS)}
              </Text>
            </View>
            <View
              style={styles.sliderTrack}
              ref={sliderRef}
              onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
              {...pan.panHandlers}
            >
              <View
                style={[
                  styles.sliderFill,
                  { width: maxStart > 0 ? `${(startTime / maxStart) * 100}%` : "0%" },
                ]}
              />
              <View style={[styles.sliderThumb, { left: maxStart > 0 ? `${(startTime / maxStart) * 100}%` : "0%" }]} />
            </View>
            <Text style={styles.sliderHint}>Drag to choose where the 15s clip starts</Text>
            {previewError && <Text style={styles.previewError}>Preview failed — check your connection.</Text>}
            <View style={styles.bottomRow}>
              <TouchableOpacity
                style={[styles.previewBig, clipPreviewing && styles.previewBigActive]}
                onPress={() => (clipPreviewing ? stopPreview() : startPreview(selected, startTime))}
                accessibilityLabel={clipPreviewing ? "Stop preview" : "Preview clip"}
              >
                <Icon name={clipPreviewing ? "pause" : "play"} size={18} color={colors.white} />
                <Text style={styles.previewBigText}>{clipPreviewing ? "Stop" : "Preview"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() =>
                  onDone({ song: selected, startTime, duration: DEFAULT_MUSIC_CLIP_SECONDS })
                }
                accessibilityLabel="Add music to story"
              >
                <Text style={styles.doneText}>Done</Text>
                <Icon name="arrow-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
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
    paddingBottom: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    padding: 0,
    fontSize: 15,
    color: colors.text,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 180,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  rowSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cover: {
    width: 46,
    height: 46,
    borderRadius: 10,
    marginRight: 12,
  },
  coverFallback: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  rowArtist: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  clipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  clipTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginRight: 8,
  },
  clipTime: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    transform: [{ translateX: -8 }],
  },
  sliderHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  previewError: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewBig: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  previewBigActive: {
    backgroundColor: colors.textSecondary,
  },
  previewBigText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 11,
  },
  doneText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 14,
  },
});