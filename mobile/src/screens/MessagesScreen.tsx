import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "../components/Icon";
import { colors } from "../theme";

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name="chatbubble-ellipses-outline" size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>No messages yet</Text>
      <Text style={styles.subtitle}>
        Start a conversation with a friend and it will show up here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
});