import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Icon, IconName } from "../../components/Icon";

import { useSchool } from "../../providers/AppProvider";
import { can } from "../../domain/model";

export interface WalletActionItem {
  id: string;
  label: string;
  icon: IconName;
  route: string;
  badgeCount?: number;
}

export function WalletActions({ isParent }: { isParent: boolean }) {
  const { data, context } = useSchool();
  const currentStaff = data.staff.find((s) => s.userId === context.userId);
  const isOwnerOrAdmin = context.role === "owner" || context.role === "admin";
  const hasDisbursePermission =
    isOwnerOrAdmin ||
    can(context.role, "finance") ||
    currentStaff?.permissions?.includes("disburse") ||
    currentStaff?.permissions?.includes("payroll");

  const actions: WalletActionItem[] = isParent
    ? [
        {
          id: "pay",
          label: "Pay Fees",
          icon: "wallet",
          route: "/fees",
        },
        {
          id: "transfer",
          label: "Bank Wire",
          icon: "card",
          route: "/dedicated-account",
        },
        {
          id: "receipts",
          label: "Receipts",
          icon: "receipt",
          route: "/receipts",
        },
        {
          id: "history",
          label: "History",
          icon: "clock",
          route: "/transaction-history",
        },
      ]
    : [
        ...(hasDisbursePermission
          ? [
              {
                id: "disburse",
                label: "Disburse",
                icon: "send" as const,
                route: "/disburse",
              },
            ]
          : []),
        {
          id: "defaulters",
          label: "Defaulters",
          icon: "sms",
          route: "/defaulters",
        },
        {
          id: "nuban",
          label: "NUBAN",
          icon: "card",
          route: "/dedicated-account",
        },
        {
          id: "settlement",
          label: "Settlement",
          icon: "verify",
          route: "/settlement-settings",
        },
        {
          id: "insights",
          label: "Insights",
          icon: "chart",
          route: "/financial-insights",
        },
      ];

  return (
    <View style={styles.container}>
      {actions.map((act) => (
        <Pressable
          key={act.id}
          accessibilityRole="button"
          accessibilityLabel={act.label}
          onPress={() => router.push(act.route as any)}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <View style={styles.iconCircle}>
            <Icon name={act.icon} size={18} color={colors.navy} />
            {act.badgeCount && act.badgeCount > 0 ? (
              <View style={styles.badgeDot} />
            ) : null}
          </View>
          <Text style={styles.actionLabel} numberOfLines={1}>
            {act.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  actionLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.navy,
    textAlign: "center",
  },
});
