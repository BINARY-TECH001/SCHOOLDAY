import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Icon } from "../../../components/Icon";

export interface VisibilityGateProps {
  allowed: boolean;
  children: React.ReactNode;
  reason?: string;
}

export function VisibilityGate({
  allowed,
  children,
  reason = "This information is restricted to authorized school administrators and guardians.",
}: VisibilityGateProps) {
  if (allowed) {
    return <>{children}</>;
  }

  return (
    <View style={styles.restrictedNotice}>
      <Icon name="lock" size={16} color={colors.muted} />
      <Text style={styles.restrictedText}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  restrictedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 4,
  },
  restrictedText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
});
