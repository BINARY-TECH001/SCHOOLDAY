import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Icon, IconName } from "../../components/Icon";

export interface AttentionItem {
  title: string;
  subtitle: string;
  icon: IconName;
  route: string;
  actionText?: string;
}

export function HomeAttentionBanner({ item }: { item: AttentionItem | null }) {
  if (!item) return null;

  return (
    <View style={[styles.container, shadows.sm]}>
      <View style={styles.leftContent}>
        <View style={styles.iconTile}>
          <Icon name={item.icon} size={18} color={colors.orange} filled />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Action: ${item.title}`}
        onPress={() => router.push(item.route as any)}
        style={({ pressed }) => [
          styles.actionBtn,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.actionBtnText}>{item.actionText || "Action"}</Text>
        <Icon name="arrow" size={12} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: "#fed7aa", // Subtle warm warning border
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
    gap: spacing.sm,
  },
  leftContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.navy,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: radii.sm,
  },
  actionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: "#ffffff",
  },
});
