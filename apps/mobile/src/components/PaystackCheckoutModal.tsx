import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { toast } from "sonner-native";
import { colors, fonts, shadows, Button, Badge, Card } from "./ui";
import { Icon } from "./Icon";
import { money } from "../domain/model";

interface PaystackCheckoutModalProps {
  visible: boolean;
  amountKobo: number;
  schoolName: string;
  studentName?: string;
  invoiceTitle?: string;
  invoiceId?: string;
  onSuccess: (paymentResult: {
    reference: string;
    channel: "card" | "transfer" | "ussd";
    amountKobo: number;
  }) => Promise<void>;
  onClose: () => void;
}

export function PaystackCheckoutModal({
  visible,
  amountKobo,
  schoolName,
  studentName = "Student Enrollment",
  invoiceTitle = "Tuition & Academic Term Levy",
  invoiceId = "INV-001",
  onSuccess,
  onClose,
}: PaystackCheckoutModalProps) {
  const [channel, setChannel] = useState<"card" | "transfer" | "ussd">("card");
  const [busy, setBusy] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState("5399 4100 8291 3042");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("892");
  const [cardPin, setCardPin] = useState("1234");

  // USSD Bank Selection
  const [selectedUssdBank, setSelectedUssdBank] = useState<{
    name: string;
    code: string;
  }>({ name: "GTBank", code: "*737*50" });

  // Virtual Account Number derived for this transaction
  const dynamicAccountNum = `02${Math.abs(
    String(invoiceId + amountKobo).split("").reduce((a, b) => a + b.charCodeAt(0), 0) % 90000000 + 10000000
  )}`;

  const handleCopyAccount = async () => {
    try {
      await Clipboard.setStringAsync(dynamicAccountNum);
      toast.success("Account number copied to clipboard!");
    } catch {
      toast.success(`Account Number: ${dynamicAccountNum}`);
    }
  };

  const handleProcessCardPayment = async () => {
    if (cardNumber.replace(/\s/g, "").length < 16) {
      toast.error("Please enter a valid 16-digit debit card number.");
      return;
    }
    if (!cardExpiry.includes("/")) {
      toast.error("Enter card expiry in MM/YY format.");
      return;
    }
    if (cardCvv.length < 3) {
      toast.error("Enter a valid 3-digit CVV.");
      return;
    }

    setBusy(true);
    try {
      // Simulate real Paystack 3DS authorization pipeline
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const reference = `pstk_trx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await onSuccess({
        reference,
        channel: "card",
        amountKobo,
      });
      setSuccessDone(true);
      setTimeout(() => {
        setSuccessDone(false);
        onClose();
      }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "Payment declined by issuing bank.");
    } finally {
      setBusy(false);
    }
  };

  const handleTransferDone = async () => {
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const reference = `pstk_vact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await onSuccess({
        reference,
        channel: "transfer",
        amountKobo,
      });
      setSuccessDone(true);
      setTimeout(() => {
        setSuccessDone(false);
        onClose();
      }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "Failed to confirm bank transfer.");
    } finally {
      setBusy(false);
    }
  };

  const handleUssdPaid = async () => {
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const reference = `pstk_ussd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await onSuccess({
        reference,
        channel: "ussd",
        amountKobo,
      });
      setSuccessDone(true);
      setTimeout(() => {
        setSuccessDone(false);
        onClose();
      }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "USSD transaction verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Paystack Official Header */}
          <View style={styles.paystackHeader}>
            <View style={styles.paystackLogoRow}>
              <View style={styles.paystackPill}>
                <View style={styles.paystackDot} />
                <Text style={styles.paystackLogoText}>paystack</Text>
              </View>
              <View style={styles.secureBadge}>
                <Icon name="lock" size={12} color={colors.greenDark} filled />
                <Text style={styles.secureBadgeText}>256-Bit SSL Secured</Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>

          {/* Transaction Summary Card */}
          <View style={styles.summaryBar}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.schoolNameText} numberOfLines={1}>
                {schoolName}
              </Text>
              <Text style={styles.purposeText} numberOfLines={1}>
                {studentName} · {invoiceTitle}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
              <Text style={styles.amountValue}>{money(amountKobo)}</Text>
            </View>
          </View>

          {/* Payment Method Channels Switcher */}
          <View style={styles.channelRow}>
            {[
              { id: "card", label: "Debit Card", icon: "card" },
              { id: "transfer", label: "Bank Transfer", icon: "wallet" },
              { id: "ussd", label: "USSD Banking", icon: "flash" },
            ].map((ch) => (
              <Pressable
                key={ch.id}
                onPress={() => setChannel(ch.id as any)}
                style={[
                  styles.channelTab,
                  channel === ch.id && styles.channelTabActive,
                ]}
              >
                <Icon
                  name={ch.icon as any}
                  size={15}
                  color={channel === ch.id ? "#ffffff" : colors.muted}
                />
                <Text
                  style={[
                    styles.channelTabText,
                    channel === ch.id && styles.channelTabTextActive,
                  ]}
                >
                  {ch.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Channel Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.channelBody}
          >
            {successDone ? (
              <View style={styles.successBox}>
                <View style={styles.successIconBubble}>
                  <Icon name="check" size={28} color="#ffffff" filled />
                </View>
                <Text style={styles.successTitle}>Payment Approved!</Text>
                <Text style={styles.successSubtitle}>
                  Tuition settlement verified and official digital receipt issued.
                </Text>
              </View>
            ) : channel === "card" ? (
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>CARD NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholder="5399 0000 0000 0000"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    style={styles.textInput}
                  />
                  <View style={styles.cardTypeBadge}>
                    <Text style={styles.cardTypeBadgeText}>Mastercard / Visa / Verve</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>EXPIRY DATE</Text>
                    <TextInput
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      placeholder="MM/YY"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      style={styles.textInput}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>CVV</Text>
                    <TextInput
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      placeholder="123"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                      style={styles.textInput}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>4-DIGIT PIN</Text>
                    <TextInput
                      value={cardPin}
                      onChangeText={setCardPin}
                      placeholder="••••"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <Button
                  title={busy ? "Authorizing with Paystack..." : `Pay ${money(amountKobo)}`}
                  variant="primary"
                  size="lg"
                  icon="shield"
                  loading={busy}
                  disabled={busy}
                  onPress={handleProcessCardPayment}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : channel === "transfer" ? (
              <View style={styles.transferSection}>
                <View style={styles.transferInfoCard}>
                  <Text style={styles.transferInstruction}>
                    Transfer exactly <Text style={{ fontFamily: fonts.extra, color: colors.navy }}>{money(amountKobo)}</Text> to the dedicated Paystack virtual account below:
                  </Text>

                  <View style={styles.bankDetailRow}>
                    <Text style={styles.bankDetailKey}>Bank Name</Text>
                    <Text style={styles.bankDetailVal}>Wema Bank (Paystack)</Text>
                  </View>

                  <View style={styles.accountNumberBox}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.accountNumberLabel}>DEDICATED ACCOUNT NUMBER</Text>
                      <Text style={styles.accountNumberVal}>{dynamicAccountNum}</Text>
                    </View>
                    <Pressable
                      onPress={handleCopyAccount}
                      style={styles.copyBtn}
                    >
                      <Icon name="document" size={14} color={colors.orange} />
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </Pressable>
                  </View>

                  <View style={styles.bankDetailRow}>
                    <Text style={styles.bankDetailKey}>Beneficiary</Text>
                    <Text style={styles.bankDetailVal} numberOfLines={1}>
                      {schoolName} / SchoolDay
                    </Text>
                  </View>
                </View>

                <Text style={styles.transferHint}>
                  Funds transfer will be verified automatically in 30–60 seconds.
                </Text>

                <Button
                  title={busy ? "Verifying Inflow..." : "I Have Sent the Money"}
                  variant="primary"
                  size="lg"
                  icon="check"
                  loading={busy}
                  disabled={busy}
                  onPress={handleTransferDone}
                />
              </View>
            ) : (
              <View style={styles.ussdSection}>
                <Text style={styles.inputLabel}>SELECT YOUR BANK FOR USSD CODE</Text>
                <View style={styles.ussdBanksWrap}>
                  {[
                    { name: "GTBank", code: "*737*50" },
                    { name: "Zenith Bank", code: "*966*00" },
                    { name: "Access Bank", code: "*901*00" },
                    { name: "UBA", code: "*919*00" },
                    { name: "First Bank", code: "*894*00" },
                  ].map((bank) => (
                    <Pressable
                      key={bank.name}
                      onPress={() => setSelectedUssdBank(bank)}
                      style={[
                        styles.ussdChip,
                        selectedUssdBank.name === bank.name && styles.ussdChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ussdChipText,
                          selectedUssdBank.name === bank.name && styles.ussdChipTextActive,
                        ]}
                      >
                        {bank.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Card variant="dark" style={styles.ussdCodeCard}>
                  <Text style={styles.ussdDialInstruction}>DIAL ON REGISTERED MOBILE PHONE</Text>
                  <Text style={styles.ussdCodeString}>
                    {selectedUssdBank.code}*{Math.round(amountKobo / 100)}*782#
                  </Text>
                  <Text style={styles.ussdSub}>Instant prompt on your mobile SIM</Text>
                </Card>

                <Button
                  title={busy ? "Verifying USSD Settlement..." : "Confirm USSD Payment"}
                  variant="primary"
                  size="lg"
                  loading={busy}
                  disabled={busy}
                  onPress={handleUssdPaid}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "86%",
    overflow: "hidden",
  },
  paystackHeader: {
    backgroundColor: "#001b2e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  paystackLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paystackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paystackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00c3f7",
  },
  paystackLogoText: {
    fontFamily: fonts.extra,
    fontSize: 18,
    letterSpacing: -0.5,
    color: "#ffffff",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  secureBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#4ade80",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    gap: 14,
  },
  schoolNameText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  purposeText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  amountLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.6,
  },
  amountValue: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  channelRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  channelTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
  },
  channelTabActive: {
    backgroundColor: colors.navy,
  },
  channelTabText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  channelTabTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  channelBody: {
    padding: 20,
    paddingBottom: 36,
  },
  formSection: {
    gap: 14,
  },
  inputLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.7,
    color: colors.muted,
    marginBottom: -4,
  },
  inputWrapper: {
    position: "relative",
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  cardTypeBadge: {
    position: "absolute",
    right: 12,
    top: 11,
  },
  cardTypeBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
  },
  transferSection: {
    gap: 14,
  },
  transferInfoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  transferInstruction: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  bankDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankDetailKey: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  bankDetailVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  accountNumberBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  accountNumberLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.orange,
  },
  accountNumberVal: {
    fontFamily: fonts.extra,
    fontSize: 22,
    letterSpacing: 2,
    color: colors.navy,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
  },
  transferHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
  },
  ussdSection: {
    gap: 14,
  },
  ussdBanksWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ussdChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ussdChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  ussdChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  ussdChipTextActive: {
    fontFamily: fonts.bold,
    color: "#ffffff",
  },
  ussdCodeCard: {
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
  },
  ussdDialInstruction: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: "#94a3b8",
    letterSpacing: 0.8,
  },
  ussdCodeString: {
    fontFamily: fonts.extra,
    fontSize: 22,
    letterSpacing: 1.5,
    color: "#ffffff",
  },
  ussdSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#cbd5e1",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  successIconBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  successTitle: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
  },
  successSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
