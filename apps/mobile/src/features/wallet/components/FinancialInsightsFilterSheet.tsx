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

export interface InsightsFilterState {
  preset: "7days" | "30days" | "90days" | "term" | "custom";
  category: "all" | "tuition" | "disbursement";
  customStartDate?: string;
  customEndDate?: string;
}

interface FinancialInsightsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: InsightsFilterState;
  onApply: (filters: InsightsFilterState) => void;
  onReset: () => void;
}

export function FinancialInsightsFilterSheet({
  visible,
  onClose,
  filters: initialFilters,
  onApply,
  onReset,
}: FinancialInsightsFilterSheetProps) {
  const [draft, setDraft] = useState<InsightsFilterState>(initialFilters);
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
              <Text style={styles.title}>Analytics Horizons & Filters</Text>
              <Text style={styles.subtitle}>Institutional Financial Reporting Scope</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.slate400} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Time Horizon Preset */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REPORTING HORIZON</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: "7days" as const, label: "Past 7 Days" },
                  { key: "30days" as const, label: "Past 30 Days" },
                  { key: "90days" as const, label: "Past 90 Days" },
                  { key: "term" as const, label: "Academic Term" },
                  { key: "custom" as const, label: "Custom Date Range" },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDraft((d) => ({ ...d, preset: item.key }))}
                    style={[
                      styles.chip,
                      draft.preset === item.key && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.preset === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom Date Pickers */}
              {draft.preset === "custom" && (
                <View style={styles.customDateRow}>
                  <Pressable
                    onPress={() => setPickerTarget("start")}
                    style={styles.datePickerBtn}
                  >
                    <Text style={styles.datePickerLabel}>START DATE</Text>
                    <Text style={styles.datePickerValue}>
                      {draft.customStartDate || "Select Start"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setPickerTarget("end")}
                    style={styles.datePickerBtn}
                  >
                    <Text style={styles.datePickerLabel}>END DATE</Text>
                    <Text style={styles.datePickerValue}>
                      {draft.customEndDate || "Select End"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Category Scope */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CATEGORY SCOPE</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: "all" as const, label: "All Categories" },
                  { key: "tuition" as const, label: "Tuition Fees Only" },
                  { key: "disbursement" as const, label: "Disbursements Only" },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDraft((d) => ({ ...d, category: item.key }))}
                    style={[
                      styles.chip,
                      draft.category === item.key && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.category === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
              title="Reset Horizon"
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
