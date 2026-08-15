import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "../../theme";

function Block({ style }: { style?: any }) {
  return <View style={[styles.block, style]} />;
}

export default function SkeletonFeed() {
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

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#E8EBF1",
    borderRadius: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#172033",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  lineName: {
    width: "40%",
    height: 14,
  },
  lineTime: {
    width: "25%",
    height: 10,
  },
  lineBody: {
    height: 13,
    marginBottom: 10,
    width: "90%",
  },
  image: {
    height: 200,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 14,
  },
});