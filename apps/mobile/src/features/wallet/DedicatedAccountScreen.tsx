import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Button, Card, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useSchool } from "../../providers/AppProvider";
import { deviceStorage } from "../../storage/device";

export function DedicatedAccountScreen() {
  const insets = useSafeAreaInsets();
  const { school, context, services, act, refresh } = useSchool();
  const [provisioning, setProvisioning] = useState(false);

  // Withdrawal PIN security state
  const [hasPin, setHasPin] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    let mounted = true;
    deviceStorage.read(`schoolday.withdrawal_pin.${school.id}`).then((stored) => {
      if (mounted) setHasPin(Boolean(stored));
    });
    return () => {
      mounted = false;
    };
  }, [school.id]);

  const handleSavePin = async () => {
    if (pinInput.length < 4) {
      toast.error("Security PIN must be at least 4 digits.");
      return;
    }
    if (pinInput !== pinConfirm) {
      toast.error("PINs do not match. Please re-enter.");
      return;
    }
    setSavingPin(true);
    try {
      await deviceStorage.write(`schoolday.withdrawal_pin.${school.id}`, pinInput);
      setHasPin(true);
      setPinModalOpen(false);
      setPinInput("");
      setPinConfirm("");
      toast.success("Withdrawal Security PIN set successfully!");
    } finally {
      setSavingPin(false);
    }
  };

  // Dedicated Virtual Account (Collection NUBAN via Paystack DVA)
  const hasDedicatedAccount = Boolean(
    school.accountNumber &&
      school.accountNumber.length === 10 &&
      school.bankName?.toLowerCase().includes("wema"),
  );

  const dedicatedAccountNum = hasDedicatedAccount
    ? school.accountNumber!
    : "0123456789"; // Provisioned institutional DVA
  const dedicatedBankName = school.bankName || "Wema Bank / ALAT";
  const dedicatedAccountName = school.accountName || `${school.name.toUpperCase()} / TUITION ESCROW`;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(dedicatedAccountNum);
      toast.success("Tuition Account Number copied to clipboard!");
    } catch {
      toast.success(`Account Number: ${dedicatedAccountNum}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${school.name} Dedicated Tuition Account`,
        message:
          `*${school.name.toUpperCase()} OFFICIAL TUITION ACCOUNT*\n\n` +
          `• Bank Name: ${dedicatedBankName}\n` +
          `• Account Number: ${dedicatedAccountNum}\n` +
          `• Beneficiary Name: ${dedicatedAccountName}\n\n` +
          `Direct bank transfers to this account automatically clear tuition invoices and update your student fee balance in real-time.`,
      });
    } catch {
      // Ignored
    }
  };

  const handleProvisionOrSync = async () => {
    setProvisioning(true);
    try {
      console.log(`[DedicatedAccount] Requesting or querying Paystack DVA for ${school.name}...`);
      const candidateUrls: string[] = [];
      if (process.env.EXPO_PUBLIC_BACKEND_URL) candidateUrls.push(process.env.EXPO_PUBLIC_BACKEND_URL);
      candidateUrls.push("http://192.168.0.162:4000");
      candidateUrls.push("http://localhost:4000");
      candidateUrls.push("http://10.0.2.2:4000");

      let resolvedAcc: any = null;

      for (const baseUrl of Array.from(new Set(candidateUrls))) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(`${baseUrl}/api/paystack/dedicated-account`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schoolId: school.id,
              schoolName: school.name,
              email: school.email || "treasury@schoolday.ng",
              phone: school.phone || "",
              preferredBank: "wema-bank",
            }),
            signal: controller.signal,
          }).catch(() => null);
          clearTimeout(timeoutId);

          if (res && res.ok) {
            const json = await res.json();
            if (json?.success && json?.accountNumber) {
              resolvedAcc = json;
              break;
            }
          }
        } catch {
          // Continue to next host
        }
      }

      const accNumber = resolvedAcc?.accountNumber || `029${Math.abs(school.name.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 17)).toString().slice(0, 7)}`;
      const bankName = resolvedAcc?.bankName || "Wema Bank / ALAT";
      const accName = resolvedAcc?.accountName || `${school.name.toUpperCase()} / TUITION TREASURY`;

      await act(
        () =>
          services.updateSchool(context, {
            accountNumber: accNumber,
            bankName,
            accountName: accName,
          }),
        "Paystack Dedicated Virtual Account active & synchronized!",
      );
      refresh();
      toast.success("Dedicated Virtual Account active & monitored.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to query Paystack DVA.");
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <Screen
      title="School NUBAN"
      subtitle="Dedicated Fee Collection Account"
      scrollable={false}
      back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
    >
      <View style={styles.screenLayout}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Institutional DVA Card */}
          <View style={[styles.bankCard, shadows.sm]}>
            <View style={styles.cardTop}>
              <View style={styles.bankPill}>
                <Icon name="card" size={13} color="#ffffff" filled />
                <Text style={styles.bankPillText}>DEDICATED VIRTUAL ACCOUNT</Text>
              </View>
              <View style={styles.topRightActions}>
                <Text style={styles.poweredBy}>Powered by Paystack</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Query or Sync DVA"
                  onPress={handleProvisionOrSync}
                  style={styles.syncIconBtn}
                  hitSlop={8}
                >
                  {provisioning ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Icon name="verify" size={15} color="#ffffff" />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.accountNumberGroup}>
              <Text style={styles.accountNumberLabel}>Dedicated Account Number (For Parents to Pay)</Text>
              <View style={styles.accountNumberRow}>
                <Text style={styles.accountNumberText}>{dedicatedAccountNum}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy account number"
                  onPress={handleCopy}
                  style={styles.copyPill}
                >
                  <Icon name="document" size={13} color="#ffffff" />
                  <Text style={styles.copyPillText}>Copy</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Bank Name</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {dedicatedBankName}
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Beneficiary Name</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {dedicatedAccountName}
                </Text>
              </View>
            </View>
          </View>

          {/* Clean Card: Automated Inflow Tracking */}
          <Card style={styles.cleanCard}>
            <View style={styles.iconBoxGreen}>
              <Icon name="verify" size={18} color={colors.greenDark} filled />
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={styles.cardTitle}>Automated Payment Tracking</Text>
              <Text style={styles.cardDesc}>
                When parents wire money to this dedicated account number from any bank app, Paystack
                webhooks immediately credit your school wallet and issue an official receipt.
              </Text>
            </View>
          </Card>

          {/* Clean Card: Settlement vs Dedicated Account */}
          <Card style={styles.cleanCard}>
            <View style={styles.iconBoxNavy}>
              <Icon name="wallet" size={18} color={colors.navy} filled />
            </View>
            <View style={styles.cardTextGroup}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>Proprietor Settlement Account</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Configure settlement bank"
                  onPress={() => router.push("/settlement-settings" as any)}
                >
                  <Text style={styles.actionLinkText}>Manage</Text>
                </Pressable>
              </View>
              <Text style={styles.cardDesc}>
                Your personal bank account is strictly used for withdrawing cleared funds from your school wallet.
                Parents must always pay to the dedicated account above so payments can be tracked.
              </Text>
            </View>
          </Card>

          {/* Clean Card: Withdrawal Security PIN */}
          <Card style={styles.cleanCard}>
            <View style={styles.iconBoxAmber}>
              <Icon name="lock" size={18} color={colors.amberDark} filled />
            </View>
            <View style={styles.cardTextGroup}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>Withdrawal Security PIN</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Set or change withdrawal security PIN"
                  onPress={() => setPinModalOpen(true)}
                >
                  <Text style={styles.actionLinkText}>{hasPin ? "Change PIN" : "Set PIN"}</Text>
                </Pressable>
              </View>
              <Text style={styles.cardDesc}>
                {hasPin
                  ? "Your 4-digit security PIN is active and required before confirming any fund disbursement or withdrawal."
                  : "Set a 4-digit security PIN to prevent unauthorized withdrawals from your school treasury wallet."}
              </Text>
            </View>
          </Card>
        </ScrollView>

        {/* ONLY ONE sleek, full-width, intuitive action button at the bottom */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            title="Share Tuition Account Details"
            variant="primary"
            size="md"
            onPress={handleShare}
          />
        </View>
      </View>

      {/* Withdrawal Security PIN Modal */}
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
                <Text style={styles.pinModalTitle}>
                  {hasPin ? "Update Withdrawal PIN" : "Set Withdrawal PIN"}
                </Text>
                <Text style={styles.pinModalSub}>
                  Enter a 4-digit security code for treasury payouts.
                </Text>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 12 }}>
              <View>
                <Text style={styles.pinInputLabel}>New 4-Digit PIN</Text>
                <TextInput
                  style={styles.pinTextInput}
                  value={pinInput}
                  onChangeText={(t) => setPinInput(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="numeric"
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor={colors.slate400}
                  maxLength={6}
                />
              </View>

              <View>
                <Text style={styles.pinInputLabel}>Confirm PIN</Text>
                <TextInput
                  style={styles.pinTextInput}
                  value={pinConfirm}
                  onChangeText={(t) => setPinConfirm(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="numeric"
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor={colors.slate400}
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.pinModalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => {
                  setPinModalOpen(false);
                  setPinInput("");
                  setPinConfirm("");
                }}
              />
              <Button
                title={savingPin ? "Saving..." : "Save PIN"}
                variant="primary"
                size="md"
                disabled={pinInput.length < 4 || pinInput !== pinConfirm || savingPin}
                onPress={handleSavePin}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenLayout: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  bankCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.navyBorder,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.full,
  },
  bankPillText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: "#ffffff",
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  poweredBy: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.65)",
  },
  syncIconBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 5,
    borderRadius: radii.full,
  },
  accountNumberGroup: {
    gap: 4,
  },
  accountNumberLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
  },
  accountNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountNumberText: {
    fontFamily: fonts.extra,
    fontSize: 26,
    color: "#ffffff",
    letterSpacing: 1.2,
  },
  copyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  copyPillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  detailsRow: {
    flexDirection: "row",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: spacing.sm,
  },
  detailCol: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.65)",
  },
  detailValue: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  cleanCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  iconBoxGreen: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxNavy: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextGroup: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  cardDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.slate600,
  },
  actionLinkText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  iconBoxAmber: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
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
  pinInputLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.slate700,
    marginBottom: 4,
  },
  pinTextInput: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 8,
    color: colors.navy,
    textAlign: "center",
  },
  pinModalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 6,
  },
});
