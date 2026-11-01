import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Icon } from "../../components/Icon";
import { Avatar } from "../../components/ui";

export interface HomeHeaderProps {
  firstName: string;
  avatarUri?: string | null;
  role: string;
  term?: string;
  unreadNoticesCount: number;
  topInset: number;
}

export function HomeHeader({
  firstName,
  avatarUri,
  role,
  term,
  unreadNoticesCount,
  topInset,
}: HomeHeaderProps) {
  return (
    <View style={[styles.container, { paddingTop: Math.max(topInset, 12) }]}>
      <View style={styles.leftSection}>
        <Text style={styles.greetingTitle}>Hi, {firstName} 👋</Text>
        <View style={styles.statusIndicatorRow}>
          <View style={styles.livePulseDot} />
          <Text style={styles.statusIndicatorText}>
            Campus Active · {term || "Academic Session"}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Calendar Shortcut */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Academic Calendar"
          onPress={() => router.push("/calendar" as any)}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && { backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Icon name="calendar" size={19} color={colors.navy} />
        </Pressable>

        {/* Notifications with Unread Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Campus Notifications"
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && { backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Icon name="notification" size={19} color={colors.navy} />
          {unreadNoticesCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadNoticesCount > 9 ? "9+" : unreadNoticesCount}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Profile Avatar Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Profile & Settings"
          onPress={() => router.push("/more")}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Avatar
            uri={avatarUri}
            name={firstName}
            size={36}
            role={role}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSection: {
    flex: 1,
    gap: 3,
  },
  greetingTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  statusIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.green,
  },
  statusIndicatorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  unreadBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: "#ffffff",
  },
  avatarButton: {
    marginLeft: 2,
  },
});
