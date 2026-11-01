import React, { useState, useMemo } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Avatar, Badge, Button, Card, Field, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { balance, money, Student, Invoice } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";

export function ParentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const parentId = params.id || "demo-parent";

  const { data, context, services, act, refresh, busy } = useSchool();

  // Find linked children
  const linkedChildren = useMemo(() => {
    return data.students.filter(
      (s) =>
        s.guardianId === parentId ||
        s.guardianPhone?.replace(/[^0-9]/g, "").slice(-6) === parentId.slice(-6),
    );
  }, [data.students, parentId]);

  // Find parent membership or first child's guardian details
  const parentInfo = useMemo(() => {
    const mem = data.memberships.find((m) => m.userId === parentId);
    const firstChild = linkedChildren[0];

    const name =
      mem?.name ||
      firstChild?.guardianName ||
      (firstChild?.lastName ? `${firstChild.lastName} Family Guardian` : "Parent / Guardian");

    const phone = firstChild?.guardianPhone || "+234 803 291 8492";
    const email = firstChild?.guardianEmail || `${parentId}@parent.schoolday.ng`;
    const relationship = firstChild?.guardianRelationship || "Father / Legal Guardian";

    return {
      id: parentId,
      name,
      phone,
      email,
      relationship,
      avatar: mem?.avatar,
    };
  }, [data.memberships, linkedChildren, parentId]);

  // Aggregate invoices for all wards
  const parentInvoices = useMemo(() => {
    const childIds = new Set(linkedChildren.map((c) => c.id));
    return data.invoices.filter((inv) => childIds.has(inv.studentId));
  }, [data.invoices, linkedChildren]);

  const totalInvoiced = useMemo(() => {
    return parentInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((s, it) => s + it.amount, 0),
      0,
    );
  }, [parentInvoices]);

  const totalPaid = useMemo(() => {
    return parentInvoices.reduce((sum, inv) => sum + inv.paid, 0);
  }, [parentInvoices]);

  const totalOutstanding = useMemo(() => {
    return parentInvoices.reduce((sum, inv) => sum + balance(inv), 0);
  }, [parentInvoices]);

  // Modal State for Link Child
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [selectedStudentToLink, setSelectedStudentToLink] = useState<string>("");

  // Modal State for Fee Payment Recording
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentAmountNaira, setPaymentAmountNaira] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "card">("transfer");

  // Available students not already linked
  const unlinkedStudents = useMemo(() => {
    const linkedSet = new Set(linkedChildren.map((c) => c.id));
    return data.students.filter((s) => !linkedSet.has(s.id));
  }, [data.students, linkedChildren]);

  // Action handlers
  const handleCall = () => {
    if (parentInfo.phone) {
      Linking.openURL(`tel:${parentInfo.phone}`).catch(() => {
        toast.info("Phone", { description: parentInfo.phone });
      });
    }
  };

  const handleWhatsApp = () => {
    const cleanPhone = parentInfo.phone.replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/${cleanPhone}?text=Good%20day%20${encodeURIComponent(parentInfo.name)},%20regarding%20your%20wards%20at%20school.`).catch(() => {
      toast.info("WhatsApp unavailable", { description: `Phone: ${parentInfo.phone}` });
    });
  };

  const handleSendReminder = async () => {
    const unpaidInv = parentInvoices.find((i) => balance(i) > 0);
    if (!unpaidInv) {
      toast.success("All Fees Cleared", {
        description: "This parent has zero outstanding fees.",
      });
      return;
    }
    try {
      await act(
        () => services.remind(context, unpaidInv.id),
        `Official fee reminder SMS & notification sent to ${parentInfo.name}!`,
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to dispatch reminder.");
    }
  };

  const handleLinkStudent = async () => {
    if (!selectedStudentToLink) {
      toast.error("Please select a student to link.");
      return;
    }
    try {
      await act(
        async () => {
          // Update student's guardianId in services
          const targetStudent = data.students.find((s) => s.id === selectedStudentToLink);
          if (targetStudent) {
            targetStudent.guardianId = parentId;
            targetStudent.guardianName = parentInfo.name;
            targetStudent.guardianPhone = parentInfo.phone;
            targetStudent.guardianEmail = parentInfo.email;
          }
        },
        "Student ward linked to guardian successfully!",
      );
      setLinkModalVisible(false);
      setSelectedStudentToLink("");
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to link student.");
    }
  };

  const handleOpenRecordPayment = (inv: Invoice) => {
    setPayingInvoice(inv);
    const dueKobo = balance(inv);
    setPaymentAmountNaira(String(Math.round(dueKobo / 100)));
    setPayModalVisible(true);
  };

  const handleExecutePayment = async () => {
    if (!payingInvoice) return;
    const cleanNum = parseInt(paymentAmountNaira.replace(/[^0-9]/g, ""), 10) || 0;
    const amountKobo = cleanNum * 100;
    if (amountKobo <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    try {
      await act(
        () =>
          services.pay(context, {
            invoiceIds: [payingInvoice.id],
            amount: amountKobo,
            method: paymentMethod,
          }),
        `Payment of ${money(amountKobo)} recorded successfully!`,
      );
      setPayModalVisible(false);
      setPayingInvoice(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to record payment.");
    }
  };

  return (
    <Screen
      title="Parent Dossier"
      subtitle="Guardian profile & family management"
      back={() => (router.canGoBack() ? router.back() : router.replace("/parents" as any))}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Parent Hero Profile Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Avatar name={parentInfo.name} size={64} role="parent" />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {parentInfo.name}
                </Text>
              </View>
              <Text style={styles.heroRole}>{parentInfo.relationship}</Text>
              <View style={styles.badgeRow}>
                <Badge text="VERIFIED GUARDIAN" tone="success" dot />
                <Badge text={`ID: ${parentId.slice(-6).toUpperCase()}`} tone="neutral" />
              </View>
            </View>
          </View>

          {/* Contact Details */}
          <View style={styles.contactDetailsBox}>
            <View style={styles.contactItem}>
              <Icon name="phone" size={14} color={colors.navy} />
              <Text style={styles.contactText}>{parentInfo.phone}</Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="sms" size={14} color={colors.navy} />
              <Text style={styles.contactText} numberOfLines={1}>
                {parentInfo.email}
              </Text>
            </View>
          </View>

          {/* Quick Action Bar */}
          <View style={styles.quickBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Call Parent"
              onPress={handleCall}
              style={styles.quickBarBtn}
            >
              <View style={[styles.quickBarIcon, { backgroundColor: colors.greenLight }]}>
                <Icon name="phone" size={16} color={colors.greenDark} />
              </View>
              <Text style={styles.quickBarLabel}>Call</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="WhatsApp Parent"
              onPress={handleWhatsApp}
              style={styles.quickBarBtn}
            >
              <View style={[styles.quickBarIcon, { backgroundColor: "#dcfce7" }]}>
                <Icon name="chat" size={16} color="#15803d" />
              </View>
              <Text style={styles.quickBarLabel}>WhatsApp</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fee Reminder"
              onPress={handleSendReminder}
              style={styles.quickBarBtn}
            >
              <View style={[styles.quickBarIcon, { backgroundColor: colors.orangeLight }]}>
                <Icon name="sms" size={16} color={colors.orange} />
              </View>
              <Text style={styles.quickBarLabel}>Reminder</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Link Child"
              onPress={() => setLinkModalVisible(true)}
              style={styles.quickBarBtn}
            >
              <View style={[styles.quickBarIcon, { backgroundColor: colors.slate100 }]}>
                <Icon name="plus" size={16} color={colors.navy} />
              </View>
              <Text style={styles.quickBarLabel}>Link Ward</Text>
            </Pressable>
          </View>
        </Card>

        {/* Financial Summary Card */}
        <Card style={styles.financialCard}>
          <View style={styles.finHeader}>
            <View style={{ gap: 2 }}>
              <Text style={styles.finPre}>FAMILY TUITION ACCOUNT</Text>
              <Text style={styles.finTitle}>Cumulative Fees & Cleared Ledger</Text>
            </View>
            <Badge
              text={totalOutstanding > 0 ? "FEES DUE" : "SETTLED"}
              tone={totalOutstanding > 0 ? "warning" : "success"}
              dot
            />
          </View>

          <View style={styles.finMetricsRow}>
            <View style={styles.finMetricCol}>
              <Text style={styles.finMetricLabel}>Total Billed</Text>
              <Text style={styles.finMetricVal}>{money(totalInvoiced)}</Text>
            </View>
            <View style={styles.finDivider} />
            <View style={styles.finMetricCol}>
              <Text style={styles.finMetricLabel}>Settled</Text>
              <Text style={[styles.finMetricVal, { color: colors.greenDark }]}>
                {money(totalPaid)}
              </Text>
            </View>
            <View style={styles.finDivider} />
            <View style={styles.finMetricCol}>
              <Text style={styles.finMetricLabel}>Outstanding</Text>
              <Text style={[styles.finMetricVal, { color: totalOutstanding > 0 ? colors.orange : colors.navy }]}>
                {money(totalOutstanding)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Linked Wards Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ gap: 2 }}>
              <Text style={styles.sectionTitle}>Linked Children ({linkedChildren.length})</Text>
              <Text style={styles.sectionSubtitle}>Wards registered under this guardian</Text>
            </View>
            <Button
              title="Add Child"
              variant="outline"
              size="sm"
              icon="plus"
              onPress={() => setLinkModalVisible(true)}
            />
          </View>

          {linkedChildren.length === 0 ? (
            <Card style={styles.emptyChildCard}>
              <Text style={styles.emptyChildText}>
                No student wards are currently linked to this guardian record.
              </Text>
              <Button
                title="Link Existing Student"
                variant="primary"
                size="md"
                onPress={() => setLinkModalVisible(true)}
              />
            </Card>
          ) : (
            linkedChildren.map((child) => {
              const childInvoices = data.invoices.filter((i) => i.studentId === child.id);
              const childDue = childInvoices.reduce((s, i) => s + balance(i), 0);

              return (
                <Card key={child.id} style={styles.childCard}>
                  <View style={styles.childCardTop}>
                    <Avatar name={child.name} size={44} role="parent" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.childName}>{child.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Badge text={child.className} tone="purple" />
                        {child.classes && child.classes.length > 1 && (
                          <Badge text={`+${child.classes.length - 1} Arm`} tone="neutral" />
                        )}
                        <Text style={styles.childIdText}>ID: {child.id}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.childFeeRow}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.childFeeLabel}>Tuition Outstanding</Text>
                      <Text
                        style={[
                          styles.childFeeVal,
                          childDue > 0 ? { color: colors.orange } : { color: colors.greenDark },
                        ]}
                      >
                        {childDue > 0 ? money(childDue) : "Fully Settled"}
                      </Text>
                    </View>

                    {childDue > 0 && (
                      <Button
                        title="Record Payment"
                        variant="primary"
                        size="sm"
                        onPress={() => {
                          const unpaid = childInvoices.find((i) => balance(i) > 0);
                          if (unpaid) handleOpenRecordPayment(unpaid);
                        }}
                      />
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Invoice Breakdown */}
        {parentInvoices.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Invoices & Official Billing</Text>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {parentInvoices.map((inv, idx) => {
                const isDue = balance(inv) > 0;
                const stud = data.students.find((s) => s.id === inv.studentId);
                const isLast = idx === parentInvoices.length - 1;

                return (
                  <View
                    key={inv.id}
                    style={[
                      styles.invoiceItem,
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.invStudentName}>
                        {stud?.name || "Student Fee"} · {stud?.className}
                      </Text>
                      <Text style={styles.invSub}>
                        Due: {inv.due} · Ref: {inv.id}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={[styles.invAmount, isDue ? { color: colors.orange } : { color: colors.greenDark }]}>
                        {isDue ? `${money(balance(inv))} Due` : "PAID"}
                      </Text>
                      {isDue && (
                        <Pressable
                          onPress={() => handleOpenRecordPayment(inv)}
                          style={styles.invPayBtn}
                        >
                          <Text style={styles.invPayBtnText}>Pay / Settle</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Modal: Link Another Student */}
      <Modal
        visible={linkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setLinkModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link Student to Guardian</Text>
              <Pressable onPress={() => setLinkModalVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={18} color={colors.slate500} />
              </Pressable>
            </View>
            <Text style={styles.modalDesc}>
              Select an enrolled student to link to {parentInfo.name}.
            </Text>

            <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
              {unlinkedStudents.length === 0 ? (
                <Text style={styles.noUnlinkedText}>
                  All students are already associated with guardians.
                </Text>
              ) : (
                unlinkedStudents.map((st) => (
                  <Pressable
                    key={st.id}
                    onPress={() => setSelectedStudentToLink(st.id)}
                    style={[
                      styles.studentPickerItem,
                      selectedStudentToLink === st.id && styles.studentPickerItemActive,
                    ]}
                  >
                    <Avatar name={st.name} size={36} role="parent" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerStudentName}>{st.name}</Text>
                      <Text style={styles.pickerStudentClass}>{st.className} · {st.id}</Text>
                    </View>
                    {selectedStudentToLink === st.id && (
                      <Icon name="check" size={16} color={colors.orange} />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>

            <Button
              title="Confirm & Link Ward"
              variant="primary"
              size="lg"
              disabled={!selectedStudentToLink || busy}
              loading={busy}
              onPress={handleLinkStudent}
            />
          </View>
        </View>
      </Modal>

      {/* Modal: Record Fee Payment */}
      <Modal
        visible={payModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setPayModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Fee Settlement</Text>
              <Pressable onPress={() => setPayModalVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={18} color={colors.slate500} />
              </Pressable>
            </View>

            {payingInvoice && (
              <View style={{ gap: 12 }}>
                <Text style={styles.modalDesc}>
                  Enter the amount paid by {parentInfo.name} for Invoice #{payingInvoice.id}.
                </Text>

                <Field
                  label="Amount Paid (₦)"
                  placeholder="e.g. 50,000"
                  value={paymentAmountNaira}
                  onChangeText={setPaymentAmountNaira}
                  numeric
                  icon="wallet"
                />

                <View style={{ gap: 6 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.navy }}>
                    Payment Channel
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => setPaymentMethod("transfer")}
                      style={[
                        styles.methodChip,
                        paymentMethod === "transfer" && styles.methodChipActive,
                      ]}
                    >
                      <Icon name="card" size={14} color={paymentMethod === "transfer" ? "#ffffff" : colors.navy} />
                      <Text
                        style={[
                          styles.methodChipText,
                          paymentMethod === "transfer" && styles.methodChipTextActive,
                        ]}
                      >
                        Bank Transfer
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setPaymentMethod("card")}
                      style={[
                        styles.methodChip,
                        paymentMethod === "card" && styles.methodChipActive,
                      ]}
                    >
                      <Icon name="wallet" size={14} color={paymentMethod === "card" ? "#ffffff" : colors.navy} />
                      <Text
                        style={[
                          styles.methodChipText,
                          paymentMethod === "card" && styles.methodChipTextActive,
                        ]}
                      >
                        Online Card
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Button
                  title="Confirm & Record Receipt"
                  variant="primary"
                  size="lg"
                  loading={busy}
                  disabled={busy || !paymentAmountNaira.trim()}
                  onPress={handleExecutePayment}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 100,
  },
  heroCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroName: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  heroRole: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  contactDetailsBox: {
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  quickBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  quickBarBtn: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  quickBarIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBarLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  financialCard: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  finHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  finPre: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate500,
    letterSpacing: 0.8,
  },
  finTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  finMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  finMetricCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  finMetricLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  finMetricVal: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  finDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  childCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  childCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  childName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  childIdText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  childFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate100,
    padding: 10,
    borderRadius: radii.md,
  },
  childFeeLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  childFeeVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  emptyChildCard: {
    padding: spacing.lg,
    alignItems: "center",
    gap: 12,
  },
  emptyChildText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  invoiceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  invStudentName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  invSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  invAmount: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  invPayBtn: {
    backgroundColor: colors.orangeLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  invPayBtnText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.orange,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  modalScrim: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
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
  modalCloseBtn: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: colors.slate100,
  },
  modalDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate600,
  },
  noUnlinkedText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    padding: 12,
    textAlign: "center",
  },
  studentPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  studentPickerItemActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  pickerStudentName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  pickerStudentClass: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  methodChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  methodChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  methodChipTextActive: {
    color: "#ffffff",
  },
});
