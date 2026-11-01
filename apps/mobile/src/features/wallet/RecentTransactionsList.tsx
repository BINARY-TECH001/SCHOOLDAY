import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Card, EmptyState } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { money, Payment, Student, Invoice } from "../../domain/model";

export interface RecentTransactionsListProps {
  payments: Payment[];
  students: Student[];
  invoices: Invoice[];
  limit?: number;
}

export function RecentTransactionsList({
  payments,
  students,
  invoices,
  limit = 5,
}: RecentTransactionsListProps) {
  const recentPayments = payments
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all transaction history"
          onPress={() => router.push("/transaction-history")}
        >
          <Text style={styles.sectionActionText}>See All</Text>
        </Pressable>
      </View>

      {recentPayments.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            title="No Transactions Yet"
            subtitle="Verified payment receipts and disbursement settlements will appear here."
            icon="receipt"
          />
        </Card>
      ) : (
        <Card style={styles.listCard}>
          {recentPayments.map((p, idx) => {
            const isPayout = p.type === "payout";
            const inv = invoices.find((i) => p.invoiceIds.includes(i.id));
            const stud = students.find((s) => s.id === inv?.studentId);

            const title =
              p.recipientName ||
              (stud ? `${stud.name} (${stud.className})` : "Tuition Fee Settlement");

            const subtitle = `${
              isPayout
                ? "Treasury Disbursement"
                : p.method === "card"
                ? "Online Card Payment"
                : "Direct Bank Wire"
            } · ${new Date(p.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}`;

            const isLast = idx === recentPayments.length - 1;

            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`View details for ${title}`}
                onPress={() =>
                  router.push({
                    pathname: "/transaction-detail",
                    params: { id: p.id },
                  })
                }
                style={({ pressed }) => [
                  styles.itemRow,
                  pressed && styles.itemRowPressed,
                  !isLast && styles.itemBorderBottom,
                ]}
              >
                <View
                  style={[
                    styles.directionIconBox,
                    isPayout
                      ? styles.directionOutflow
                      : styles.directionInflow,
                  ]}
                >
                  <Icon
                    name={isPayout ? "logout" : "card"}
                    size={18}
                    color={isPayout ? colors.red : colors.greenDark}
                  />
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.itemSub} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>

                <View style={styles.amountCol}>
                  <Text
                    style={[
                      styles.amountText,
                      isPayout ? styles.amountOutflow : styles.amountInflow,
                    ]}
                  >
                    {isPayout ? `-${money(p.amount)}` : `+${money(p.amount)}`}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      p.state === "settled" ? styles.statusSettled : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        p.state === "settled" ? styles.statusSettledText : styles.statusPendingText,
                      ]}
                    >
                      {p.state === "settled" ? "Settled" : "Pending"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
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
  emptyCard: {
    padding: spacing.md,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemRowPressed: {
    backgroundColor: colors.slate100,
  },
  itemBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  directionIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  directionInflow: {
    backgroundColor: colors.greenLight,
  },
  directionOutflow: {
    backgroundColor: "#fef2f2",
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  itemSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  amountCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  amountText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  amountInflow: {
    color: colors.greenDark,
  },
  amountOutflow: {
    color: colors.red,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusSettled: {
    backgroundColor: colors.greenLight,
  },
  statusPending: {
    backgroundColor: colors.orangeLight,
  },
  statusPillText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  statusSettledText: {
    color: colors.greenDark,
  },
  statusPendingText: {
    color: colors.orange,
  },
});
