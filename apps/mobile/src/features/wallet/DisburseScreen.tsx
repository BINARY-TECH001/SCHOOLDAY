import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import {
  Button,
  Card,
  ConfirmationDialog,
  Field,
  Screen,
} from "../../components/ui";
import { Icon } from "../../components/Icon";
import { money } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";
import { deviceStorage } from "../../storage/device";

export function DisburseScreen() {
  const { data, context, services, act, refresh, busy } = useSchool();

  // Real Treasury Balance
  const totalCollected = data.payments
    .filter((p) => p.state === "settled" && p.type !== "payout")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDisbursed = data.payments
    .filter((p) => p.state === "settled" && p.type === "payout")
    .reduce((sum, p) => sum + p.amount, 0);

  const availableBalanceKobo = Math.max(0, totalCollected - totalDisbursed);

  // Form State
  const [recipient, setRecipient] = useState(
    data.staff[0]?.name || "Faculty Staff Member",
  );
  const [amountNaira, setAmountNaira] = useState("");
  const [note, setNote] = useState("Staff Monthly Salary Allowance");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinAttempt, setPinAttempt] = useState("");

  const cleanNum = parseInt(amountNaira.replace(/[^0-9]/g, ""), 10) || 0;
  const amountKobo = cleanNum * 100;

  const handleOpenReview = () => {
    if (cleanNum <= 0) {
      toast.error("Please enter a valid disbursement amount.");
      return;
    }
    if (availableBalanceKobo <= 0) {
      toast.error("Zero Treasury Balance", {
        description: "You cannot disburse funds when your balance is ₦0.00. Settled tuition inflows are required.",
      });
      return;
    }
    if (amountKobo > availableBalanceKobo) {
      toast.error("Insufficient Treasury Balance", {
        description: `Disbursement amount (${money(amountKobo)}) exceeds available treasury balance (${money(availableBalanceKobo)}).`,
      });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmDisbursement = async () => {
    setConfirmOpen(false);
    const savedPin = await deviceStorage.read(`schoolday.withdrawal_pin.${context.schoolId}`);
    if (savedPin) {
      setPinModalOpen(true);
    } else {
      await handleExecuteDisbursement();
    }
  };

  const handleVerifyPinAndExecute = async () => {
    const savedPin = await deviceStorage.read(`schoolday.withdrawal_pin.${context.schoolId}`);
    if (savedPin && pinAttempt !== savedPin) {
      toast.error("Incorrect Withdrawal Security PIN", {
        description: "The 4-digit security PIN entered does not match your school records.",
      });
      return;
    }
    setPinModalOpen(false);
    setPinAttempt("");
    await handleExecuteDisbursement();
  };

  const handleExecuteDisbursement = async () => {
    try {
      await act(
        () =>
          services.disburse(context, {
            amount: amountKobo,
            recipientName: recipient.trim() || "Faculty Staff Member",
            note: note.trim() || "Treasury Disburse",
          }),
        `Successfully disbursed ${money(amountKobo)} to ${recipient}!`,
      );
      setConfirmOpen(false);
      refresh();
      router.back();
    } catch (e: any) {
      toast.error(e?.message || "Failed to process disbursement.");
    }
  };

  return (
    <Screen
      title="Disburse Funds"
      subtitle="Institutional Treasury Outflow"
      back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
    >
      <View style={styles.content}>
        {/* Available Treasury Card */}
        <Card style={styles.treasuryCard}>
          <Text style={styles.treasuryLabel}>AVAILABLE TREASURY BALANCE</Text>
          <Text style={styles.treasuryAmount}>{money(availableBalanceKobo)}</Text>
          <Text style={styles.treasuryHint}>
            Funds available for staff payroll, allowances, and campus operations
          </Text>
        </Card>

        {/* Input Form */}
        <Card style={styles.formCard}>
          <Field
            label="Recipient Full Name"
            placeholder="e.g. Adebayo Ogunlesi"
            value={recipient}
            onChangeText={setRecipient}
            icon="profile"
          />

          {/* Quick Staff Suggestion Chips */}
          {data.staff.length > 0 && (
            <View style={styles.staffChipsWrap}>
              <Text style={styles.chipsLabel}>Suggested Staff Members:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {data.staff.slice(0, 5).map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setRecipient(s.name)}
                    style={[
                      styles.staffChip,
                      recipient === s.name && styles.staffChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.staffChipText,
                        recipient === s.name && styles.staffChipTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Field
            label="Amount (₦)"
            placeholder="e.g. 50,000"
            value={amountNaira}
            onChangeText={setAmountNaira}
            numeric
            icon="wallet"
            hint={
              cleanNum > 0
                ? `Total to debit: ${money(amountKobo)}`
                : undefined
            }
          />

          <Field
            label="Disbursement Purpose / Narration"
            placeholder="e.g. Maintenance expense or salary"
            value={note}
            onChangeText={setNote}
            icon="document"
          />
        </Card>

        {/* Zero Balance Warning */}
        {availableBalanceKobo <= 0 && (
          <Card style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="close" size={18} color={colors.red} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.red }}>
                Treasury Balance is ₦0.00
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.slate700, marginTop: 4 }}>
              Disbursements cannot be executed until tuition fees are received into the institutional collection account.
            </Text>
          </Card>
        )}

        {/* Action Button */}
        <Button
          title={
            availableBalanceKobo <= 0
              ? "Zero Treasury Balance"
              : amountKobo > availableBalanceKobo
              ? "Exceeds Available Balance"
              : `Review Disbursement · ${money(amountKobo)}`
          }
          variant="primary"
          size="lg"
          disabled={cleanNum <= 0 || availableBalanceKobo <= 0 || amountKobo > availableBalanceKobo}
          onPress={handleOpenReview}
        />
      </View>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={confirmOpen}
        title="Confirm Disbursement"
        message={`Are you sure you want to disburse ${money(
          amountKobo,
        )} from the school treasury to ${recipient}? This transaction will be recorded on the official ledger.`}
        confirmText="Proceed to Authorize"
        cancelText="Cancel"
        onConfirm={handleConfirmDisbursement}
        onCancel={() => setConfirmOpen(false)}
        loading={busy}
      />

      {/* Withdrawal Security PIN Authorization Modal */}
      <Modal
        visible={pinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.pinModalCard}>
            <View style={styles.pinModalHeader}>
              <View style={styles.iconBoxAmber}>
                <Icon name="lock" size={20} color={colors.amberDark} filled />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pinModalTitle}>Enter Withdrawal PIN</Text>
                <Text style={styles.pinModalSub}>
                  Enter your 4-digit security PIN to authorize {money(amountKobo)} disbursement.
                </Text>
              </View>
            </View>

            <View style={{ marginVertical: 14 }}>
              <TextInput
                style={styles.pinTextInput}
                value={pinAttempt}
                onChangeText={(t) => setPinAttempt(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="numeric"
                secureTextEntry
                placeholder="••••"
                placeholderTextColor={colors.slate400}
                autoFocus
                maxLength={6}
              />
            </View>

            <View style={styles.pinModalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => {
                  setPinModalOpen(false);
                  setPinAttempt("");
                }}
              />
              <Button
                title="Authorize Payout"
                variant="primary"
                size="md"
                disabled={pinAttempt.length < 4 || busy}
                onPress={handleVerifyPinAndExecute}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  treasuryCard: {
    backgroundColor: colors.navy,
    padding: spacing.md,
    gap: 4,
    borderRadius: radii.lg,
  },
  treasuryLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: "rgba(255, 255, 255, 0.7)",
  },
  treasuryAmount: {
    fontFamily: fonts.extra,
    fontSize: 24,
    color: "#ffffff",
    letterSpacing: -0.4,
  },
  treasuryHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
  },
  formCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  staffChipsWrap: {
    gap: 6,
  },
  chipsLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  chipsScroll: {
    gap: 8,
  },
  staffChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffChipActive: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orange,
  },
  staffChipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.navy,
  },
  staffChipTextActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  pinModalCard: {
    width: "100%",
    maxWidth: 380,
    padding: spacing.lg,
    borderRadius: radii.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  pinModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBoxAmber: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  pinModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  pinModalSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
  },
  pinTextInput: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 10,
    color: colors.navy,
    textAlign: "center",
  },
  pinModalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
});
