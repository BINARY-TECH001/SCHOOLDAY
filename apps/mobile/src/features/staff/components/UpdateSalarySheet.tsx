import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Button, ConfirmationDialog, ModalSheet } from "../../../components/ui";
import { money, Payroll } from "../../../domain/model";

export interface UpdateSalarySheetProps {
  visible: boolean;
  onClose: () => void;
  staffName: string;
  currentPayroll?: Payroll;
  onSavePayroll: (
    basicKobo: number,
    allowancesKobo: number,
    deductionsKobo: number
  ) => Promise<void>;
}

export function UpdateSalarySheet({
  visible,
  onClose,
  staffName,
  currentPayroll,
  onSavePayroll,
}: UpdateSalarySheetProps) {
  const initialBasic = currentPayroll ? currentPayroll.basic / 100 : 180000;
  const initialAllowances = currentPayroll ? currentPayroll.allowances / 100 : 25000;
  const initialDeductions = currentPayroll ? currentPayroll.deductions / 100 : 15000;

  const [basicNaira, setBasicNaira] = useState(String(initialBasic));
  const [allowancesNaira, setAllowancesNaira] = useState(String(initialAllowances));
  const [deductionsNaira, setDeductionsNaira] = useState(String(initialDeductions));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const numBasic = parseInt(basicNaira.replace(/[^0-9]/g, ""), 10) || 0;
  const numAllowances = parseInt(allowancesNaira.replace(/[^0-9]/g, ""), 10) || 0;
  const numDeductions = parseInt(deductionsNaira.replace(/[^0-9]/g, ""), 10) || 0;
  const netNaira = Math.max(0, numBasic + numAllowances - numDeductions);

  const handleOpenConfirm = () => {
    if (numBasic <= 0) {
      toast.error("Please enter a valid basic salary amount.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleCommit = async () => {
    setSaving(true);
    try {
      await onSavePayroll(numBasic * 100, numAllowances * 100, numDeductions * 100);
      setConfirmOpen(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalSheet
        visible={visible}
        onClose={onClose}
        title="Employment & Salary Structure"
        subtitle={`Configure compensation policy for ${staffName}`}
      >
        <View style={styles.container}>
          <View style={styles.field}>
            <Text style={styles.label}>Basic Monthly Salary (₦)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 180000"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={basicNaira}
              onChangeText={setBasicNaira}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Approved Allowances (₦)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25000"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={allowancesNaira}
              onChangeText={setAllowancesNaira}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Statutory / Policy Deductions (₦)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15000"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={deductionsNaira}
              onChangeText={setDeductionsNaira}
            />
          </View>

          {/* Live Net Preview Card */}
          <View style={styles.netPreviewCard}>
            <Text style={styles.netPreviewLabel}>ESTIMATED MONTHLY NET PAY</Text>
            <Text style={styles.netPreviewAmount}>{money(netNaira * 100)}</Text>
            <Text style={styles.netPreviewNote}>
              Basic (₦{numBasic.toLocaleString()}) + Allowances (₦{numAllowances.toLocaleString()}) - Deductions (₦{numDeductions.toLocaleString()})
            </Text>
          </View>

          <Button
            title="Review & Confirm Changes"
            variant="primary"
            size="lg"
            onPress={handleOpenConfirm}
          />
        </View>
      </ModalSheet>

      <ConfirmationDialog
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Salary Adjustment"
        message={`Are you sure you want to adjust the compensation package for ${staffName} to a net monthly pay of ${money(netNaira * 100)}? This adjustment will take effect in the upcoming payroll period.`}
        confirmText="Confirm & Save"
        cancelText="Cancel"
        loading={saving}
        onConfirm={handleCommit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: 4,
  },
  field: {
    gap: 4,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  netPreviewCard: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
    gap: 4,
  },
  netPreviewLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.greenText,
  },
  netPreviewAmount: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.navy,
  },
  netPreviewNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
