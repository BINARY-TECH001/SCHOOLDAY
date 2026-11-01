import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Badge, Card } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { money, Payroll } from "../../../domain/model";

export interface StaffPayrollSectionProps {
  payroll?: Payroll;
  isOwnerOrAdmin: boolean;
  onOpenUpdateSalary: () => void;
}

export function StaffPayrollSection({
  payroll,
  isOwnerOrAdmin,
  onOpenUpdateSalary,
}: StaffPayrollSectionProps) {
  if (!isOwnerOrAdmin) {
    return (
      <Card style={styles.restrictedCard}>
        <Icon name="lock" size={24} color={colors.muted} />
        <Text style={styles.restrictedTitle}>Access Restricted</Text>
        <Text style={styles.restrictedText}>
          Employment contracts, salary basis, and compensation records are strictly confidential and restricted to school executive administration.
        </Text>
      </Card>
    );
  }

  const basic = payroll ? payroll.basic : 18000000;
  const allowances = payroll ? payroll.allowances : 2500000;
  const deductions = payroll ? payroll.deductions : 1500000;
  const net = Math.max(0, basic + allowances - deductions);
  const status = payroll ? payroll.status : "Draft";
  const period = payroll ? payroll.period : "Current Session";

  return (
    <View style={styles.container}>
      <Card style={styles.salaryCard}>
        <View style={styles.salaryTopRow}>
          <View style={styles.salaryHeaderCol}>
            <Text style={styles.sectionHeader}>AUTHORIZED EMPLOYMENT STRUCTURE</Text>
            <Text style={styles.netAmount}>{money(net)}</Text>
            <Text style={styles.netLabel}>Estimated Net Monthly Payout</Text>
          </View>

          <Badge
            tone={status === "Paid" ? "success" : status === "Approved" ? "purple" : "neutral"}
            text={`Period: ${status.toUpperCase()}`}
            size="sm"
          />
        </View>

        {/* Breakdown Grid */}
        <View style={styles.breakdownGrid}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Basic Salary</Text>
            <Text style={styles.breakdownVal}>{money(basic)}</Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Approved Allowances</Text>
            <Text style={[styles.breakdownVal, { color: colors.green }]}>
              + {money(allowances)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Statutory Deductions</Text>
            <Text style={[styles.breakdownVal, { color: colors.danger }]}>
              - {money(deductions)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Billing Cycle</Text>
            <Text style={styles.breakdownVal}>{period}</Text>
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Update salary and allowances"
          style={({ pressed }) => [
            styles.updateBtn,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onOpenUpdateSalary}
        >
          <Icon name="edit" size={15} color={colors.navy} />
          <Text style={styles.updateBtnText}>Configure Compensation & Policy</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  restrictedCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
  },
  restrictedTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  restrictedText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  salaryCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  salaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  salaryHeaderCol: {
    gap: 3,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  netAmount: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.navy,
    letterSpacing: -0.5,
  },
  netLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  breakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
  },
  breakdownItem: {
    width: "48%",
    gap: 2,
  },
  breakdownLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  breakdownVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  updateBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
});
