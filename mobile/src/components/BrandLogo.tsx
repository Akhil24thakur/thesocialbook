import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brandGradient, type Colors } from "../theme";
import { useTheme } from "../theme-context";

export default function BrandLogo({ size = 72 }: { size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bookW = size * 0.54;
  const bookH = size * 0.44;
  const lineW = bookW * 0.58;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <LinearGradient
        colors={brandGradient(colors)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28 }]}
      >
        <View style={[styles.book, { width: bookW, height: bookH }]}>
          <View style={styles.spine} />
          <View style={[styles.line, { width: lineW }]} />
          <View style={[styles.line, { width: lineW * 0.75, marginTop: bookH * 0.11 }]} />
        </View>
        <View style={[styles.ribbon, { height: bookH * 0.34, width: bookW * 0.1 }]} />
      </LinearGradient>
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  book: {
    backgroundColor: colors.white,
    borderRadius: 4,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: "6%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  spine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "16%",
    backgroundColor: colors.primaryDark,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  line: {
    height: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: 2,
    marginLeft: "22%",
  },
  ribbon: {
    position: "absolute",
    bottom: -2,
    backgroundColor: colors.saffron,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});