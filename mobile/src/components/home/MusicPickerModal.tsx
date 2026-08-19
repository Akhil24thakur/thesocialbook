import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import Icon from "../Icon";
import { type Colors } from "../../theme";
import { useTheme } from "../../theme-context";
import {
  DEFAULT_MUSIC_CLIP_SECONDS,
  fetchMusicCatalog,
  searchMusic,
  type StoryMusic,
  type StoryMusicSelection,
} from "../../music/catalog";
import MusicClipSelector from "./MusicClipSelector";

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const loopTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const lastSeekRef = useRef(0);

  const startRef = useRef(0);
  startRef.current = startTime;
  const clipRef = useRef(DEFAULT_MUSIC_CLIP_SECONDS);
  const selectedRef = useRef<StoryMusic | null>(null);
  selectedRef.current = selected;

  const duration = useMemo(() => {
    const d = status.duration;
    return d && isFinite(d) && d > 0 ? d : songDuration;
  }, [status.duration, songDuration]);

  const clipDuration = useMemo(
    () => (duration != null && duration > 0 ? Math.min(DEFAULT_MUSIC_CLIP_SECONDS, duration) : DEFAULT_MUSIC_CLIP_SECONDS),
    [duration]
  );
  clipRef.current = clipDuration;

  const maxStart = useMemo(
    () => (duration != null && duration > 0 ? Math.max(0, duration - clipDuration) : 0),
    [duration, clipDuration]
  );

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
    if (loopTimer.current) clearInterval(loopTimer.current);
    loopTimer.current = null;
    try {
      player.pause();
    } catch {}
    setPreviewing(false);
  }, [player]);

  useEffect(() => {
    return () => {
      if (loopTimer.current) clearInterval(loopTimer.current);
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
      lastUrlRef.current = null;
    }
  }, [visible, stopPreview]);

  const startPreview = useCallback(
    async (song: StoryMusic, from: number) => {
      stopPreview();
      setPreviewError(false);
      try {
        if (lastUrlRef.current !== song.audioUrl) {
          lastUrlRef.current = song.audioUrl;
          player.replace(song.audioUrl);
        }
        if (duration != null && duration > 0) {
          const clip = Math.min(DEFAULT_MUSIC_CLIP_SECONDS, duration);
          const max = Math.max(0, duration - clip);
          from = Math.round(Math.min(max, Math.max(0, from)));
          startRef.current = from;
          setStartTime(from);
        }
        await player.seekTo(from);
        player.play();
        setPreviewing(true);
        const clip = clipRef.current;
        loopTimer.current = setInterval(() => {
          try {
            player.seekTo(startRef.current);
          } catch {}
        }, clip * 1000);
      } catch {
        setPreviewing(false);
        setPreviewError(true);
      }
    },
    [player, stopPreview, duration]
  );

  const seekDuringDrag = useCallback(
    (from: number) => {
      const now = Date.now();
      if (previewing && now - lastSeekRef.current > 150) {
        lastSeekRef.current = now;
        try {
          player.seekTo(from);
        } catch {}
      }
    },
    [player, previewing]
  );

  const onDragChange = useCallback(
    (t: number) => {
      setStartTime(t);
      seekDuringDrag(t);
    },
    [seekDuringDrag]
  );

  const onDragRelease = useCallback(
    (t: number) => {
      const song = selectedRef.current;
      if (song) startPreview(song, t);
    },
    [startPreview]
  );

  const onSelectSong = (song: StoryMusic) => {
    setSelected(song);
    setStartTime(0);
    setSongDuration(null);
    setPreviewError(false);
    lastUrlRef.current = null;
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
  const durationKnown = duration != null && duration > 0;
  const isShortSong = durationKnown && duration <= DEFAULT_MUSIC_CLIP_SECONDS;

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
              <View style={styles.timeWrap}>
                <Text style={styles.clipTime}>
                  {formatSec(startTime)} – {formatSec(startTime + clipDuration)}
                </Text>
                {durationKnown && (
                  <Text style={styles.clipTotal}> / {formatSec(duration!)}</Text>
                )}
              </View>
            </View>

            <MusicClipSelector
              duration={duration}
              clipDuration={clipDuration}
              startTime={startTime}
              disabled={!durationKnown}
              onChange={onDragChange}
              onRelease={onDragRelease}
            />

            <Text style={styles.sliderHint}>
              {isShortSong
                ? `Full song · ${formatSec(duration!)}`
                : !durationKnown
                  ? "Loading audio…"
                  : `Drag to choose where the ${Math.round(clipDuration)}s clip starts`}
            </Text>

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
                  onDone({ song: selected, startTime, duration: clipDuration })
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
    paddingBottom: 190,
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
    marginBottom: 4,
  },
  clipTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginRight: 8,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  clipTime: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  clipTotal: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sliderHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
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