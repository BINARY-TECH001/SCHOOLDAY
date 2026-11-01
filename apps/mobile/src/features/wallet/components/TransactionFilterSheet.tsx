import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Button } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { DatePickerModal } from "../../../components/pickers/DatePickerModal";

export interface TransactionFilterState {
  flow: "all" | "inflows" | "outflows";
  status: "all" | "settled" | "awaiting confirmation";
  method: "all" | "card" | "transfer" | "ussd";
  className?: string;
  datePreset: "all" | "today" | "week" | "month" | "custom";
  customStartDate?: string;
  customEndDate?: string;
}

interface TransactionFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: TransactionFilterState;
  availableClasses?: string[];
  onApply: (filters: TransactionFilterState) => void;
  onReset: () => void;
}

export function TransactionFilterSheet({
  visible,
  onClose,
  filters: initialFilters,
  availableClasses = [],
  onApply,
  onReset,
}: TransactionFilterSheetProps) {
  const [draft, setDraft] = useState<TransactionFilterState>(initialFilters);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);

  React.useEffect(() => {
    if (visible) {
      setDraft(initialFilters);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
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
              <Icon name="filter" size={18} color={colors.navy} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Filter Transactions</Text>
              <Text style={styles.subtitle}>Institutional Ledger Parameters</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.slate400} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Flow Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TRANSACTION FLOW</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: "all" as const, label: "All Activity" },
                  { key: "inflows" as const, label: "Inflows (Fees)" },
                  { key: "outflows" as const, label: "Outflows (Payouts)" },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDraft((d) => ({ ...d, flow: item.key }))}
                    style={[
                      styles.chip,
                      draft.flow === item.key && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.flow === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CLEARING STATUS</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: "all" as const, label: "All Statuses" },
                  { key: "settled" as const, label: "Settled / Cleared" },
                  { key: "awaiting confirmation" as const, label: "Pending Wire" },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDraft((d) => ({ ...d, status: item.key }))}
                    style={[
                      styles.chip,
                      draft.status === item.key && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.status === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Payment Method Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PAYMENT CHANNEL</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: "all" as const, label: "All Channels" },
                  { key: "transfer" as const, label: "Bank Transfer" },
                  { key: "card" as const, label: "Card Checkout" },
                  { key: "ussd" as const, label: "USSD / Cash" },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDraft((d) => ({ ...d, method: item.key }))}
                    style={[
                      styles.chip,
                      draft.method === item.key && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.method === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Classroom Arm Filter */}
            {availableClasses.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>STUDENT CLASSROOM ARM</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  <Pressable
                    onPress={() => setDraft((d) => ({ ...d, className: "all" }))}
                    style={[
                      styles.chip,
                      (!draft.className || draft.className === "all") && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        (!draft.className || draft.className === "all") && styles.chipTextActive,
                      ]}
                    >
                      All Classes
                    </Text>
                  </Pressable>
                  {availableClasses.map((cls) => (
                    <Pressable
                      key={cls}
                      onPress={() => setDraft((d) => ({ ...d, className: cls }))}
                      style={[
                        styles.chip,
                        draft.className === cls && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draft.className === cls && styles.chipTextActive,
                        ]}
                      >
                        {cls}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Date Preset */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DATE HORIZON</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: "all" as const, label: "All Time" },
                  { key: "today" as const, label: "Today" },
                  { key: "week" as const, label: "This Week" },
                  { key: "month" as const, label: "This Month" },
                  { key: "custom" as const, label: "Custom Range" },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDraft((d) => ({ ...d, datePreset: item.key }))}
                    style={[
                      styles.chip,
                      draft.datePreset === item.key && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.datePreset === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom Date Pickers */}
              {draft.datePreset === "custom" && (
                <View style={styles.customDateRow}>
                  <Pressable
                    onPress={() => setPickerTarget("start")}
                    style={styles.datePickerBtn}
                  >
                    <Text style={styles.datePickerLabel}>START DATE</Text>
                    <Text style={styles.datePickerValue}>
                      {draft.customStartDate || "Select Date"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPickerTarget("end")}
                    style={styles.datePickerBtn}
                  >
                    <Text style={styles.datePickerLabel}>END DATE</Text>
                    <Text style={styles.datePickerValue}>
                      {draft.customEndDate || "Select Date"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Apply Filters"
              variant="primary"
              size="lg"
              onPress={handleApply}
            />
            <Button
              title="Reset to Default"
              variant="ghost"
              size="md"
              onPress={handleReset}
            />
          </View>
        </View>
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        initialDate={
          pickerTarget === "start"
            ? draft.customStartDate || new Date().toISOString().slice(0, 10)
            : draft.customEndDate || new Date().toISOString().slice(0, 10)
        }
        title={pickerTarget === "start" ? "Select Start Date" : "Select End Date"}
        onSelect={(dateIso) => {
          if (pickerTarget === "start") {
            setDraft((d) => ({ ...d, customStartDate: dateIso }));
          } else {
            setDraft((d) => ({ ...d, customEndDate: dateIso }));
          }
          setPickerTarget(null);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: "88%",
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
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerText: {
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
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate600,
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate700,
  },
  chipTextActive: {
    fontFamily: fonts.bold,
    color: colors.white,
  },
  customDateRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  datePickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: colors.slate50,
  },
  datePickerLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  datePickerValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.navy,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
});
