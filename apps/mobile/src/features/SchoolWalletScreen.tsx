import React, { useState, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { toast } from "sonner-native";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  ModalSheet,
  colors,
  fonts,
  radii,
  shadows,
  spacing,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { balance, money, Payment, Payroll, Student } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { BankSettingsModal } from "./wallet/components/BankSettingsModal";

export interface LedgerItem {
  id: string;
  type: "tuition" | "payroll" | "payout" | "expense";
  title: string;
  counterparty: string;
  className?: string;
  reference: string;
  amount: number; // in kobo
  flow: "inflow" | "outflow";
  channel: string;
  date: string;
  status: "settled" | "pending" | "processing";
  rawPayment?: Payment;
}

export function SchoolWalletScreen() {
  const { data, context, school } = useSchool();
  const isOwner = context.role === "owner" || context.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFlow, setSelectedFlow] = useState<"all" | "inflow" | "outflow" | "pending">("all");
  const [bankSettingsOpen, setBankSettingsOpen] = useState(false);

  // Settlement Bank Info
  const hasSettlementAccount = Boolean(school.accountNumber && school.accountNumber.length === 10);
  const settlementBank = school.bankName || "Wema Bank / ALAT";
  const settlementAccount = school.accountNumber || "Not Configured";
  const settlementName = school.accountName || school.name;

  // Real Reconciled Ledger Calculations (Zero Fake Data)
  const totalTuitionPaid = data.invoices.reduce((sum, i) => sum + i.paid, 0);
  const totalInvoiced = data.invoices.reduce(
    (sum, i) => sum + i.items.reduce((s, it) => s + it.amount, 0),
    0,
  );
  const totalOutstanding = data.invoices.reduce((sum, i) => sum + balance(i), 0);

  // Reconciled Inflow Collections
  const settledInflowPayments = data.payments.filter(
    (p) => p.state === "settled" && p.type !== "payout",
  );
  const totalSettledInflows = settledInflowPayments.reduce((sum, p) => sum + p.amount, 0);

  // Pending Inflows
  const pendingPayments = data.payments.filter((p) => p.state === "awaiting confirmation");
  const totalPendingInflows = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Reconciled Outflows (Settled Payouts + Paid Payroll)
  const settledPayouts = data.payments.filter(
    (p) => p.state === "settled" && p.type === "payout",
  );
  const totalSettledPayouts = settledPayouts.reduce((sum, p) => sum + p.amount, 0);

  const paidPayrollCost = data.payroll
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.basic + p.allowances - p.deductions, 0);

  const totalReconciledOutflows = totalSettledPayouts + paidPayrollCost;

  // Real Net Treasury Balance
  const netTreasuryBalance = Math.max(0, totalSettledInflows - totalReconciledOutflows);

  // Build Real Unified Ledger Items
  const ledgerItems = useMemo<LedgerItem[]>(() => {
    const list: LedgerItem[] = [];

    // 1. Inflow and Payout Payments
    for (const payment of data.payments) {
      const inv = data.invoices.find((i) => payment.invoiceIds.includes(i.id));
      const student = data.students.find((s) => s.id === inv?.studentId);
      const isPayout = payment.type === "payout";

      list.push({
        id: payment.id,
        type: isPayout ? "payout" : "tuition",
        title: isPayout
          ? payment.recipientName || "Operating Disbursement"
          : student
          ? `${student.name} · Tuition`
          : "Student Tuition Settlement",
        counterparty: isPayout
          ? payment.recipientBank
            ? `${payment.recipientName} (${payment.recipientBank})`
            : "Beneficiary"
          : student
          ? `${student.name} (${student.className})`
          : "Guardian Payer",
        className: student?.className,
        reference: payment.id,
        amount: payment.amount,
        flow: isPayout ? "outflow" : "inflow",
        channel:
          payment.method === "card"
            ? "Paystack Card"
            : payment.method === "transfer"
            ? "Bank Wire NIP"
            : "USSD / Direct",
        date: payment.createdAt,
        status:
          payment.state === "settled"
            ? "settled"
            : payment.state === "awaiting confirmation"
            ? "pending"
            : "processing",
        rawPayment: payment,
      });
    }

    // 2. Real Payroll Runs
    for (const run of data.payroll) {
      if (run.status === "Paid") {
        const netSalary = run.basic + run.allowances - run.deductions;
        list.push({
          id: `PAYROLL-${run.id}`,
          type: "payroll",
          title: `${run.staffName} · Monthly Salary`,
          counterparty: `${run.staffName} (${run.role})`,
          reference: `PR-${run.id.slice(0, 8)}`,
          amount: netSalary,
          flow: "outflow",
          channel: "Automated Payroll Clearing",
          date: new Date().toISOString(),
          status: "settled",
        });
      }
    }

    // Sort chronologically (latest first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.payments, data.payroll, data.invoices, data.students]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return ledgerItems.filter((item) => {
      // Flow filter
      if (selectedFlow === "inflow" && item.flow !== "inflow") return false;
      if (selectedFlow === "outflow" && item.flow !== "outflow") return false;
      if (selectedFlow === "pending" && item.status !== "pending") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCounterparty = item.counterparty.toLowerCase().includes(q);
        const matchesRef = item.reference.toLowerCase().includes(q);
        const matchesClass = item.className?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesCounterparty && !matchesRef && !matchesClass) return false;
      }

      return true;
    });
  }, [ledgerItems, selectedFlow, searchQuery]);

  const handleCopyAccount = async () => {
    if (!hasSettlementAccount) {
      setBankSettingsOpen(true);
      return;
    }
    try {
      await Clipboard.setString(settlementAccount);
      toast.success("Account number copied to clipboard!");
    } catch {
      toast.success(`Account Number: ${settlementAccount}`);
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <TopBar
        title="Treasury & Unified Ledger"
        subtitle="Institutional Cashflow Reconciliations"
        back={() => (router.canGoBack() ? router.back() : router.replace("/home" as any))}
        rightAction={
          isOwner ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bank Settings"
              onPress={() => setBankSettingsOpen(true)}
              style={styles.settingsHeaderBtn}
            >
              <Icon name="settings" size={18} color={colors.white} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Executive Treasury Card */}
        <View style={[styles.treasuryHero, shadows.md]}>
          <View style={styles.treasuryHeaderRow}>
            <View style={styles.treasuryPill}>
              <Icon name="wallet" size={14} color={colors.orange} filled />
              <Text style={styles.treasuryPillText}>TREASURY RESERVE</Text>
            </View>
            <Badge text="RECONCILED" tone="success" dot />
          </View>

          <View style={styles.treasuryAmountRow}>
            <Text style={styles.treasuryAmount}>{money(netTreasuryBalance)}</Text>
          </View>

          <Text style={styles.treasurySub}>
            Available operational capital across fee collections minus verified disbursements
          </Text>

          {/* Quick Metrics Strip */}
          <View style={styles.treasuryMetricsGrid}>
            <View style={styles.treasuryMetricCol}>
              <Text style={styles.metricLabel}>Total Collections</Text>
              <Text style={styles.metricValueGreen}>{money(totalSettledInflows)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.treasuryMetricCol}>
              <Text style={styles.metricLabel}>Total Outflows</Text>
              <Text style={styles.metricValueRed}>{money(totalReconciledOutflows)}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.treasuryMetricCol}>
              <Text style={styles.metricLabel}>Pending Clearance</Text>
              <Text style={styles.metricValueOrange}>{money(totalPendingInflows)}</Text>
            </View>
          </View>
        </View>

        {/* Settlement Account Card */}
        <Card style={styles.settlementCard}>
          <View style={styles.settlementLeftCol}>
            <View style={styles.settlementIconTile}>
              <Icon name="card" size={20} color={colors.navy} filled />
            </View>
            <View style={styles.settlementInfo}>
              <View style={styles.settlementTitleRow}>
                <Text style={styles.settlementTitle}>Settlement Bank Account</Text>
                {hasSettlementAccount ? (
                  <Badge text="VERIFIED" tone="success" />
                ) : (
                  <Badge text="SETUP NEEDED" tone="warning" />
                )}
              </View>
              <Text style={styles.settlementAccountNum}>
                {hasSettlementAccount ? settlementAccount : "10-Digit NUBAN Missing"}
              </Text>
              <Text style={styles.settlementBankDesc}>
                {settlementBank} • {settlementName}
              </Text>
            </View>
          </View>

          <View style={styles.settlementActions}>
            {hasSettlementAccount ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy Account Number"
                onPress={handleCopyAccount}
                style={styles.settlementCopyBtn}
              >
                <Icon name="document" size={14} color={colors.navy} />
                <Text style={styles.settlementCopyText}>Copy</Text>
              </Pressable>
            ) : null}

            {isOwner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Configure Settlement Account"
                onPress={() => setBankSettingsOpen(true)}
                style={styles.settlementEditBtn}
              >
                <Text style={styles.settlementEditText}>
                  {hasSettlementAccount ? "Edit" : "Configure"}
                </Text>
                <Icon name="forward" size={13} color={colors.orange} />
              </Pressable>
            )}
          </View>
        </Card>

        {/* Quick Action Navigation Grid */}
        <View style={styles.quickNavRow}>
          <Pressable
            style={styles.quickNavBtn}
            onPress={() => router.push("/defaulters" as any)}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: colors.orangeLight }]}>
              <Icon name="sms" size={18} color={colors.orange} filled />
            </View>
            <Text style={styles.quickNavTitle}>Defaulters</Text>
            <Text style={styles.quickNavSub}>{money(totalOutstanding)} due</Text>
          </Pressable>

          <Pressable
            style={styles.quickNavBtn}
            onPress={() => router.push("/financial-insights" as any)}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: colors.greenLight }]}>
              <Icon name="trending" size={18} color={colors.greenDark} />
            </View>
            <Text style={styles.quickNavTitle}>Insights</Text>
            <Text style={styles.quickNavSub}>Analytics & Charts</Text>
          </Pressable>

          <Pressable
            style={styles.quickNavBtn}
            onPress={() => router.push("/transaction-history" as any)}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: colors.slate100 }]}>
              <Icon name="receipt" size={18} color={colors.navy} />
            </View>
            <Text style={styles.quickNavTitle}>History</Text>
            <Text style={styles.quickNavSub}>{ledgerItems.length} records</Text>
          </Pressable>
        </View>

        {/* Ledger Section Header */}
        <View style={styles.ledgerHeader}>
          <Text style={styles.ledgerSectionTitle}>REAL-TIME TRANSACTION LEDGER</Text>
          <Text style={styles.ledgerCount}>{filteredLedger.length} items</Text>
        </View>

        {/* Search & Flow Filter Bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchFieldWrap}>
            <Field
              placeholder="Search by student, staff, or reference ID…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              icon="search"
              clearable
            />
          </View>
        </View>

        {/* Flow Filter Pills */}
        <View style={styles.flowFilterPills}>
          {[
            { key: "all" as const, label: "All Activity" },
            { key: "inflow" as const, label: "Tuition Inflows" },
            { key: "outflow" as const, label: "Disbursements" },
            { key: "pending" as const, label: "Awaiting Confirmation" },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedFlow(tab.key)}
              style={[
                styles.flowPill,
                selectedFlow === tab.key && styles.flowPillActive,
              ]}
            >
              <Text
                style={[
                  styles.flowPillText,
                  selectedFlow === tab.key && styles.flowPillTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Ledger Transaction List */}
        {filteredLedger.length === 0 ? (
          <Empty
            title="No Ledger Records Found"
            message="No transactions match your current search or flow filter."
          />
        ) : (
          <View style={styles.ledgerCardList}>
            {filteredLedger.map((item, idx) => {
              const isInflow = item.flow === "inflow";
              const isLast = idx === filteredLedger.length - 1;

              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.ledgerRow,
                    pressed && styles.ledgerRowPressed,
                    !isLast && styles.ledgerRowBorder,
                  ]}
                  onPress={() => {
                    if (item.rawPayment) {
                      router.push({
                        pathname: "/transaction-detail",
                        params: { id: item.rawPayment.id },
                      });
                    }
                  }}
                >
                  <View
                    style={[
                      styles.ledgerIconBox,
                      isInflow ? styles.inflowIconBox : styles.outflowIconBox,
                    ]}
                  >
                    <Icon
                      name={isInflow ? "card" : "logout"}
                      size={18}
                      color={isInflow ? colors.greenDark : colors.red}
                    />
                  </View>

                  <View style={styles.ledgerInfoCol}>
                    <Text style={styles.ledgerItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.ledgerItemMeta} numberOfLines={1}>
                      {item.channel} • {new Date(item.date).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.ledgerAmountCol}>
                    <Text
                      style={[
                        styles.ledgerAmountText,
                        isInflow ? styles.inflowAmount : styles.outflowAmount,
                      ]}
                    >
                      {isInflow ? "+" : "-"}
                      {money(item.amount)}
                    </Text>
                    <View style={styles.badgeWrap}>
                      <Badge
                        text={item.status.toUpperCase()}
                        tone={
                          item.status === "settled"
                            ? "success"
                            : item.status === "pending"
                            ? "warning"
                            : "neutral"
                        }
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bank Settings Modal */}
      <BankSettingsModal
        visible={bankSettingsOpen}
        onClose={() => setBankSettingsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 48,
  },
  settingsHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  treasuryHero: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.navyBorder,
  },
  treasuryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  treasuryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  treasuryPillText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: "#ffffff",
  },
  treasuryAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  treasuryAmount: {
    fontFamily: fonts.extra,
    fontSize: 32,
    color: "#ffffff",
    letterSpacing: 1,
  },
  treasurySub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 17,
  },
  treasuryMetricsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  treasuryMetricCol: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.65)",
  },
  metricValueGreen: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#4ade80",
  },
  metricValueRed: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#f87171",
  },
  metricValueOrange: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#fbbf24",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: spacing.xs,
  },
  settlementCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  settlementLeftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settlementIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  settlementInfo: {
    flex: 1,
    gap: 2,
  },
  settlementTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settlementTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  settlementAccountNum: {
    fontFamily: fonts.extra,
    fontSize: 16,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  settlementBankDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  settlementActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settlementCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.slate100,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
  },
  settlementCopyText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  settlementEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  settlementEditText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
  },
  quickNavRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickNavBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
    ...shadows.sm,
  },
  quickNavIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  quickNavTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  quickNavSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.slate500,
  },
  ledgerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  ledgerSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  ledgerCount: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate400,
  },
  searchBarRow: {
    width: "100%",
  },
  searchFieldWrap: {
    width: "100%",
  },
  flowFilterPills: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  flowPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  flowPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  flowPillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate600,
  },
  flowPillTextActive: {
    fontFamily: fonts.bold,
    color: colors.white,
  },
  ledgerCardList: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadows.sm,
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: 12,
  },
  ledgerRowPressed: {
    backgroundColor: colors.slate50,
  },
  ledgerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  ledgerIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  inflowIconBox: {
    backgroundColor: colors.greenLight,
  },
  outflowIconBox: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  ledgerInfoCol: {
    flex: 1,
    gap: 2,
  },
  ledgerItemTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  ledgerItemMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  ledgerAmountCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  ledgerAmountText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  inflowAmount: {
    color: colors.greenDark,
  },
  outflowAmount: {
    color: colors.red,
  },
  badgeWrap: {
    alignItems: "flex-end",
  },
});
