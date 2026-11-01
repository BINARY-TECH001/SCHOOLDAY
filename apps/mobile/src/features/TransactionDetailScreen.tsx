import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { toast } from "sonner-native";
import {
  Avatar,
  Badge,
  Button,
  colors,
  fonts,
  money,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";

export function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, school } = useSchool();

  // Strict payment lookup by id or key. Zero mock fallbacks.
  const payment = id
    ? data.payments.find((p) => p.id === id || p.key === id)
    : undefined;

  if (!payment) {
    return (
      <View style={styles.root}>
        <TopBar
          title="Transaction Details"
          subtitle="Record Lookup"
          back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
        />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Icon name="receipt" size={36} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>Transaction Not Found</Text>
          <Text style={styles.emptySub}>
            No treasury or settlement record matches this ID in the ledger.
          </Text>
          <Button
            title="Return to Wallet"
            variant="primary"
            size="md"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
          />
        </View>
      </View>
    );
  }

  const isIncome = payment.type !== "payout";
  let counterparty = payment.recipientName || (isIncome ? "School Tuition Settlement" : "Faculty Staff Member");
  const inv = data.invoices.find((i) => payment.invoiceIds.includes(i.id));
  const stud = data.students.find((s) => s.id === inv?.studentId);
  if (stud) {
    counterparty = `${stud.name} (${stud.className})`;
  }

  const dateFormatted = new Date(payment.createdAt).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <TopBar
        title={isIncome ? "Payment Received" : "Disbursement Sent"}
        subtitle={`Ref: ${payment.id}`}
        back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navy Brand Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatarWrap}>
            <Avatar name={counterparty} size={64} />
          </View>
          <Text style={[styles.heroAmount, { color: isIncome ? colors.green : colors.white }]}>
            {isIncome ? "+ " : "- "}
            {money(payment.amount)}
          </Text>
          <Text style={styles.heroCounterparty} numberOfLines={1}>
            {counterparty}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              tone={payment.state === "settled" ? "success" : "warning"}
              text={payment.state === "settled" ? "SETTLED" : "AWAITING CONFIRMATION"}
              dot
            />
          </View>
        </View>

        {/* Specifications Table */}
        <View style={styles.specCard}>
          <Text style={styles.specSectionTitle}>TRANSACTION SPECIFICATIONS</Text>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>
              {isIncome ? "Amount Received" : "Amount Disbursed"}
            </Text>
            <Text style={styles.specValBold}>{money(payment.amount)}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>{isIncome ? "From / Payer" : "Beneficiary"}</Text>
            <Text style={styles.specVal}>{counterparty}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Payment Method</Text>
            <Text style={styles.specVal}>
              {payment.method === "card"
                ? "Paystack Card Gateway"
                : payment.method === "transfer"
                ? "Dedicated NUBAN Transfer"
                : payment.method === "ussd"
                ? "Instant USSD"
                : "Internal Ledger"}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Date & Time</Text>
            <Text style={styles.specVal}>{dateFormatted}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Transaction ID</Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(payment.id);
                toast.success("Transaction ID copied!");
              }}
              style={styles.copyRow}
            >
              <Text style={styles.copyVal}>{payment.id}</Text>
              <Icon name="document" size={13} color={colors.indigo} />
            </Pressable>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Reference Key</Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(payment.key);
                toast.success("Reference Key copied!");
              }}
              style={styles.copyRow}
            >
              <Text style={styles.copyVal}>{payment.key}</Text>
              <Icon name="document" size={13} color={colors.indigo} />
            </Pressable>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Notes / Purpose</Text>
            <Text style={styles.specVal} numberOfLines={2}>
              {payment.note || (isIncome ? "Tuition & Student Operations" : "Staff Payroll Disburse")}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsWrap}>
          <Button
            title="View Official Receipt"
            icon="receipt"
            variant="primary"
            size="lg"
            onPress={() => router.push({ pathname: "/receipt", params: { id: payment.id } })}
          />

          <Button
            title="Return to Wallet"
            variant="outline"
            size="lg"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 48,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 8,
    ...shadows.md,
  },
  heroAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: fonts.extra,
    fontSize: 32,
    letterSpacing: -0.5,
  },
  heroCounterparty: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.white,
    textAlign: "center",
  },
  badgeRow: {
    marginTop: 4,
  },
  specCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
    ...shadows.sm,
  },
  specSectionTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.faint,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  specKey: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  specVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
    maxWidth: "60%",
    textAlign: "right",
  },
  specValBold: {
    fontFamily: fonts.extra,
    fontSize: 14,
    color: colors.navy,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.indigo,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 6,
  },
});
