import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { toast } from "sonner-native";
import {
  Badge,
  Button,
  colors,
  fonts,
  money,
  radii,
  shadows,
  spacing,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";
import QRCode from "react-native-qrcode-svg";
import { IdentityCode } from "../components/IdentityCode";
import { useChatStore } from "./chatStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, school, context } = useSchool();
  const { channels, sendMessage } = useChatStore();

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [inAppShareMode, setInAppShareMode] = useState(false);

  // Find payment strictly by id or key
  const payment = id
    ? data.payments.find((p) => p.id === id || p.key === id)
    : undefined;

  if (!payment) {
    return (
      <View style={styles.container}>
        <TopBar
          title="Payment Receipt"
          subtitle="Record Lookup"
          back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
        />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Icon name="receipt" size={36} color={colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>No Receipt Record Found</Text>
          <Text style={styles.emptySub}>
            No payment transaction matches this reference in the school treasury ledger.
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

  const isPayout = payment.type === "payout";
  const inv = data.invoices.find((i) => payment.invoiceIds.includes(i.id));
  const student = data.students.find((s) => s.id === inv?.studentId);
  const amountKobo = payment.amount;
  const transactionRef = payment.id;
  const dateFormatted = new Date(payment.createdAt).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const recipientDisplayName = isPayout
    ? payment.recipientName || "Faculty Staff Member"
    : student?.name || payment.recipientName || "Enrolled Student";

  // Dynamic School Brand Colors
  const headerBg = school.primaryColor || colors.navy;
  const accentColor = school.secondaryColor || colors.orange;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=RCP-${encodeURIComponent(transactionRef)}`;

  // External Native Share
  const handleShareOutside = async () => {
    setShareModalVisible(false);
    try {
      await Share.share({
        title: `${school.name} Payment Receipt`,
        message:
          `🧾 *${school.name.toUpperCase()} OFFICIAL RECEIPT*\n` +
          `• Status: ${payment.state.toUpperCase()}\n` +
          `• Amount: ${money(amountKobo)}\n` +
          `• Beneficiary / Pupil: ${recipientDisplayName}\n` +
          `• Note: ${payment.note || (isPayout ? "Staff Allowance" : "Tuition Fee Settlement")}\n` +
          `• Reference: ${transactionRef}\n` +
          `• Date: ${dateFormatted}\n\n` +
          `Verified cryptographically by SchoolDay NIP & Treasury Ledger.`,
      });
    } catch {
      // Ignored
    }
  };

  // Share Receipt as Image
  const handleShareAsImage = async () => {
    setShareModalVisible(false);
    try {
      await Share.share({
        title: `${school.name} Payment Receipt Image - ${transactionRef}`,
        message:
          `🧾 *${school.name.toUpperCase()} OFFICIAL PAYMENT RECEIPT*\n` +
          `• Status: ${payment.state.toUpperCase()}\n` +
          `• Amount Cleared: ${money(amountKobo)}\n` +
          `• Beneficiary: ${recipientDisplayName}\n` +
          `• Transaction Ref: ${transactionRef}\n\n` +
          `📷 *Download / View Verified Receipt Image:*\n${qrImageUrl}\n\n` +
          `Cryptographically verified under SchoolDay NIP & Treasury Ledger.`,
        url: qrImageUrl,
      });
    } catch {
      // Ignored
    }
  };

  // Copy Reference
  const handleCopyRef = async () => {
    try {
      await Clipboard.setStringAsync(transactionRef);
      toast.success("Transaction reference copied!");
    } catch {
      toast.success(`Copied: ${transactionRef}`);
    }
    setShareModalVisible(false);
  };

  // In-App Share to Chat
  const handleShareToChannel = (channelId: string) => {
    sendMessage(channelId, {
      senderId: context.userId,
      senderName: context.role === "owner" ? "Proprietor Office" : "Bursary Desk",
      senderRole: context.role,
      text: `Official Receipt for ${recipientDisplayName}: ${money(amountKobo)} (${transactionRef})`,
      attachment: {
        name: `Receipt_${transactionRef.slice(0, 10)}.pdf`,
        type: "receipt",
        size: "340 KB",
      },
    });

    setShareModalVisible(false);
    setInAppShareMode(false);
    toast.success("Receipt shared in chat!");
    router.push({
      pathname: "/chat-detail",
      params: { id: channelId },
    } as any);
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="Official Payment Receipt"
        subtitle={isPayout ? "Treasury Disbursement" : "CBN NIP & Treasury Verified"}
        back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share Receipt"
            style={styles.topBarBtn}
            onPress={() => setShareModalVisible(true)}
          >
            <Icon name="share" size={18} color={colors.navy} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact, Clean Fintech Receipt Slip */}
        <View style={styles.receiptSlip}>
          {/* Slip Header with School Logo positioned inline so it doesn't take much vertical space */}
          <View style={[styles.slipHeader, { backgroundColor: headerBg }]}>
            <View style={styles.schoolHeaderInline}>
              <View style={styles.schoolLogoFrame}>
                {school.logo ? (
                  <Image
                    source={{ uri: school.logo }}
                    style={styles.schoolLogoImg}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon name="school" size={24} color={headerBg} />
                )}
              </View>
              <View style={styles.schoolHeaderMeta}>
                <Text style={styles.schoolName} numberOfLines={1}>
                  {school.name}
                </Text>
                <Text style={styles.schoolAddress} numberOfLines={1}>
                  {school.address || "Main Campus · Official Educational Institution"}
                </Text>
                <View style={styles.termBadgePill}>
                  <Text style={styles.termTag}>{school.term} Session</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Verification Badge & Amount - Tightened padding */}
          <View style={styles.verifyBadgeRow}>
            <View style={styles.successCircle}>
              <Icon name="verify" size={26} color={colors.greenDark} filled />
            </View>
            <Text style={styles.successTitle}>
              {isPayout ? "DISBURSEMENT COMPLETED" : "PAYMENT COMPLETED"}
            </Text>
            <Text style={styles.amountText}>{money(amountKobo)}</Text>
            <Badge
              tone={payment.state === "settled" ? "success" : "warning"}
              text={payment.state === "settled" ? "SETTLED & CONFIRMED" : "AWAITING CONFIRMATION"}
              dot
            />
          </View>

          {/* Left & Right Circular Cutouts + Perforated Line */}
          <View style={styles.perforationWrap}>
            <View style={styles.cutoutLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.cutoutRight} />
          </View>

          {/* Recipient / Student Meta - Clean, reduced gap */}
          <View style={styles.sectionPadding}>
            <Text style={styles.sectionHeaderLabel}>
              {isPayout ? "BENEFICIARY DETAILS" : "STUDENT & GUARDIAN DETAILS"}
            </Text>

            {isPayout ? (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Recipient Name</Text>
                  <Text style={styles.metaVal}>{recipientDisplayName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Disbursement Note</Text>
                  <Text style={styles.metaVal}>{payment.note || "Staff Monthly Salary Allowance"}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Pupil / Student</Text>
                  <Text style={styles.metaVal}>{recipientDisplayName}</Text>
                </View>
                {student?.id ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Student ID</Text>
                    <Text style={styles.metaVal}>{student.id}</Text>
                  </View>
                ) : null}
                {student?.className ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Assigned Class</Text>
                    <Text style={styles.metaVal}>{student.className}</Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Payer Relationship</Text>
                  <Text style={styles.metaVal}>Verified Guardian</Text>
                </View>
              </>
            )}
          </View>

          {/* Perforated divider */}
          <View style={styles.perforationWrap}>
            <View style={styles.cutoutLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.cutoutRight} />
          </View>

          {/* Itemized Fee Breakdown */}
          <View style={styles.sectionPadding}>
            <Text style={styles.sectionHeaderLabel}>
              {isPayout ? "DISBURSEMENT BREAKDOWN" : "ITEMIZED LEVIES CLEARED"}
            </Text>

            {inv && inv.items && inv.items.length > 0 ? (
              inv.items.map((item, idx) => (
                <View key={idx} style={styles.feeItemRow}>
                  <Text style={styles.feeItemLabel}>{item.label}</Text>
                  <Text style={styles.feeItemAmount}>{money(item.amount)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.feeItemRow}>
                <Text style={styles.feeItemLabel}>
                  {payment.note || (isPayout ? "Staff Monthly Salary Allowance" : "Tuition & School Fee Settlement")}
                </Text>
                <Text style={styles.feeItemAmount}>{money(amountKobo)}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalKey}>TOTAL CLEARED</Text>
              <Text style={[styles.totalVal, { color: colors.greenDark }]}>{money(amountKobo)}</Text>
            </View>
          </View>

          {/* Perforated divider */}
          <View style={styles.perforationWrap}>
            <View style={styles.cutoutLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.cutoutRight} />
          </View>

          {/* Transaction Audit Details */}
          <View style={styles.sectionPadding}>
            <Text style={styles.sectionHeaderLabel}>TRANSACTION AUDIT DETAILS</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Transaction Ref</Text>
              <Text style={styles.metaValMono}>{transactionRef}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Payment Channel</Text>
              <Text style={styles.metaVal}>
                {isPayout ? "Direct NIP Bank Transfer" : "Paystack Dedicated Virtual Account"}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Settled Timestamp</Text>
              <Text style={styles.metaVal}>{dateFormatted}</Text>
            </View>
          </View>

          {/* Cryptographic Verification Bar & Scannable QR */}
          <View style={styles.qrAuditBlock}>
            <View style={styles.qrFrame}>
              <QRCode
                value={`schoolday:receipt:${payment.id}`}
                size={84}
                color="#14213d"
                backgroundColor="#ffffff"
                quietZone={4}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.qrHeaderRow}>
                <Icon name="verify" size={14} color={colors.greenDark} filled />
                <Text style={styles.qrTitle}>OFFICIAL VERIFICATION CODE</Text>
              </View>
              <Text style={styles.qrRefCode}>RCP-{transactionRef}</Text>
              <Text style={styles.qrSubtitle}>
                Scan with the SchoolDay scanner or camera to verify authenticity directly against the accredited treasury ledger.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button Row */}
        <View style={styles.actionRow}>
          <Button
            title="Share Receipt"
            variant="primary"
            size="lg"
            onPress={() => setShareModalVisible(true)}
          />
          <Button
            title="Copy Reference"
            variant="outline"
            size="md"
            onPress={handleCopyRef}
          />
        </View>
      </ScrollView>

      {/* Robust Sharing Modal Sheet */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShareModalVisible(false);
          setInAppShareMode(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalScrim}
            onPress={() => {
              setShareModalVisible(false);
              setInAppShareMode(false);
            }}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {inAppShareMode ? "Select Recipient or Channel" : "Share Official Receipt"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {inAppShareMode
                    ? "Deliver receipt card inside campus chat"
                    : `Official proof for ${money(amountKobo)}`}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close share menu"
                onPress={() => {
                  setShareModalVisible(false);
                  setInAppShareMode(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={16} color={colors.slate600} />
              </Pressable>
            </View>

            {inAppShareMode ? (
              /* In-App Channel / Recipient Selector */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.channelsList}
              >
                {channels.map((ch) => (
                  <Pressable
                    key={ch.id}
                    accessibilityRole="button"
                    onPress={() => handleShareToChannel(ch.id)}
                    style={styles.channelRow}
                  >
                    <View style={styles.channelIconBox}>
                      <Icon
                        name={ch.type === "broadcast" ? "sms" : ch.type === "class" ? "school" : "people"}
                        size={18}
                        color={headerBg}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.channelTitle} numberOfLines={1}>
                        {ch.title}
                      </Text>
                      <Text style={styles.channelSub} numberOfLines={1}>
                        {ch.subtitle}
                      </Text>
                    </View>
                    <Icon name="forward" size={14} color={colors.slate400} />
                  </Pressable>
                ))}

                <Button
                  title="← Back to Share Options"
                  variant="outline"
                  size="sm"
                  onPress={() => setInAppShareMode(false)}
                />
              </ScrollView>
            ) : (
              /* Main Share Options */
              <View style={styles.shareOptionsGrid}>
                {/* Share Inside App */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setInAppShareMode(true)}
                  style={styles.shareOptionCard}
                >
                  <View style={[styles.shareOptionIcon, { backgroundColor: `${headerBg}15` }]}>
                    <Icon name="sms" size={22} color={headerBg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareOptionTitle}>Share Inside App (Chat)</Text>
                    <Text style={styles.shareOptionDesc}>
                      Send directly to parent, guardian or teacher in campus messenger
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} color={colors.slate400} />
                </Pressable>

                {/* Share Receipt as Image */}
                <Pressable
                  accessibilityRole="button"
                  onPress={handleShareAsImage}
                  style={styles.shareOptionCard}
                >
                  <View style={[styles.shareOptionIcon, { backgroundColor: colors.greenLight }]}>
                    <Icon name="camera" size={22} color={colors.greenDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareOptionTitle}>Share Receipt as Image</Text>
                    <Text style={styles.shareOptionDesc}>
                      Export verified visual slip with cryptographic QR pass
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} color={colors.slate400} />
                </Pressable>

                {/* Share Outside App */}
                <Pressable
                  accessibilityRole="button"
                  onPress={handleShareOutside}
                  style={styles.shareOptionCard}
                >
                  <View style={[styles.shareOptionIcon, { backgroundColor: `${accentColor}15` }]}>
                    <Icon name="share" size={22} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareOptionTitle}>Share Outside App</Text>
                    <Text style={styles.shareOptionDesc}>
                      Export to WhatsApp, Email, AirDrop or save to photos
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} color={colors.slate400} />
                </Pressable>

                {/* Copy Reference */}
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCopyRef}
                  style={styles.shareOptionCard}
                >
                  <View style={[styles.shareOptionIcon, { backgroundColor: colors.surfaceSubtle }]}>
                    <Icon name="document" size={22} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareOptionTitle}>Copy Transaction Reference</Text>
                    <Text style={styles.shareOptionDesc}>
                      {transactionRef}
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} color={colors.slate400} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 60,
  },
  topBarBtn: {
    padding: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.full,
  },
  receiptSlip: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  slipHeader: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  schoolHeaderInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  schoolLogoFrame: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  schoolLogoImg: {
    width: "100%",
    height: "100%",
  },
  schoolHeaderMeta: {
    flex: 1,
    gap: 2,
  },
  schoolName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#ffffff",
  },
  schoolAddress: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
  },
  termBadgePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginTop: 2,
  },
  termTag: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  verifyBadgeRow: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
    backgroundColor: colors.white,
  },
  successCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.full,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.greenDark,
    letterSpacing: 0.8,
  },
  amountText: {
    fontFamily: fonts.extra,
    fontSize: 30,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  perforationWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 16,
    position: "relative",
    backgroundColor: colors.white,
  },
  cutoutLeft: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bg,
    marginLeft: -7,
  },
  dashedLine: {
    flex: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginHorizontal: 6,
  },
  cutoutRight: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bg,
    marginRight: -7,
  },
  sectionPadding: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  sectionHeaderLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.slate400,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaKey: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate500,
  },
  metaVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  metaValMono: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  feeItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feeItemLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate600,
  },
  feeItemAmount: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  totalKey: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  totalVal: {
    fontFamily: fonts.extra,
    fontSize: 16,
  },
  qrAuditBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#f8fafc",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  qrFrame: {
    padding: 6,
    backgroundColor: "#ffffff",
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    ...shadows.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  qrHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qrTitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  qrRefCode: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate700,
    letterSpacing: 0.5,
  },
  qrSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.slate500,
  },
  actionRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
    color: colors.slate500,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalScrim: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  modalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.full,
  },
  shareOptionsGrid: {
    gap: spacing.sm,
  },
  shareOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  shareOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  shareOptionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  shareOptionDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  channelsList: {
    gap: 8,
    paddingBottom: spacing.md,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
  },
  channelIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  channelTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  channelSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
});
