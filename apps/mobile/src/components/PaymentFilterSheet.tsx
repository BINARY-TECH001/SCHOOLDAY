import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, shadows, Button } from "./ui";
import { Icon } from "./Icon";

export interface PaymentFilterCriteria {
  channel: "all" | "card" | "transfer" | "ussd";
  status: "all" | "settled" | "awaiting confirmation" | "failed";
  dateRange: "all" | "term" | "month" | "week";
  sortBy: "newest" | "amount_desc" | "amount_asc";
}

export const defaultPaymentFilter: PaymentFilterCriteria = {
  channel: "all",
  status: "all",
  dateRange: "all",
  sortBy: "newest",
};

interface PaymentFilterSheetProps {
  visible: boolean;
  filter: PaymentFilterCriteria;
  onApply: (nextFilter: PaymentFilterCriteria) => void;
  onReset: () => void;
  onClose: () => void;
}

export function PaymentFilterSheet({
  visible,
  filter,
  onApply,
  onReset,
  onClose,
}: PaymentFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<PaymentFilterCriteria>(filter);

  // Sync draft when opened
  React.useEffect(() => {
    setDraft(filter);
  }, [filter, visible]);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(defaultPaymentFilter);
    onReset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <View style={{ gap: 2 }}>
              <Text style={styles.sheetTitle}>Filter Transactions</Text>
              <Text style={styles.sheetSubtitle}>
                Filter tuition ledgers and reconciliation records
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filter"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Icon name="close" size={18} color={colors.navy} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. Settlement Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>TRANSACTION STATUS</Text>
              <View style={styles.chipRow}>
                {[
                  { id: "all", label: "All Statuses" },
                  { id: "settled", label: "Settled / Paid" },
                  { id: "awaiting confirmation", label: "Awaiting Review" },
                  { id: "failed", label: "Failed" },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        status: item.id as any,
                      }))
                    }
                    style={[
                      styles.choiceChip,
                      draft.status === item.id && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        draft.status === item.id && styles.choiceChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 2. Payment Channel */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>PAYMENT METHOD / CHANNEL</Text>
              <View style={styles.chipRow}>
                {[
                  { id: "all", label: "All Channels" },
                  { id: "card", label: "Debit Card (Paystack)" },
                  { id: "transfer", label: "Bank Transfer" },
                  { id: "ussd", label: "USSD Banking" },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        channel: item.id as any,
                      }))
                    }
                    style={[
                      styles.choiceChip,
                      draft.channel === item.id && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        draft.channel === item.id && styles.choiceChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 3. Date Horizon */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>DATE TIMEFRAME</Text>
              <View style={styles.chipRow}>
                {[
                  { id: "all", label: "All Time" },
                  { id: "term", label: "This Term" },
                  { id: "month", label: "This Month" },
                  { id: "week", label: "Past 7 Days" },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        dateRange: item.id as any,
                      }))
                    }
                    style={[
                      styles.choiceChip,
                      draft.dateRange === item.id && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        draft.dateRange === item.id && styles.choiceChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 4. Sort Order */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>SORT ORDER</Text>
              <View style={styles.chipRow}>
                {[
                  { id: "newest", label: "Most Recent" },
                  { id: "amount_desc", label: "Highest Amount" },
                  { id: "amount_asc", label: "Lowest Amount" },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        sortBy: item.id as any,
                      }))
                    }
                    style={[
                      styles.choiceChip,
                      draft.sortBy === item.id && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        draft.sortBy === item.id && styles.choiceChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={styles.bottomBar}>
            <Button
              title="Reset"
              variant="secondary"
              size="lg"
              onPress={handleReset}
              style={{ flex: 1 }}
            />
            <Button
              title="Apply Filters"
              variant="primary"
              size="lg"
              onPress={handleApply}
              style={{ flex: 2 }}
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    paddingTop: 12,
    ...shadows.lg,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDark,
    alignSelf: "center",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetTitle: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 20,
  },
  filterSection: {
    gap: 8,
  },
  filterSectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  choiceChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  choiceChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  choiceChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
});
