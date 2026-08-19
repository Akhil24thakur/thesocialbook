import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { type Colors } from "../../theme";
import { useTheme } from "../../theme-context";

type Rect = { x: number; y: number; w: number; h: number };
type Corner = "tl" | "tr" | "bl" | "br";

const MIN_SIZE = 80;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function StoryCropScreen({
  uri,
  visible,
  onCancel,
  onDone,
}: {
  uri: string | null;
  visible: boolean;
  onCancel: () => void;
  onDone: (uri: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [applying, setApplying] = useState(false);

  const frameRef = useRef(frame);
  frameRef.current = frame;
  const startRef = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });

  const imgRect = useMemo(() => {
    if (!imgSize || !viewSize) return null;
    const scale = Math.min(viewSize.w / imgSize.w, viewSize.h / imgSize.h);
    const w = imgSize.w * scale;
    const h = imgSize.h * scale;
    return { x: (viewSize.w - w) / 2, y: (viewSize.h - h) / 2, w, h, scale };
  }, [imgSize, viewSize]);

  const imgRectRef = useRef(imgRect);
  imgRectRef.current = imgRect;

  useEffect(() => {
    if (!uri || !visible) return;
    setApplying(false);
    setImgSize(null);
    Image.getSize(uri, (w, h) => setImgSize({ w, h }), () => {});
  }, [uri, visible]);

  useEffect(() => {
    if (!imgRect) return;
    setFrame({ x: imgRect.x, y: imgRect.y, w: imgRect.w, h: imgRect.h });
  }, [imgRect]);

  const makeCornerPan = (corner: Corner) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = { ...frameRef.current };
      },
      onPanResponderMove: (_e, g) => {
        const start = startRef.current;
        const r = imgRectRef.current;
        if (!r) return;
        const { dx, dy } = g;
        let { x, y, w, h } = start;
        if (corner === "tl" || corner === "bl") {
          x = clamp(start.x + dx, r.x, start.x + start.w - MIN_SIZE);
          w = start.w - (x - start.x);
        }
        if (corner === "tr" || corner === "br") {
          w = clamp(start.w + dx, MIN_SIZE, r.x + r.w - start.x);
        }
        if (corner === "tl" || corner === "tr") {
          y = clamp(start.y + dy, r.y, start.y + start.h - MIN_SIZE);
          h = start.h - (y - start.y);
        }
        if (corner === "bl" || corner === "br") {
          h = clamp(start.h + dy, MIN_SIZE, r.y + r.h - start.y);
        }
        setFrame({ x, y, w, h });
      },
    });

  const movePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = { ...frameRef.current };
        },
        onPanResponderMove: (_e, g) => {
          const start = startRef.current;
          const r = imgRectRef.current;
          if (!r) return;
          setFrame({
            x: clamp(start.x + g.dx, r.x, r.x + r.w - start.w),
            y: clamp(start.y + g.dy, r.y, r.y + r.h - start.h),
            w: start.w,
            h: start.h,
          });
        },
      }),
    []
  );

  const cornerPans = useMemo(
    () => ({ tl: makeCornerPan("tl"), tr: makeCornerPan("tr"), bl: makeCornerPan("bl"), br: makeCornerPan("br") }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const apply = async () => {
    if (!uri || !imgRect) return;
    setApplying(true);
    try {
      const s = imgRect.scale;
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: Math.round((frame.x - imgRect.x) / s),
              originY: Math.round((frame.y - imgRect.y) / s),
              width: Math.round(frame.w / s),
              height: Math.round(frame.h / s),
            },
          },
        ],
        { compress: 0.8 }
      );
      onDone(result.uri);
    } catch {
      setApplying(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} disabled={applying} accessibilityLabel="Cancel crop">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Crop photo</Text>
          <TouchableOpacity onPress={apply} disabled={applying || !imgRect} accessibilityLabel="Apply crop">
            {applying ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.applyText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={styles.stage}
          onLayout={(e) => setViewSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {imgSize && <Image source={{ uri: uri! }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
          {imgRect && viewSize && (
            <>
              <View
                style={[styles.frame, { left: frame.x, top: frame.y, width: frame.w, height: frame.h }]}
                {...movePan.panHandlers}
              >
                <View style={styles.grid} pointerEvents="none">
                  <View style={[styles.gridLineV, { left: "33.333%" }]} />
                  <View style={[styles.gridLineV, { left: "66.666%" }]} />
                  <View style={[styles.gridLineH, { top: "33.333%" }]} />
                  <View style={[styles.gridLineH, { top: "66.666%" }]} />
                </View>
              </View>
              <View style={[styles.corner, { left: frame.x - 14, top: frame.y - 14 }]} {...cornerPans.tl.panHandlers} />
              <View style={[styles.corner, { right: viewSize.w - (frame.x + frame.w) - 14, top: frame.y - 14 }]} {...cornerPans.tr.panHandlers} />
              <View style={[styles.corner, { left: frame.x - 14, bottom: viewSize.h - (frame.y + frame.h) - 14 }]} {...cornerPans.bl.panHandlers} />
              <View style={[styles.corner, { right: viewSize.w - (frame.x + frame.w) - 14, bottom: viewSize.h - (frame.y + frame.h) - 14 }]} {...cornerPans.br.panHandlers} />
            </>
          )}
        </View>

        <Text style={styles.hint}>Drag to move · corners to resize</Text>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0A0E16",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  applyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  stage: {
    flex: 1,
    overflow: "hidden",
  },
  frame: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  grid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    backgroundColor: "transparent",
  },
  hint: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 14,
  },
});