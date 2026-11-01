import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Avatar, Badge, Button, ModalSheet } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { money, total } from "../../../domain/model";
import { ScannedEntity } from "../types";

export interface ScanResultSheetProps {
  visible: boolean;
  onClose: () => void;
  result: ScannedEntity | null;
  onClockSelf?: () => void;
  onClockStaff?: (staffUserId: string, staffName: string) => void;
  isClockingAction?: boolean;
}

export function ScanResultSheet({
  visible,
  onClose,
  result,
  onClockSelf,
  onClockStaff,
  isClockingAction = false,
}: ScanResultSheetProps) {
  if (!result) return null;

  const renderContent = () => {
    switch (result.type) {
      case "staff": {
        const { staff, isClockedIn, canClock } = result;
        return (
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <Avatar uri={staff.avatar} name={staff.name} size={48} role={staff.role} />
              <View style={styles.headerInfo}>
                <Text style={styles.title}>{staff.name}</Text>
                <Text style={styles.subtitle}>
                  {staff.title || staff.role} • ID: {staff.id}
                </Text>
              </View>
              <Badge
                tone={isClockedIn ? "success" : "neutral"}
                text={isClockedIn ? "Clocked In" : "Not In"}
              />
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Assigned Class</Text>
                <Text style={styles.detailValue}>{staff.assignedClass || "General Faculty"}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Department</Text>
                <Text style={styles.detailValue}>Academics & Instruction</Text>
              </View>
            </View>

            <View style={styles.actionsGroup}>
              {canClock && onClockStaff && (
                <Button
                  title={isClockedIn ? `Clock Out ${staff.name}` : `Clock In ${staff.name}`}
                  variant={isClockedIn ? "danger" : "primary"}
                  icon="verify"
                  loading={isClockingAction}
                  onPress={() => onClockStaff(staff.userId, staff.name)}
                />
              )}
              <Button
                title="View Staff Profile"
                variant="outline"
                icon="profile"
                onPress={() => {
                  onClose();
                  router.push(`/public-profile?type=staff&id=${staff.id}` as any);
                }}
              />
            </View>
          </View>
        );
      }

      case "student": {
        const { student, hasUnpaidInvoices, totalDueKobo } = result;
        return (
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <Avatar uri={student.avatar} name={student.name} size={48} role="student" />
              <View style={styles.headerInfo}>
                <Text style={styles.title}>{student.name}</Text>
                <Text style={styles.subtitle}>
                  Class: {student.className} • Reg: {student.id}
                </Text>
              </View>
              <Badge
                tone={hasUnpaidInvoices ? "warning" : "success"}
                text={hasUnpaidInvoices ? "Fees Due" : "Cleared"}
              />
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Matriculation ID</Text>
                <Text style={styles.detailValue}>{student.id}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Outstanding Balance</Text>
                <Text style={[styles.detailValue, hasUnpaidInvoices && { color: colors.orange }]}>
                  {hasUnpaidInvoices ? money(totalDueKobo) : "₦ 0.00 (All Clear)"}
                </Text>
              </View>
            </View>

            <View style={styles.actionsGroup}>
              <Button
                title="View Public Profile"
                variant="primary"
                icon="profile"
                onPress={() => {
                  onClose();
                  router.push(`/public-profile?type=student&id=${student.id}` as any);
                }}
              />
              <Button
                title="View Full Academic Record"
                variant="outline"
                icon="document"
                onPress={() => {
                  onClose();
                  router.push(`/students?id=${student.id}` as any);
                }}
              />
            </View>
          </View>
        );
      }

      case "invoice": {
        const { invoice, isPaid } = result;
        const invoiceTitle = invoice.items[0]?.label || "Tuition & School Fee";
        const invoiceTotal = total(invoice);
        return (
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <View style={styles.invoiceIconCircle}>
                <Icon name="document" size={24} color={colors.navy} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.title}>{invoiceTitle}</Text>
                <Text style={styles.subtitle}>Invoice #{invoice.id}</Text>
              </View>
              <Badge
                tone={isPaid ? "success" : "warning"}
                text={isPaid ? "Paid" : "Pending"}
              />
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Total Amount</Text>
                <Text style={styles.detailValue}>{money(invoiceTotal)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Amount Paid</Text>
                <Text style={styles.detailValue}>{money(invoice.paid)}</Text>
              </View>
            </View>

            <View style={styles.actionsGroup}>
              {isPaid ? (
                <Button
                  title="View Official Receipt"
                  variant="primary"
                  icon="receipt"
                  onPress={() => {
                    onClose();
                    router.push(`/receipt?id=${invoice.id}` as any);
                  }}
                />
              ) : (
                <Button
                  title="Pay Invoice Online"
                  variant="primary"
                  icon="wallet"
                  onPress={() => {
                    onClose();
                    router.push(`/pay-online?invoiceId=${invoice.id}` as any);
                  }}
                />
              )}
            </View>
          </View>
        );
      }

      case "payment": {
        const { payment } = result;
        const receiptId = payment.invoiceIds[0] || payment.id;
        return (
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <View style={styles.invoiceIconCircle}>
                <Icon name="receipt" size={24} color={colors.green} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.title}>Payment #{payment.id}</Text>
                <Text style={styles.subtitle}>Method: {payment.method.toUpperCase()}</Text>
              </View>
              <Badge tone="success" text="Confirmed" />
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Amount Settled</Text>
                <Text style={[styles.detailValue, { color: colors.green }]}>
                  {money(payment.amount)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Recorded At</Text>
                <Text style={styles.detailValue}>{payment.createdAt.slice(0, 10)}</Text>
              </View>
            </View>

            <View style={styles.actionsGroup}>
              <Button
                title="View Receipt"
                variant="primary"
                icon="receipt"
                onPress={() => {
                  onClose();
                  router.push(`/receipt?id=${receiptId}` as any);
                }}
              />
            </View>
          </View>
        );
      }

      case "face": {
        const { name, role, isClockedIn } = result;
        return (
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <View style={styles.invoiceIconCircle}>
                <Icon name="verify" size={24} color={colors.orange} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.title}>{name}</Text>
                <Text style={styles.subtitle}>Role: {role.toUpperCase()} • Biometric Match</Text>
              </View>
              <Badge
                tone={isClockedIn ? "success" : "neutral"}
                text={isClockedIn ? "Clocked In" : "Not In"}
              />
            </View>

            <View style={styles.actionsGroup}>
              {onClockSelf && (
                <Button
                  title={isClockedIn ? "Confirm Clock Out" : "Confirm Biometric Clock In"}
                  variant={isClockedIn ? "danger" : "primary"}
                  icon="verify"
                  loading={isClockingAction}
                  onPress={onClockSelf}
                />
              )}
            </View>
          </View>
        );
      }

      case "url": {
        return (
          <View style={styles.contentWrap}>
            <View style={styles.headerRow}>
              <View style={styles.invoiceIconCircle}>
                <Icon name="document" size={24} color={colors.navy} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.title}>Scanned Web Link</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {result.url}
                </Text>
              </View>
            </View>
            <View style={styles.actionsGroup}>
              <Button title="Dismiss" variant="outline" onPress={onClose} />
            </View>
          </View>
        );
      }

      case "unrecognized":
      default: {
        return (
          <View style={styles.contentWrap}>
            <View style={styles.warningBox}>
              <Icon name="info" size={32} color={colors.orange} />
              <Text style={styles.warningTitle}>Code Not Recognized</Text>
              <Text style={styles.warningDetail}>{result.reason}</Text>
            </View>
            <View style={styles.actionsGroup}>
              <Button title="Try Another Scan" variant="primary" onPress={onClose} />
            </View>
          </View>
        );
      }
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={
        result.type === "staff"
          ? "Staff Identity Recognized"
          : result.type === "student"
          ? "Student Identity Recognized"
          : result.type === "invoice"
          ? "Invoice Recognized"
          : result.type === "payment"
          ? "Payment Voucher Recognized"
          : result.type === "face"
          ? "Face Biometric Match"
          : result.type === "url"
          ? "Web URL Detected"
          : "Scan Result"
      }
      subtitle={result.code ? `Code: ${result.code}` : undefined}
    >
      {renderContent()}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    gap: spacing.md,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  invoiceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  detailItem: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  detailValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  actionsGroup: {
    gap: spacing.xs,
    marginTop: 4,
  },
  warningBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  warningTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  warningDetail: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
