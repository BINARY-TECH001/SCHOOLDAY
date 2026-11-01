import React, { useState } from "react";
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
  ModalSheet,
  colors,
  fonts,
  money,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { radii } from "../theme/tokens";
import { PaystackCheckoutModal } from "../components/PaystackCheckoutModal";
import { useSchool } from "../providers/AppProvider";
import { balance, total } from "../domain/model";

export function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, school, context, act, services, refresh } = useSchool();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [paystackOpen, setPaystackOpen] = useState(false);

  const invoice = id
    ? data.invoices.find((inv) => inv.id === id)
    : data.invoices[0];

  if (!invoice) {
    return (
      <View style={styles.root}>
        <TopBar
          title="Fee Invoice"
          subtitle="Record Lookup"
          back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
        />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Icon name="receipt" size={36} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>Invoice Not Found</Text>
          <Text style={styles.emptySub}>
            No tuition billing invoice matches this ID in the school records.
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

  const student = data.students.find((s) => s.id === invoice.studentId);
  const feeDue = balance(invoice);
  const totalAmount = total(invoice);
  const isPaid = feeDue === 0;

  // Matching payment if already paid
  const settledPayment = data.payments.find(
    (p) => p.invoiceIds.includes(invoice.id) && p.state === "settled"
  );

  const handlePaystackSuccess = async ({
    reference,
    channel,
    amountKobo,
  }: {
    reference: string;
    channel: "card" | "transfer" | "ussd";
    amountKobo: number;
  }) => {
    try {
      const result = await act(
        () =>
          services.pay(
            context,
            {
              amount: amountKobo,
              invoiceIds: [invoice.id],
              method: channel,
              key: reference,
              fail: false,
            },
            false,
          ),
        `Payment of ${money(amountKobo)} settled successfully via Paystack!`,
      );

      setPaystackOpen(false);
      refresh();

      if (result && result.id) {
        router.replace({ pathname: "/receipt", params: { id: result.id } });
      } else {
        router.back();
      }
    } catch {
      toast.error("Payment registration failed. Please contact school bursar.");
    }
  };

  return (
    <View style={styles.root}>
      <TopBar
        title="Fee Invoice Request"
        subtitle={`Ref: ${invoice.id}`}
        back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navy Brand Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatarWrap}>
            <Avatar name={student?.name || "Student"} size={64} />
          </View>
          <Text style={[styles.heroAmount, { color: isPaid ? colors.green : colors.white }]}>
            {money(feeDue > 0 ? feeDue : totalAmount)}
          </Text>
          <Text style={styles.heroStudentName}>
            {student?.name || "Enrolled Student"}
          </Text>
          <Text style={styles.heroMetaSub}>
            {student?.className ? `${student.className} · ` : ""}{school.name}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              tone={isPaid ? "success" : "danger"}
              text={isPaid ? "CLEARED & PAID" : "OUTSTANDING LEVY"}
              dot
            />
          </View>
        </View>

        {/* Invoice Summary Card */}
        <View style={styles.specCard}>
          <Text style={styles.specSectionTitle}>INVOICE SPECIFICATIONS</Text>

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Amount Due</Text>
            <Text style={[styles.specValBold, { color: isPaid ? colors.greenDark : colors.orange }]}>
              {money(feeDue)}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Institution</Text>
            <Text style={styles.specVal}>{school.name}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Academic Session</Text>
            <Text style={styles.specVal}>{school.term} Term</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Payment Due Date</Text>
            <Text style={styles.specVal}>{invoice.due}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specKey}>Invoice Reference</Text>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(invoice.id);
                toast.success("Invoice reference copied!");
              }}
              style={styles.copyRow}
            >
              <Text style={styles.copyVal}>{invoice.id}</Text>
              <Icon name="document" size={13} color={colors.indigo} />
            </Pressable>
          </View>
        </View>

        {/* Itemized Fee Breakdown Card */}
        <View style={styles.specCard}>
          <Text style={styles.specSectionTitle}>ITEMIZED BREAKDOWN OF FEES</Text>
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((it, idx) => (
              <React.Fragment key={idx}>
                <View style={styles.feeItemRow}>
                  <Text style={styles.feeItemLabel}>{it.label}</Text>
                  <Text style={styles.feeItemAmount}>{money(it.amount)}</Text>
                </View>
                {idx < invoice.items.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))
          ) : (
            <View style={styles.feeItemRow}>
              <Text style={styles.feeItemLabel}>Standard Term Tuition Fee</Text>
              <Text style={styles.feeItemAmount}>{money(totalAmount)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>TOTAL ASSESSMENT</Text>
            <Text style={styles.totalVal}>{money(totalAmount)}</Text>
          </View>
        </View>

        {/* Dedicated Virtual Account Wire Transfer Box (For Parents) */}
        {feeDue > 0 && (
          <View style={styles.wireCard}>
            <View style={styles.wireHeaderRow}>
              <View style={styles.wireIconTile}>
                <Icon name="card" size={16} color={colors.navy} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.wireTitle}>Direct Bank Wire (Dedicated NUBAN)</Text>
                <Text style={styles.wireSub}>Automated NIP tracking via Paystack</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy School NUBAN"
                onPress={async () => {
                  const acc = school.accountNumber || "0123456789";
                  try {
                    await Clipboard.setStringAsync(acc);
                    toast.success("School Tuition NUBAN copied!");
                  } catch {
                    toast.success(`NUBAN: ${acc}`);
                  }
                }}
                style={styles.wireCopyBtn}
              >
                <Icon name="document" size={12} color={colors.navy} />
                <Text style={styles.wireCopyText}>Copy</Text>
              </Pressable>
            </View>
            <View style={styles.wireDetailsRow}>
              <Text style={styles.wireAccNumber}>{school.accountNumber || "0123456789"}</Text>
              <Text style={styles.wireBankName}>
                {school.bankName || "Wema Bank / ALAT"} · {school.name}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsWrap}>
          {feeDue > 0 ? (
            <Button
              title="Accept & Pay Fee Online"
              icon="card"
              variant="primary"
              size="lg"
              onPress={() => setConfirmModalOpen(true)}
            />
          ) : settledPayment ? (
            <Button
              title="View Official Receipt"
              icon="receipt"
              variant="primary"
              size="lg"
              onPress={() => router.push({ pathname: "/receipt", params: { id: settledPayment.id } })}
            />
          ) : (
            <View style={styles.clearedBanner}>
              <Icon name="verify" size={20} color={colors.greenDark} filled />
              <Text style={styles.clearedText}>Tuition has been verified as cleared.</Text>
            </View>
          )}

          <Button
            title="Return to Wallet"
            variant="outline"
            size="lg"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
          />
        </View>
      </ScrollView>

      {/* Confirmation BottomSheet Prompt (Modals ONLY used for confirmation) */}
      <ModalSheet
        visible={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Fee Payment"
      >
        <View style={styles.confirmContent}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmBoxLabel}>Tuition Settlement Amount</Text>
            <Text style={styles.confirmBoxAmount}>{money(feeDue)}</Text>
            <Text style={styles.confirmBoxStudent}>
              For {student?.name || "Student"} ({student?.className})
            </Text>
          </View>

          <Text style={styles.confirmNotice}>
            You will be redirected to the secure Paystack checkout gateway to complete this settlement with card, bank transfer, or USSD.
          </Text>

          <View style={styles.confirmBtnRow}>
            <Button
              title="Cancel"
              variant="secondary"
              size="lg"
              onPress={() => setConfirmModalOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Proceed to Pay"
              variant="primary"
              size="lg"
              onPress={() => {
                setConfirmModalOpen(false);
                setPaystackOpen(true);
              }}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </ModalSheet>

      {/* Paystack Checkout Gateway Modal */}
      <PaystackCheckoutModal
        visible={paystackOpen}
        onClose={() => setPaystackOpen(false)}
        onSuccess={handlePaystackSuccess}
        amountKobo={feeDue}
        schoolName={school.name}
        studentName={student?.name || "Student"}
        invoiceTitle={invoice.items[0]?.label || "Term Tuition Fee"}
        invoiceId={invoice.id}
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
    gap: 6,
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
  heroStudentName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
    textAlign: "center",
  },
  heroMetaSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
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
  feeItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  feeItemLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.inkSecondary,
    flex: 1,
    marginRight: 8,
  },
  feeItemAmount: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.navy,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  totalKey: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  totalVal: {
    fontSize: 16,
    fontFamily: fonts.extra,
    color: colors.navy,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 6,
  },
  wireCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  wireHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wireIconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  wireTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  wireSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  wireCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  wireCopyText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  wireDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  wireAccNumber: {
    fontFamily: fonts.extra,
    fontSize: 17,
    color: colors.navy,
    letterSpacing: 1,
  },
  wireBankName: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.slate600,
  },
  clearedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.greenLight,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  clearedText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.greenDark,
  },
  confirmContent: {
    gap: 16,
    paddingVertical: 12,
  },
  confirmBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  confirmBoxLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  confirmBoxAmount: {
    fontFamily: fonts.extra,
    fontSize: 28,
    color: colors.navy,
  },
  confirmBoxStudent: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
  },
  confirmNotice: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
