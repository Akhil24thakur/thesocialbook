import React, { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { colors } from "../../theme";

const TRACK_HEIGHT = 44;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export default function MusicClipSelector({
  duration,
  clipDuration,
  startTime,
  disabled,
  onChange,
  onRelease,
}: {
  duration: number | null;
  clipDuration: number;
  startTime: number;
  disabled?: boolean;
  onChange: (startTime: number) => void;
  onRelease: (startTime: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const trackWRef = useRef(0);
  trackWRef.current = trackWidth;
  const durationRef = useRef<number | null>(duration);
  durationRef.current = duration;
  const clipRef = useRef(clipDuration);
  clipRef.current = clipDuration;
  const startRef = useRef(startTime);
  startRef.current = startTime;
  const dragOffsetRef = useRef(0);

  const maxStart = useMemo(
    () => (duration != null && duration > 0 ? Math.max(0, duration - clipDuration) : 0),
    [duration, clipDuration]
  );

  const windowWidth =
    duration != null && duration > 0 ? (clipDuration / duration) * trackWidth : trackWidth;
  const windowStartPx = trackWidth > windowWidth ? (startTime / maxStart) * (trackWidth - windowWidth) : 0;

  const pxToStart = (px: number) => {
    const usable = trackWRef.current - windowWidth;
    if (usable <= 0) return 0;
    const max = durationRef.current != null ? Math.max(0, durationRef.current - clipRef.current) : 0;
    return Math.round((clamp(px, 0, usable) / usable) * max);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const x = e.nativeEvent.locationX;
          const winStart = (startRef.current / maxStartRef.current) * (trackWRef.current - windowWRef.current);
          const inWindow = x >= winStart - 8 && x <= winStart + windowWRef.current + 8;
          dragOffsetRef.current = inWindow ? x - winStart : 0;
          const next = pxToStartRef.current(x - dragOffsetRef.current);
          onChangeRef.current(next);
        },
        onPanResponderMove: (e) => {
          const x = e.nativeEvent.locationX;
          const next = pxToStartRef.current(x - dragOffsetRef.current);
          onChangeRef.current(next);
        },
        onPanResponderRelease: () => {
          onReleaseRef.current(startRef.current);
        },
        onPanResponderTerminate: () => {
          onReleaseRef.current(startRef.current);
        },
      }),
    []
  );

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const maxStartRef = useRef(maxStart);
  maxStartRef.current = maxStart;
  const windowWRef = useRef(windowWidth);
  windowWRef.current = windowWidth;
  const pxToStartRef = useRef(pxToStart);
  pxToStartRef.current = pxToStart;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const ready = duration != null && duration > 0;

  return (
    <View
      style={[styles.touch, disabled || !ready ? styles.touchDisabled : null]}
      collapsable={false}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <View style={[styles.line, !ready && styles.lineDisabled]} />
      {ready && (
        <View
          style={[
            styles.window,
            {
              left: windowStartPx,
              width: windowWidth,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.grip} pointerEvents="none" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  touch: {
    height: TRACK_HEIGHT,
    justifyContent: "center",
    marginVertical: 4,
  },
  touchDisabled: {
    opacity: 0.5,
  },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    top: TRACK_HEIGHT / 2 - 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  lineDisabled: {
    backgroundColor: "#E3E7EE",
  },
  window: {
    position: "absolute",
    top: 4,
    bottom: 4,
    backgroundColor: "rgba(108,99,255,0.18)",
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  grip: {
    width: 34,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});