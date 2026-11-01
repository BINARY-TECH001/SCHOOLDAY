import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Avatar, Badge, Button, Card, EmptyState } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { balance, money, Invoice, Student } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";

export interface ParentChildrenFeeListProps {
  childrenList: Student[];
  invoices: Invoice[];
}

export function ParentChildrenFeeList({
  childrenList,
  invoices,
}: ParentChildrenFeeListProps) {
  const { school } = useSchool();

  const handleCopyDva = async () => {
    const acc = school.accountNumber || "0123456789";
    try {
      await Clipboard.setStringAsync(acc);
      toast.success("School Tuition NUBAN copied!");
    } catch {
      toast.success(`NUBAN: ${acc}`);
    }
  };

  if (childrenList.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Child Tuition Invoices</Text>
        <EmptyState
          title="No Students Linked"
          subtitle="Your parent account is active, but no student records are linked yet. Please reach out to the bursary office."
          icon="people"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* School Dedicated Virtual Account Card for Parents */}
      <View style={styles.wireTransferCard}>
        <View style={styles.wireTopRow}>
          <View style={styles.wireIconBox}>
            <Icon name="card" size={16} color={colors.navy} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.wireTitle}>Direct Wire Transfer (School NUBAN)</Text>
            <Text style={styles.wireSub}>Automated tracking via Paystack Dedicated Account</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy School NUBAN"
            onPress={handleCopyDva}
            style={styles.copyBtnPill}
          >
            <Icon name="document" size={12} color={colors.navy} />
            <Text style={styles.copyBtnText}>Copy</Text>
          </Pressable>
        </View>
        <View style={styles.wireDetailsRow}>
          <Text style={styles.wireAccountNum}>{school.accountNumber || "0123456789"}</Text>
          <Text style={styles.wireBankName}>
            {school.bankName || "Wema Bank / ALAT"} · {school.name}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Child Tuition Invoices</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/fees")}
        >
          <Text style={styles.sectionActionText}>Pay All</Text>
        </Pressable>
      </View>

      <View style={styles.childrenList}>
        {childrenList.map((child) => {
          const childInvoices = invoices.filter(
            (inv) => inv.studentId === child.id,
          );
          const childBalance = childInvoices.reduce(
            (sum, inv) => sum + balance(inv),
            0,
          );
          const isSettled = childBalance <= 0;

          return (
            <Card key={child.id} style={styles.childCard}>
              <View style={styles.childHeader}>
                <Avatar
                  uri={child.avatar}
                  name={child.name}
                  size={42}
                  role="student"
                />
                <View style={styles.childInfo}>
                  <Text style={styles.childName} numberOfLines={1}>
                    {child.name}
                  </Text>
                  <Text style={styles.childMeta}>
                    {child.className} · ID: {child.id}
                  </Text>
                </View>
                <Badge
                  text={isSettled ? "Settled" : "Tuition Due"}
                  tone={isSettled ? "success" : "warning"}
                  size="sm"
                />
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.childFooter}>
                <View style={styles.balanceCol}>
                  <Text style={styles.balanceLabel}>Outstanding Balance</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      !isSettled && { color: colors.orange },
                    ]}
                  >
                    {money(childBalance)}
                  </Text>
                </View>

                {!isSettled ? (
                  <Button
                    title="Pay Tuition"
                    size="sm"
                    variant="primary"
                    onPress={() =>
                      router.push({
                        pathname: "/fees",
                        params: { child: child.id },
                      })
                    }
                  />
                ) : (
                  <Button
                    title="View Receipt"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push("/receipts")}
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>
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
  childrenList: {
    gap: spacing.sm,
  },
  childCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  childInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  childMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  childFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceCol: {
    gap: 2,
  },
  balanceLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  balanceAmount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  wireTransferCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  wireTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wireIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
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
    fontSize: 10,
    color: colors.muted,
  },
  copyBtnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  wireDetailsRow: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    gap: 2,
  },
  wireAccountNum: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    letterSpacing: 1.5,
  },
  wireBankName: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
