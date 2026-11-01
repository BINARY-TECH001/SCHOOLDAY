import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Avatar, Badge } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { roleLabels } from "../../Entry";
import { Role } from "../../../domain/model";

export interface ProfileHeaderProps {
  name: string;
  avatarUri?: string | null;
  role: Role;
  schoolName: string;
  identifier?: string; // Permanent Staff ID or Student Matriculation ID
  rankOrTitle?: string;
  isSelf?: boolean;
  onEditAvatar?: () => void;
}

export function ProfileHeader({
  name,
  avatarUri,
  role,
  schoolName,
  identifier,
  rankOrTitle,
  isSelf = false,
  onEditAvatar,
}: ProfileHeaderProps) {
  return (
    <View style={[styles.headerCard, shadows.sm]}>
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          <Avatar
            uri={avatarUri}
            name={name}
            size={76}
            role={role}
          />
          {isSelf && onEditAvatar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile avatar"
              onPress={onEditAvatar}
              style={styles.avatarEditBadge}
            >
              <Icon name="camera" size={13} color="#ffffff" filled />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.nameText} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.schoolLabel} numberOfLines={1}>
            {schoolName}
          </Text>

          <View style={styles.badgesRow}>
            <Badge text={roleLabels[role] || role} tone="purple" size="sm" />
            {rankOrTitle ? (
              <Badge text={rankOrTitle} tone="neutral" size="sm" />
            ) : null}
            <Badge text="VERIFIED" tone="success" size="sm" dot />
          </View>
        </View>
      </View>

      {identifier ? (
        <View style={styles.identifierBox}>
          <Text style={styles.identifierLabel}>Permanent Identifier:</Text>
          <Text style={styles.identifierValue}>{identifier}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  nameText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  schoolLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  identifierBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identifierLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  identifierValue: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
    letterSpacing: 0.5,
  },
});
