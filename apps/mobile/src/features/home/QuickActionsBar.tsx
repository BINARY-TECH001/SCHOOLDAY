import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Icon, IconName } from "../../components/Icon";

export interface QuickActionItem {
  id: string;
  title: string;
  icon: IconName;
  onPress: () => void;
  accent?: boolean;
}

export interface QuickActionsBarProps {
  actions: QuickActionItem[];
}

export function QuickActionsBar({ actions }: QuickActionsBarProps) {
  if (!actions.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {actions.map((act) => (
          <Pressable
            key={act.id}
            accessibilityRole="button"
            accessibilityLabel={act.title}
            onPress={act.onPress}
            style={({ pressed }) => [
              styles.actionChip,
              act.accent && styles.actionChipAccent,
              pressed && styles.actionChipPressed,
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                act.accent ? styles.iconWrapAccent : styles.iconWrapDefault,
              ]}
            >
              <Icon
                name={act.icon}
                size={16}
                color={act.accent ? colors.orange : colors.navy}
                filled={act.accent}
              />
            </View>
            <Text
              style={[
                styles.actionTitle,
                act.accent && styles.actionTitleAccent,
              ]}
              numberOfLines={1}
            >
              {act.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.muted,
    textTransform: "uppercase",
  },
  scrollList: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
  },
  actionChipAccent: {
    backgroundColor: colors.orangeLight,
    borderColor: "#fed7aa",
  },
  actionChipPressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDefault: {
    backgroundColor: colors.slate100,
  },
  iconWrapAccent: {
    backgroundColor: "#ffedd5",
  },
  actionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  actionTitleAccent: {
    color: colors.navy,
  },
});
