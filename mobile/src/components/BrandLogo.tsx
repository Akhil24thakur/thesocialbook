import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { type Colors } from "../theme";
import { useTheme } from "../theme-context";

const LOGO_MARK = require("../../assets/brand/logo-mark.png");

export default function BrandLogo({ size = 72 }: { size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image source={LOGO_MARK} style={{ width: size, height: size }} resizeMode="contain" />
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
});