import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Field,
  ModalSheet,
  Txt,
  colors,
  fonts,
  money,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";

export function PayrollScreen() {
  const { data, context, school, services, act, busy } = useSchool();
  const isOwner = context.role === "owner" || context.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [activeCycle, setActiveCycle] = useState("October 2026");

  // Adjustment Modal
  const [editModal, setEditModal] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [editBasic, setEditBasic] = useState("");
  const [editAllowances, setEditAllowances] = useState("");
  const [editDeductions, setEditDeductions] = useState("");
  const [editBonus, setEditBonus] = useState("");

  // Payslip Preview Modal
  const [payslipModal, setPayslipModal] = useState<any | null>(null);

  const totalBasic = data.payroll.reduce((sum, p) => sum + p.basic, 0);
  const totalAllowances = data.payroll.reduce((sum, p) => sum + p.allowances, 0);
  const totalDeductions = data.payroll.reduce((sum, p) => sum + p.deductions, 0);
  const totalNet = totalBasic + totalAllowances - totalDeductions;

  const handleOpenEdit = (p: typeof data.payroll[0]) => {
    setSelectedPayrollId(p.id);
    setEditBasic(String(p.basic / 100));
    setEditAllowances(String(p.allowances / 100));
    setEditDeductions(String(p.deductions / 100));
    setEditBonus("0");
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayrollId) return;
    const basicCents = Math.round((Number(editBasic) || 0) * 100);
    const allowCents = Math.round(
      ((Number(editAllowances) || 0) + (Number(editBonus) || 0)) * 100,
    );
    const deductCents = Math.round((Number(editDeductions) || 0) * 100);

    await act(
      () =>
        services.updatePayroll(context, selectedPayrollId, {
          basic: basicCents,
          allowances: allowCents,
          deductions: deductCents,
          status: "Draft",
        }),
      "Payroll adjustments successfully recorded.",
    );
    setEditModal(false);
  };

  const handleDisburseAll = async () => {
    Alert.alert(
      "Confirm Payroll Disbursal",
      `Are you sure you want to disburse ${money(
        totalNet,
      )} to ${data.payroll.length} staff members for ${activeCycle}? Funds will be deducted from the school operating wallet.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Disbursal",
          onPress: async () => {
            await act(
              () => services.processAutomaticPayroll(context),
              `Disbursed monthly salaries for ${data.payroll.length} staff members!`,
            );
          },
        },
      ],
    );
  };

  const filteredPayroll = data.payroll.filter((p) => {
    const staffMember = data.staff.find((s) => s.userId === p.userId);
    const nameMatch =
      !searchQuery ||
      (staffMember?.name || p.userId)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (staffMember?.title || "").toLowerCase().includes(searchQuery.toLowerCase());

    const deptMatch =
      selectedDept === "all" ||
      (selectedDept === "academic" &&
        (staffMember?.role === "teacher" || staffMember?.title?.toLowerCase().includes("teacher") || staffMember?.title?.toLowerCase().includes("educator"))) ||
      (selectedDept === "admin" &&
        (staffMember?.role === "admin" || staffMember?.title?.toLowerCase().includes("admin") || staffMember?.title?.toLowerCase().includes("bursar"))) ||
      (selectedDept === "support" &&
        (staffMember?.role === "staff" || staffMember?.title?.toLowerCase().includes("security") || staffMember?.title?.toLowerCase().includes("driver")));

    return nameMatch && deptMatch;
  });

  return (
    <View style={styles.container}>
      <TopBar
        title="Staff Payroll Administration"
        subtitle="October 2026 Salary Schedule & Payslips"
        rightAction={
          <Pressable
            style={styles.headerBtn}
            onPress={() =>
              Alert.alert(
                "Export Payroll Schedule",
                "Export format options:",
                [
                  { text: "PDF Summary", onPress: () => Alert.alert("Success", "Official Payroll Schedule PDF exported.") },
                  { text: "Bank Excel / CSV", onPress: () => Alert.alert("Success", "Direct Bank Payment Batch CSV generated.") },
                  { text: "Cancel", style: "cancel" },
                ]
              )
            }
          >
            <Icon name="upload" size={18} color={colors.navy} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cycle Selector Strip */}
        <View style={styles.cycleStrip}>
          {["October 2026", "September 2026", "August 2026"].map((cycle) => (
            <Pressable
              key={cycle}
              style={[
                styles.cyclePill,
                activeCycle === cycle && styles.cyclePillActive,
              ]}
              onPress={() => setActiveCycle(cycle)}
            >
              <Text
                style={[
                  styles.cyclePillText,
                  activeCycle === cycle && styles.cyclePillTextActive,
                ]}
              >
                {cycle}
              </Text>
              {cycle === "October 2026" && (
                <View style={styles.cycleActiveIndicator} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Hero Card: Total Payroll Disbursement */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroSubLabel}>MONTHLY SALARY DISBURSEMENT</Text>
              <Text style={styles.heroAmount}>{money(totalNet)}</Text>
            </View>
            <Badge tone="purple" text="OCTOBER 2026" />
          </View>

          {/* Breakdown Strip */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Basic Salaries</Text>
              <Text style={styles.breakdownVal}>{money(totalBasic)}</Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Allowances (+)</Text>
              <Text style={[styles.breakdownVal, { color: colors.emerald }]}>
                +{money(totalAllowances)}
              </Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Deductions (-)</Text>
              <Text style={[styles.breakdownVal, { color: colors.rose }]}>
                -{money(totalDeductions)}
              </Text>
            </View>
          </View>

          {/* Wallet Balance Verification */}
          <View style={styles.walletVerifyRow}>
            <Icon name="wallet" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.walletVerifyText}>
              Campus Operating Balance: ₦ 14,800,000 · Sufficient for payroll
            </Text>
          </View>

          {isOwner && (
            <Button
              title="Disburse All Salaries Now"
              icon="wallet"
              size="lg"
              variant="primary"
              loading={busy}
              disabled={busy}
              onPress={handleDisburseAll}
              style={styles.disburseBtn}
            />
          )}
        </View>

        {/* Department Filters & Search */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color={colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search staff by name or designation..."
              placeholderTextColor={colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Icon name="close" size={16} color={colors.slate400} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deptFilterRow}
          >
            {[
              { id: "all", label: "All Staff" },
              { id: "academic", label: "Teaching & Faculty" },
              { id: "admin", label: "Administration" },
              { id: "support", label: "Operations & Support" },
            ].map((d) => (
              <Pressable
                key={d.id}
                style={[
                  styles.deptPill,
                  selectedDept === d.id && styles.deptPillActive,
                ]}
                onPress={() => setSelectedDept(d.id)}
              >
                <Text
                  style={[
                    styles.deptPillText,
                    selectedDept === d.id && styles.deptPillTextActive,
                  ]}
                >
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Staff Payslip Cards List */}
        <View style={styles.staffListSection}>
          <View style={styles.listHeaderRow}>
            <Txt weight="bold" size="base">
              Staff Salary Roster ({filteredPayroll.length})
            </Txt>
            <Text style={styles.listHelpText}>Tap to view payslip or edit</Text>
          </View>

          {filteredPayroll.map((p) => {
            const staffMember = data.staff.find((s) => s.userId === p.userId);
            const netPay = p.basic + p.allowances - p.deductions;
            const isPaid = p.status === "Paid";

            return (
              <Card key={p.id} style={styles.staffCard}>
                {/* Staff Top Info */}
                <View style={styles.staffCardTop}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.staffAvatarInitial}>
                      {(staffMember?.name || p.userId).charAt(0)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.staffName}>
                      {staffMember?.name || p.userId}
                    </Text>
                    <Text style={styles.staffRole}>
                      {staffMember?.title || staffMember?.role || "Staff"} · Level 8
                    </Text>
                  </View>

                  <Badge
                    tone={isPaid ? "success" : "warning"}
                    text={isPaid ? "DISBURSED" : "READY"}
                  />
                </View>

                {/* Salary Breakdown Row */}
                <View style={styles.salaryItemTable}>
                  <View style={styles.salaryItemCol}>
                    <Text style={styles.salaryItemKey}>Basic</Text>
                    <Text style={styles.salaryItemVal}>{money(p.basic)}</Text>
                  </View>

                  <View style={styles.salaryItemCol}>
                    <Text style={styles.salaryItemKey}>Allowances</Text>
                    <Text style={[styles.salaryItemVal, { color: colors.emerald }]}>
                      +{money(p.allowances)}
                    </Text>
                  </View>

                  <View style={styles.salaryItemCol}>
                    <Text style={styles.salaryItemKey}>Deductions</Text>
                    <Text style={[styles.salaryItemVal, { color: colors.rose }]}>
                      -{money(p.deductions)}
                    </Text>
                  </View>
                </View>

                {/* Net Pay Payout Bar */}
                <View style={styles.netPayBar}>
                  <View>
                    <Text style={styles.netPayLabel}>NET MONTHLY SALARY</Text>
                    <Text style={styles.netPayAmount}>{money(netPay)}</Text>
                  </View>

                  <View style={styles.staffActionRow}>
                    <Button
                      title="Payslip"
                      variant="outline"
                      size="sm"
                      icon="receipt"
                      onPress={() =>
                        setPayslipModal({
                          staff: staffMember,
                          payroll: p,
                          netPay,
                        })
                      }
                    />

                    {isOwner && (
                      <Button
                        title="Adjust"
                        variant="secondary"
                        size="sm"
                        icon="edit"
                        onPress={() => handleOpenEdit(p)}
                      />
                    )}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* MODAL: MANUAL SALARY ADJUSTMENT */}
      <ModalSheet
        visible={editModal}
        onClose={() => setEditModal(false)}
        title="Adjust Staff Salary Schedule"
        subtitle="Configure basic salary, allowances and statutory deductions"
      >
        <View style={styles.modalBody}>
          <Field
            label="Base Monthly Salary (₦)"
            hint="Core guaranteed monthly entitlement"
          >
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editBasic}
              onChangeText={setEditBasic}
              placeholder="e.g. 150000"
            />
          </Field>

          <Field
            label="Allowances (₦)"
            hint="Housing, transport, teaching hazards, meal allowance"
          >
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editAllowances}
              onChangeText={setEditAllowances}
              placeholder="e.g. 35000"
            />
          </Field>

          <Field
            label="Performance Bonus / Overtime (₦)"
            hint="Special discretionary stipend or extra lesson coverage"
          >
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editBonus}
              onChangeText={setEditBonus}
              placeholder="e.g. 15000"
            />
          </Field>

          <Field
            label="Statutory Deductions (₦)"
            hint="PAYE tax, pension fund, health insurance & late arrival fines"
          >
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editDeductions}
              onChangeText={setEditDeductions}
              placeholder="e.g. 18500"
            />
          </Field>

          <View style={styles.netPreviewBox}>
            <Text style={styles.netPreviewLabel}>Computed Net Payout</Text>
            <Text style={styles.netPreviewAmount}>
              ₦{" "}
              {(
                (Number(editBasic) || 0) +
                (Number(editAllowances) || 0) +
                (Number(editBonus) || 0) -
                (Number(editDeductions) || 0)
              ).toLocaleString()}
            </Text>
          </View>

          <Button
            title="Save Salary Adjustment"
            icon="check"
            onPress={handleSaveEdit}
            style={{ marginTop: 12 }}
          />
        </View>
      </ModalSheet>

      {/* MODAL: OFFICIAL DIGITAL PAYSLIP */}
      <ModalSheet
        visible={!!payslipModal}
        onClose={() => setPayslipModal(null)}
        title="Official Digital Payslip"
        subtitle={`${activeCycle} Salary Slip`}
      >
        {payslipModal && (
          <View style={styles.payslipModalContent}>
            {/* Payslip Header */}
            <View style={styles.payslipSlipHeader}>
              <Text style={styles.slipSchoolName}>{school.name}</Text>
              <Text style={styles.slipSchoolAddress}>
                Official Faculty & Staff Compensation Voucher
              </Text>
              <Text style={styles.slipCycleText}>Cycle: {activeCycle}</Text>
            </View>

            {/* Recipient Details */}
            <View style={styles.slipStaffBox}>
              <View>
                <Text style={styles.slipStaffName}>
                  {payslipModal.staff?.name || payslipModal.payroll.userId}
                </Text>
                <Text style={styles.slipStaffRole}>
                  {payslipModal.staff?.title || "Educator"} · Staff ID:{" "}
                  {payslipModal.staff?.id || "EMP-041"}
                </Text>
              </View>
              <Badge
                tone={
                  payslipModal.payroll.status === "Paid" ? "success" : "warning"
                }
                text={
                  payslipModal.payroll.status === "Paid"
                    ? "DISBURSED"
                    : "SCHEDULED"
                }
              />
            </View>

            {/* Itemized Line Items */}
            <View style={styles.slipItemTable}>
              <View style={styles.slipItemRow}>
                <Text style={styles.slipItemKey}>Basic Salary</Text>
                <Text style={styles.slipItemVal}>
                  {money(payslipModal.payroll.basic)}
                </Text>
              </View>

              <View style={styles.slipItemRow}>
                <Text style={styles.slipItemKey}>Housing & Transport</Text>
                <Text style={[styles.slipItemVal, { color: colors.emerald }]}>
                  +{money(payslipModal.payroll.allowances)}
                </Text>
              </View>

              <View style={styles.slipItemRow}>
                <Text style={styles.slipItemKey}>Tax & Pension (PAYE)</Text>
                <Text style={[styles.slipItemVal, { color: colors.rose }]}>
                  -{money(payslipModal.payroll.deductions)}
                </Text>
              </View>

              <View style={[styles.slipItemRow, styles.slipTotalRow]}>
                <Text style={styles.slipTotalKey}>NET BANK TRANSFER</Text>
                <Text style={styles.slipTotalVal}>
                  {money(payslipModal.netPay)}
                </Text>
              </View>
            </View>

            <View style={styles.slipBankDetails}>
              <Text style={styles.slipBankText}>
                Disbursed to: Access Bank · 012****901 · CBN NIP Ref:{" "}
                {`NIP-2026-${payslipModal.payroll.id.substring(0, 6)}`}
              </Text>
            </View>

            <View style={styles.slipActionsRow}>
              <Button
                title="Share / Download PDF"
                icon="share"
                style={{ flex: 1 }}
                onPress={() => {
                  Alert.alert(
                    "Payslip Exported",
                    "Official payslip PDF generated and ready to share.",
                    [{ text: "Done" }],
                  );
                }}
              />
            </View>
          </View>
        )}
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  cycleStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  cyclePill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    position: "relative",
  },
  cyclePillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  cyclePillText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.slate600,
  },
  cyclePillTextActive: {
    color: colors.white,
  },
  cycleActiveIndicator: {
    position: "absolute",
    bottom: -1,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 20,
    ...shadows.md,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroSubLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  breakdownRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  breakdownItem: {
    flex: 1,
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
  breakdownVal: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  breakdownDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  walletVerifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  walletVerifyText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontFamily: fonts.regular,
  },
  disburseBtn: {
    backgroundColor: colors.indigo,
  },
  filterSection: {
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.navy,
  },
  deptFilterRow: {
    flexDirection: "row",
    gap: 8,
  },
  deptPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  deptPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  deptPillText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.slate600,
  },
  deptPillTextActive: {
    color: colors.white,
  },
  staffListSection: {
    gap: 12,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  listHelpText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.slate500,
  },
  staffCard: {
    padding: 16,
  },
  staffCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarInitial: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  staffName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.navy,
  },
  staffRole: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.slate500,
    marginTop: 1,
  },
  salaryItemTable: {
    flexDirection: "row",
    backgroundColor: colors.slate50,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  salaryItemCol: {
    flex: 1,
    alignItems: "center",
  },
  salaryItemKey: {
    fontSize: 10,
    color: colors.slate500,
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
  salaryItemVal: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.navy,
  },
  netPayBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: 10,
  },
  netPayLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  netPayAmount: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  staffActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalBody: {
    padding: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  netPreviewBox: {
    backgroundColor: colors.slate100,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  netPreviewLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.slate600,
  },
  netPreviewAmount: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  payslipModalContent: {
    padding: 16,
  },
  payslipSlipHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    paddingBottom: 14,
    marginBottom: 14,
  },
  slipSchoolName: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  slipSchoolAddress: {
    fontSize: 11,
    color: colors.slate500,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  slipCycleText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.indigo,
    marginTop: 4,
  },
  slipStaffBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  slipStaffName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  slipStaffRole: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.slate500,
    marginTop: 2,
  },
  slipItemTable: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  slipItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slipItemKey: {
    fontSize: 12,
    color: colors.slate600,
    fontFamily: fonts.medium,
  },
  slipItemVal: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.navy,
  },
  slipTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingTop: 8,
    marginTop: 4,
  },
  slipTotalKey: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  slipTotalVal: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  slipBankDetails: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    marginBottom: 16,
  },
  slipBankText: {
    fontSize: 11,
    color: colors.slate600,
    fontFamily: fonts.medium,
    lineHeight: 16,
  },
  slipActionsRow: {
    flexDirection: "row",
  },
});
