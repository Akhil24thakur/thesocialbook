import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "../Icon";
import { colors } from "../../theme";

export default function AddStorySheet({
  visible,
  hasStory,
  onClose,
  onViewStory,
  onGallery,
  onCamera,
  onMusic,
}: {
  visible: boolean;
  hasStory: boolean;
  onClose: () => void;
  onViewStory: () => void;
  onGallery: () => void;
  onCamera: () => void;
  onMusic: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Add to your story</Text>
          {hasStory && (
            <TouchableOpacity style={styles.option} onPress={onViewStory}>
              <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}1A` }]}>
                <Icon name="play-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.optionLabel}>View your story</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.option} onPress={onGallery}>
            <View style={[styles.optionIcon, { backgroundColor: `${colors.green}1A` }]}>
              <Icon name="image-outline" size={20} color={colors.green} />
            </View>
            <Text style={styles.optionLabel}>Choose from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={onCamera}>
            <View style={[styles.optionIcon, { backgroundColor: `${colors.pink}1A` }]}>
              <Icon name="camera-outline" size={20} color={colors.pink} />
            </View>
            <Text style={styles.optionLabel}>Take a photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={onMusic}>
            <View style={[styles.optionIcon, { backgroundColor: `${colors.purple}1A` }]}>
              <Icon name="musical-notes" size={20} color={colors.purple} />
            </View>
            <Text style={styles.optionLabel}>Add music</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(23,32,51,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
});