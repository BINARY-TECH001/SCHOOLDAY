import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Card, ListItem } from "../../components/ui";
import { money } from "../../domain/model";

export interface FinanceHomeSectionProps {
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  pendingTransfersCount: number;
}

export function FinanceHomeSection({
  totalCollected,
  totalOutstanding,
  collectionRate,
  pendingTransfersCount,
}: FinanceHomeSectionProps) {
  return (
    <View style={styles.container}>
      {/* Treasury Metrics Grid */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>COLLECTIONS TO DATE</Text>
          <Text style={styles.metricValue}>{money(totalCollected)}</Text>
          <Text style={styles.metricHint}>{collectionRate}% of billed total</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>OUTSTANDING TUITION</Text>
          <Text
            style={[
              styles.metricValue,
              totalOutstanding > 0 && { color: colors.orange },
            ]}
          >
            {money(totalOutstanding)}
          </Text>
          <Text style={styles.metricHint}>To be reconciled</Text>
        </Card>
      </View>

      {/* Financial Operations Ledger */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Institutional Treasury</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/finance")}
          >
            <Text style={styles.sectionActionText}>Open Ledger</Text>
          </Pressable>
        </View>

        <Card style={styles.listCard}>
          <ListItem
            title="Direct Bank Transfers"
            subtitle={`${pendingTransfersCount} transfers awaiting reconciliation`}
            icon="wallet"
            badge={pendingTransfersCount > 0 ? "Action Required" : "All Settled"}
            badgeTone={pendingTransfersCount > 0 ? "warning" : "success"}
            onPress={() => router.push("/finance")}
          />
          <ListItem
            title="Tuition Billing & Invoices"
            subtitle="Manage term fee structures and invoices"
            icon="document"
            onPress={() => router.push("/fees")}
          />
          <ListItem
            title="Official Payment Receipts"
            subtitle="Browse verified payment receipts and audit trail"
            icon="receipt"
            onPress={() => router.push("/receipts")}
          />
          <ListItem
            title="Payroll Disbursements"
            subtitle="Staff salary disbursement & allowance ledger"
            icon="wallet"
            onPress={() => router.push("/payroll")}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  metricValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  metricHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  sectionActionText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.orange,
  },
  listCard: {
    padding: 0,
    paddingHorizontal: spacing.sm,
  },
});
