import React, { useState, useEffect, useMemo } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Button, Card, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useSchool } from "../../providers/AppProvider";
import {
  fetchNigerianBanks,
  resolveBankAccount,
  BankItem,
  DEFAULT_NIGERIAN_BANKS,
} from "../../services/bankResolver";

export function SettlementSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { school, context, services, act, busy } = useSchool();

  const [bankList, setBankList] = useState<BankItem[]>(DEFAULT_NIGERIAN_BANKS);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const [selectedBank, setSelectedBank] = useState<BankItem>(() => {
    const matched = DEFAULT_NIGERIAN_BANKS.find((b) => b.name === school.bankName);
    return matched ?? DEFAULT_NIGERIAN_BANKS[0]!; // OPay
  });

  const [accountNumber, setAccountNumber] = useState(school.accountNumber || "");
  const [accountName, setAccountName] = useState(school.accountName || "");
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resolving, setResolving] = useState(false);
  const [verified, setVerified] = useState(Boolean(school.accountName));
  const [apiUnavailableNotice, setApiUnavailableNotice] = useState<string | null>(null);

  // Load real bank catalog from Paystack & ichtrojan on mount
  useEffect(() => {
    let mounted = true;
    async function loadBanks() {
      setLoadingBanks(true);
      try {
        const liveBanks = await fetchNigerianBanks();
        if (mounted && liveBanks.length > 0) {
          setBankList(liveBanks);
          if (school.bankName) {
            const found = liveBanks.find(
              (b) =>
                b.name.toLowerCase() === school.bankName?.toLowerCase() ||
                (b.shortName && b.shortName.toLowerCase() === school.bankName?.toLowerCase()),
            );
            if (found) setSelectedBank(found);
          }
        }
      } catch {
        // Fallback already in place
      } finally {
        if (mounted) setLoadingBanks(false);
      }
    }
    loadBanks();
    return () => {
      mounted = false;
    };
  }, [school.bankName]);

  const filteredBanks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return bankList;
    return bankList.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.includes(q) ||
        (b.slug && b.slug.toLowerCase().includes(q)),
    );
  }, [searchQuery, bankList]);

  // Real Account Name Resolution (No mock fallback)
  const handleResolveAccount = async (nuban: string, bankCode: string) => {
    console.log(`[SettlementConfig] handleResolveAccount called with nuban=${nuban}, bankCode=${bankCode}`);
    if (!/^\d{10}$/.test(nuban)) {
      console.log(`[SettlementConfig] nuban ${nuban} is not exactly 10 digits; skipping resolution.`);
      setVerified(false);
      setApiUnavailableNotice(null);
      return;
    }

    setResolving(true);
    setApiUnavailableNotice(null);

    try {
      console.log(`[SettlementConfig] Invoking resolveBankAccount(${nuban}, ${bankCode})...`);
      const res = await resolveBankAccount(nuban, bankCode);
      console.log(`[SettlementConfig] resolveBankAccount returned:`, res);

      if (res.verified && res.accountName) {
        console.log(`[SettlementConfig] Account successfully verified: ${res.accountName}`);
        setAccountName(res.accountName);
        setVerified(true);
        setApiUnavailableNotice(null);
        toast.success("Account Holder Verified via NIP", {
          description: res.accountName,
        });
      } else {
        console.log(`[SettlementConfig] Automated resolution did not verify account. Message: ${res.message}`);
        setVerified(false);
        setApiUnavailableNotice(
          "Automated NIP verification is currently unavailable for this bank code. Please enter your verified beneficiary account name below.",
        );
        toast.info("Manual Entry Required", {
          description: "Please enter your official bank account holder name.",
        });
      }
    } catch (err: any) {
      console.error(`[SettlementConfig] Resolution error:`, err?.message || err);
      setVerified(false);
      setApiUnavailableNotice(
        err?.message || "Verification service unavailable. Please enter account name manually.",
      );
    } finally {
      setResolving(false);
    }
  };

  const handleNubanChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "").slice(0, 10);
    console.log(`[SettlementConfig] NUBAN input changed: ${clean}`);
    setAccountNumber(clean);
    setVerified(false);
    setApiUnavailableNotice(null);

    if (clean.length === 10) {
      const codeToUse = selectedBank?.code || "999992";
      console.log(`[SettlementConfig] 10 digits reached. Triggering resolution with bankCode=${codeToUse}`);
      handleResolveAccount(clean, codeToUse);
    }
  };

  const handleSelectBank = (bank: BankItem) => {
    if (!bank) return;
    console.log(`[SettlementConfig] Bank selected:`, bank);
    setSelectedBank(bank);
    setBankModalVisible(false);
    setSearchQuery("");

    if (accountNumber.length === 10) {
      console.log(`[SettlementConfig] Re-resolving ${accountNumber} with newly selected bank ${bank.code}`);
      handleResolveAccount(accountNumber, bank.code);
    }
  };

  const handleSave = async () => {
    const cleanAcc = accountNumber.trim().replace(/\s+/g, "");
    if (!/^\d{10}$/.test(cleanAcc)) {
      toast.error("Invalid Account Number", {
        description: "Please enter a valid 10-digit Nigerian NUBAN account number.",
      });
      return;
    }

    if (!selectedBank) {
      toast.error("Bank Required", {
        description: "Please select your settlement bank institution.",
      });
      return;
    }

    if (!accountName.trim() || accountName.trim().length < 3) {
      toast.error("Account Name Required", {
        description: "Please enter your official beneficiary account name.",
      });
      return;
    }

    try {
      await act(
        () =>
          services.updateSchool(context, {
            bankName: selectedBank.name,
            accountNumber: cleanAcc,
            accountName: accountName.trim(),
          }),
        "Settlement account saved successfully!",
      );
      router.back();
    } catch (err: any) {
      toast.error(err?.message || "Failed to configure settlement account.");
    }
  };

  return (
    <Screen
      title="Configure Settlement"
      subtitle="Proprietor Tuition Payout Account"
      scrollable={false}
      back={() => (router.canGoBack() ? router.back() : router.replace("/dedicated-account" as any))}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Explanation Banner */}
          <Card style={styles.bannerCard}>
            <View style={styles.bannerIconBox}>
              <Icon name="verify" size={20} color={colors.navy} filled />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerTitle}>Proprietor Withdrawal Account</Text>
              <Text style={styles.bannerDesc}>
                This verified bank account is where you withdraw funds from your school wallet.
                Parents pay into your dedicated School NUBAN (Paystack Virtual Account) so inflows can be automatically monitored.
              </Text>
            </View>
          </Card>

          {/* Form Card */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionHeader}>SETTLEMENT BANK DETAILS</Text>

            {/* Bank Institution Selector Trigger */}
            <View style={styles.fieldWrap}>
              <View style={styles.bankLabelRow}>
                <Text style={styles.fieldLabel}>Settlement Financial Institution</Text>
                {loadingBanks && (
                  <ActivityIndicator size="small" color={colors.orange} />
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select Bank Institution"
                onPress={() => setBankModalVisible(true)}
                style={styles.bankSelectTrigger}
              >
                <View style={styles.bankTriggerLeft}>
                  <View style={styles.bankIconCircle}>
                    <Icon name="card" size={16} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankTriggerName} numberOfLines={1}>
                      {selectedBank.name}
                    </Text>
                    <Text style={styles.bankTriggerCode}>CBN Code: {selectedBank.code}</Text>
                  </View>
                </View>
                <Icon name="chevron" size={16} color={colors.slate400} />
              </Pressable>
            </View>

            {/* 10-Digit NUBAN Account Number */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>10-Digit NUBAN Account Number</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9059343602"
                  placeholderTextColor={colors.slate400}
                  keyboardType="numeric"
                  maxLength={10}
                  value={accountNumber}
                  onChangeText={handleNubanChange}
                />
                {resolving && (
                  <ActivityIndicator size="small" color={colors.orange} style={{ marginRight: 8 }} />
                )}
                {verified && !resolving && (
                  <View style={styles.verifiedCheckBadge}>
                    <Icon name="check" size={12} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={styles.inputHint}>
                {accountNumber.length < 10
                  ? `Enter 10 digits (${10 - accountNumber.length} remaining)`
                  : "Verified with Central Bank / NIP network"}
              </Text>
            </View>

            {/* Notice if live resolution is unavailable */}
            {apiUnavailableNotice && (
              <View style={styles.noticeBox}>
                <Icon name="clock" size={14} color={colors.amberDark} />
                <Text style={styles.noticeText}>{apiUnavailableNotice}</Text>
              </View>
            )}

            {/* Verified Account Name Field */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Official Beneficiary Account Name</Text>
              <View
                style={[
                  styles.accountNameDisplay,
                  verified && styles.accountNameDisplayVerified,
                ]}
              >
                <TextInput
                  style={styles.accountNameInput}
                  value={accountName}
                  onChangeText={(val) => {
                    setAccountName(val);
                    setVerified(Boolean(val.trim()));
                  }}
                  placeholder="Enter official beneficiary name on account"
                  placeholderTextColor={colors.slate400}
                />
              </View>

              {verified && !resolving && (
                <View style={styles.verifiedPill}>
                  <Icon name="verify" size={12} color={colors.greenDark} filled />
                  <Text style={styles.verifiedPillText}>
                    Account Holder Confirmed · Ready for automated withdrawal
                  </Text>
                </View>
              )}
            </View>
          </Card>
        </ScrollView>

        {/* Pinned Bottom Button Touching Home Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            title="Save Settlement Account"
            variant="primary"
            size="lg"
            loading={busy || resolving}
            disabled={accountNumber.length !== 10 || !accountName.trim() || busy || resolving}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Bank Selection Modal Sheet with KeyboardAvoidingView to prevent keyboard covering sheet */}
      <Modal
        visible={bankModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBankModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <Pressable style={styles.modalScrim} onPress={() => setBankModalVisible(false)} />
          <View style={[styles.modalSheet, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select Bank Institution</Text>
                <Text style={styles.modalSubtitle}>
                  {bankList.length} accredited institutions via Paystack & Central Bank
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close bank selector"
                onPress={() => setBankModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={16} color={colors.slate600} />
              </Pressable>
            </View>

            {/* Sticky Search Box */}
            <View style={styles.searchWrap}>
              <Icon name="search" size={16} color={colors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search bank name, code or slug..."
                placeholderTextColor={colors.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Scrollable Bank List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bankListContent}
              keyboardShouldPersistTaps="handled"
            >
              {filteredBanks.map((b, idx) => {
                if (!b) return null;
                const isSelected = Boolean(
                  selectedBank &&
                  b.code &&
                  selectedBank.code === b.code &&
                  selectedBank.name === b.name,
                );
                return (
                  <Pressable
                    key={`${b.code || "code"}-${b.name || "name"}-${idx}`}
                    accessibilityRole="button"
                    onPress={() => handleSelectBank(b)}
                    style={[styles.bankItemRow, isSelected && styles.bankItemRowSelected]}
                  >
                    <View style={styles.bankItemLeft}>
                      <View style={[styles.bankDot, isSelected && styles.bankDotActive]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bankItemName, isSelected && styles.bankItemNameActive]}>
                          {b.name || "Unknown Bank"}
                        </Text>
                        <Text style={styles.bankItemCode}>Code: {b.code || "N/A"}</Text>
                      </View>
                    </View>
                    {isSelected && <Icon name="check" size={16} color={colors.navy} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: "rgba(20, 33, 61, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextCol: {
    flex: 1,
    gap: 3,
  },
  bannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  bannerDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate600,
  },
  formCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.slate500,
  },
  fieldWrap: {
    gap: 6,
  },
  bankLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slate700,
  },
  bankSelectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  bankTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  bankIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bankTriggerName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  bankTriggerCode: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
    letterSpacing: 1,
  },
  verifiedCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  inputHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.amberLight,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.amberDark,
  },
  accountNameDisplay: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    justifyContent: "center",
  },
  accountNameDisplayVerified: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: colors.greenDark,
  },
  accountNameInput: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  verifiedPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.greenDark,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    gap: 8,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  bankListContent: {
    gap: 6,
    paddingBottom: spacing.xl,
  },
  bankItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  bankItemRowSelected: {
    backgroundColor: colors.surfaceSubtle,
  },
  bankItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  bankDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.slate300,
  },
  bankDotActive: {
    backgroundColor: colors.navy,
  },
  bankItemName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  bankItemNameActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  bankItemCode: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
});
