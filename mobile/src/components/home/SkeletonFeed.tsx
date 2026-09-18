import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { type Colors } from "../../theme";
import { useTheme } from "../../theme-context";

export default function SkeletonFeed() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Block = ({ style }: { style?: any }) => <View style={[styles.block, style]} />;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] });

  return (
    <Animated.View style={{ opacity }}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.headerRow}>
            <Block style={styles.avatar} />
            <View style={{ flex: 1, gap: 8 }}>
              <Block style={styles.lineName} />
              <Block style={styles.lineTime} />
            </View>
          </View>
          <Block style={styles.lineBody} />
          <Block style={[styles.lineBody, { width: "55%" }]} />
          <Block style={styles.image} />
          <Block style={[styles.lineBody, { width: "40%" }]} />
        </View>
      ))}
    </Animated.View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  block: {
    backgroundColor: colors.border,
    borderRadius: 6,
  },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  lineName: {
    width: "40%",
    height: 12,
  },
  lineTime: {
    width: "25%",
    height: 10,
  },
  lineBody: {
    height: 12,
    marginBottom: 10,
    width: "90%",
  },
  image: {
    height: 200,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 14,
  },
});