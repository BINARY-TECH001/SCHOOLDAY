import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../theme/tokens";
import { Icon } from "../components/Icon";
import { WalletSkeleton } from "../components/WalletSkeleton";
import { balance, can, money, Invoice, Student } from "../domain/model";
import { useSchool } from "../providers/AppProvider";

// Wallet Sub-components
import { WalletBalanceCard } from "./wallet/WalletBalanceCard";
import { WalletActions } from "./wallet/WalletActions";
import { ParentChildrenFeeList } from "./wallet/ParentChildrenFeeList";
import { RecentTransactionsList } from "./wallet/RecentTransactionsList";

export function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { data, context, school, ready, refresh } = useSchool();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnerOrFinance =
    context.role === "owner" ||
    context.role === "admin" ||
    can(context.role, "finance");
  const isParent = context.role === "parent";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      refresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  if (!ready) {
    return <WalletSkeleton />;
  }

  // Real Treasury Calculations (Strictly scoped by role to avoid data leakage)
  const totalCollected = isOwnerOrFinance
    ? data.payments
        .filter((p) => p.state === "settled" && p.type !== "payout")
        .reduce((sum, p) => sum + p.amount, 0)
    : 0;

  const totalDisbursed = isOwnerOrFinance
    ? data.payments
        .filter((p) => p.state === "settled" && p.type === "payout")
        .reduce((sum, p) => sum + p.amount, 0)
    : data.payments
        .filter((p) => p.userId === context.userId && p.state === "settled")
        .reduce((sum, p) => sum + p.amount, 0);

  const availableBalanceKobo = isOwnerOrFinance
    ? Math.max(0, totalCollected - totalDisbursed)
    : totalDisbursed;

  // Real Defaulters Aggregation for school finance/owner
  const totalUnpaidInvoices = isOwnerOrFinance
    ? data.invoices.filter((inv) => balance(inv) > 0)
    : [];
  const totalUnpaidKobo = totalUnpaidInvoices.reduce((sum, inv) => sum + balance(inv), 0);
  const indebtedStudentCount = new Set(totalUnpaidInvoices.map((inv) => inv.studentId)).size;

  // Real Parent Calculations
  const parentChildren: Student[] = isParent
    ? data.students.filter(
        (s) =>
          s.guardianId === context.userId || s.schoolId === context.schoolId,
      )
    : [];

  const parentInvoices: Invoice[] = isParent
    ? data.invoices.filter((inv) =>
        parentChildren.some((child) => child.id === inv.studentId),
      )
    : [];

  const parentTotalDue = parentInvoices.reduce(
    (sum, inv) => sum + balance(inv),
    0,
  );
  const parentTotalPaid = parentInvoices.reduce(
    (sum, inv) => sum + inv.paid,
    0,
  );

  // Scoped transactions list (prevents leaking school-wide payments to unprivileged staff or parents)
  const scopedPayments = isOwnerOrFinance
    ? data.payments
    : isParent
    ? data.payments.filter(
        (p) =>
          p.userId === context.userId ||
          p.invoiceIds.some((invId) => parentInvoices.some((inv) => inv.id === invId))
      )
    : data.payments.filter((p) => p.userId === context.userId);

  return (
    <View style={styles.root}>
      {/* Fixed Top Bar */}
      <View
        style={[
          styles.topBar,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <View style={styles.topBarTitleGroup}>
          <Text style={styles.topBarTitle}>
            {isParent ? "Tuition & Fees" : isOwnerOrFinance ? "Treasury Wallet" : "Staff Wallet"}
          </Text>
          <Text style={styles.topBarSubtitle}>
            {school.name || "SchoolDay Financial Center"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Payment Receipts"
          onPress={() => router.push("/receipts")}
          style={({ pressed }) => [
            styles.receiptBtn,
            pressed && { backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Icon name="receipt" size={19} color={colors.navy} />
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.orange}
            colors={[colors.orange, colors.navy]}
          />
        }
      >
        {/* Balance Card */}
        <WalletBalanceCard
          isParent={isParent}
          isOwnerOrFinance={isOwnerOrFinance}
          availableBalanceKobo={availableBalanceKobo}
          totalCollectedKobo={totalCollected}
          totalDisbursedKobo={totalDisbursed}
          parentTotalDueKobo={parentTotalDue}
          parentTotalPaidKobo={parentTotalPaid}
          visible={balanceVisible}
          onToggleVisible={() => setBalanceVisible((v) => !v)}
        />

        {/* Action Buttons */}
        <WalletActions isParent={isParent} />

        {/* Defaulters Recovery Alert Banner */}
        {isOwnerOrFinance && totalUnpaidKobo > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Fee Defaulters"
            onPress={() => router.push("/defaulters")}
            style={({ pressed }) => [
              styles.defaultersBanner,
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={styles.defaultersBannerLeft}>
              <View style={styles.defaultersIconWrap}>
                <Icon name="sms" size={18} color={colors.orange} />
              </View>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.defaultersBannerTitle}>
                  Fee Defaulters & Reminders
                </Text>
                <Text style={styles.defaultersBannerSub}>
                  {indebtedStudentCount} students owe {money(totalUnpaidKobo)} in unpaid fees
                </Text>
              </View>
            </View>
            <Icon name="chevron" size={16} color={colors.navy} />
          </Pressable>
        )}

        {/* Parent Linked Children Fee Invoices */}
        {isParent && (
          <ParentChildrenFeeList
            childrenList={parentChildren}
            invoices={parentInvoices}
          />
        )}

        {/* Recent Transactions List */}
        <RecentTransactionsList
          payments={scopedPayments}
          students={data.students}
          invoices={data.invoices}
          limit={5}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarTitleGroup: {
    gap: 2,
  },
  topBarTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  receiptBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 120,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  defaultersBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  defaultersBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  defaultersIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultersBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  defaultersBannerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
});
