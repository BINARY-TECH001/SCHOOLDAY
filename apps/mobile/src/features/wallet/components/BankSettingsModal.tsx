import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Button } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { useSchool } from "../../../providers/AppProvider";

interface BankSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const NIGERIAN_BANKS = [
  "Access Bank",
  "Zenith Bank",
  "Guaranty Trust Bank (GTBank)",
  "First Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Providus Bank",
  "Wema Bank / ALAT",
  "Stanbic IBTC Bank",
  "Kuda Bank",
  "Moniepoint Microfinance Bank",
  "OPay Digital Services",
  "FCMB",
  "Sterling Bank",
  "Fidelity Bank",
  "Union Bank",
];

export function BankSettingsModal({ visible, onClose }: BankSettingsModalProps) {
  const { school, context, services, act, busy } = useSchool();

  const [bankName, setBankName] = useState(school.bankName || "Wema Bank / ALAT");
  const [accountNumber, setAccountNumber] = useState(school.accountNumber || "");
  const [accountName, setAccountName] = useState(school.accountName || school.name);
  const [selectingBank, setSelectingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  useEffect(() => {
    if (visible) {
      setBankName(school.bankName || "Wema Bank / ALAT");
      setAccountNumber(school.accountNumber || "");
      setAccountName(school.accountName || school.name);
      setSelectingBank(false);
      setBankSearch("");
    }
  }, [visible, school]);

  const filteredBanks = NIGERIAN_BANKS.filter((b) =>
    b.toLowerCase().includes(bankSearch.toLowerCase().trim()),
  );

  const handleSave = async () => {
    const cleanAcc = accountNumber.trim().replace(/\s+/g, "");
    if (!/^\d{10}$/.test(cleanAcc)) {
      toast.error("Invalid NUBAN", {
        description: "Please enter a valid 10-digit Nigerian bank account number.",
      });
      return;
    }

    if (!bankName.trim()) {
      toast.error("Bank Required", {
        description: "Please select your settlement bank.",
      });
      return;
    }

    if (!accountName.trim() || accountName.trim().length < 3) {
      toast.error("Account Name Required", {
        description: "Please enter the registered beneficiary account name.",
      });
      return;
    }

    try {
      await act(
        () =>
          services.updateSchool(context, {
            bankName: bankName.trim(),
            accountNumber: cleanAcc,
            accountName: accountName.trim(),
          }),
        "Settlement bank account updated successfully!"
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update settlement account.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconTile}>
              <Icon name="card" size={20} color={colors.navy} filled />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>School Settlement Account</Text>
              <Text style={styles.subtitle}>
                Official Paystack / NIP Bank Wire Destination
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Icon name="close" size={20} color={colors.slate400} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Bank Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Settlement Bank</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select Bank"
                onPress={() => setSelectingBank(!selectingBank)}
                style={styles.bankPickerTrigger}
              >
                <Text style={styles.bankPickerValue}>{bankName}</Text>
                <Icon name={selectingBank ? "close" : "filter"} size={16} color={colors.slate500} />
              </Pressable>

              {selectingBank && (
                <View style={styles.bankDropdown}>
                  <TextInput
                    style={styles.bankSearchInput}
                    placeholder="Search bank name..."
                    placeholderTextColor={colors.slate400}
                    value={bankSearch}
                    onChangeText={setBankSearch}
                    autoCapitalize="none"
                  />
                  <ScrollView style={styles.bankList} nestedScrollEnabled>
                    {filteredBanks.map((b) => (
                      <Pressable
                        key={b}
                        style={[
                          styles.bankOption,
                          b === bankName && styles.bankOptionSelected,
                        ]}
                        onPress={() => {
                          setBankName(b);
                          setSelectingBank(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.bankOptionText,
                            b === bankName && styles.bankOptionTextSelected,
                          ]}
                        >
                          {b}
                        </Text>
                        {b === bankName && (
                          <Icon name="verify" size={16} color={colors.orange} filled />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Account Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>10-Digit Account Number (NUBAN)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 0123456789"
                placeholderTextColor={colors.slate400}
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text style={styles.helperText}>
                Must be an active 10-digit NUBAN recognized by NIP clearing banks.
              </Text>
            </View>

            {/* Account Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Beneficiary / Account Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Official School Account Name"
                placeholderTextColor={colors.slate400}
                value={accountName}
                onChangeText={setAccountName}
                autoCapitalize="words"
              />
              <Text style={styles.helperText}>
                The registered corporate or institutional entity on your bank statement.
              </Text>
            </View>

            {/* Verification Notice */}
            <View style={styles.callout}>
              <Icon name="verify" size={16} color={colors.greenDark} filled />
              <Text style={styles.calloutText}>
                Parent fee payments made via bank transfer or Paystack will be automatically
                reconciled and routed directly to this verified account.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Save & Validate Account"
              variant="primary"
              size="lg"
              loading={busy}
              onPress={handleSave}
            />
            <Button
              title="Cancel"
              variant="ghost"
              size="md"
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: "90%",
    paddingBottom: spacing.xl,
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.slate700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bankPickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.slate50,
  },
  bankPickerValue: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  bankDropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    maxHeight: 200,
    ...shadows.sm,
  },
  bankSearchInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  bankList: {
    maxHeight: 150,
  },
  bankOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate50,
  },
  bankOptionSelected: {
    backgroundColor: colors.orangeLight,
  },
  bankOptionText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.slate700,
  },
  bankOptionTextSelected: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },
  callout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.greenLight,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    marginTop: 4,
  },
  calloutText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.greenDark,
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
});
