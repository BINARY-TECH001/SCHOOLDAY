import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Button } from "../../../components/ui";
import { Icon } from "../../../components/Icon";

export type LeaveStatusFilter = "all" | "pending" | "approved" | "rejected" | "draft";
export type LeaveTypeFilter = "all" | "Annual" | "Medical" | "Family";

export interface LeaveFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  status: LeaveStatusFilter;
  onStatusChange: (status: LeaveStatusFilter) => void;
  type: LeaveTypeFilter;
  onTypeChange: (type: LeaveTypeFilter) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: Array<{ key: LeaveStatusFilter; label: string; icon: "check" | "clock" | "close" | "document" }> = [
  { key: "all", label: "All Requests", icon: "document" },
  { key: "pending", label: "Pending Approvals", icon: "clock" },
  { key: "approved", label: "Approved Only", icon: "check" },
  { key: "rejected", label: "Rejected Only", icon: "close" },
  { key: "draft", label: "Drafts Only", icon: "document" },
];

const TYPE_OPTIONS: Array<{ key: LeaveTypeFilter; label: string }> = [
  { key: "all", label: "All Categories" },
  { key: "Annual", label: "Annual Leave" },
  { key: "Medical", label: "Medical / Sick" },
  { key: "Family", label: "Family & Care" },
];

export function LeaveFilterSheet({
  visible,
  onClose,
  status,
  onStatusChange,
  type,
  onTypeChange,
  onReset,
}: LeaveFilterSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.iconTile}>
                <Icon name="filter" size={16} color={colors.navy} />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Filter Requests</Text>
                <Text style={styles.sheetSub}>Filter time off by status or category</Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* Status Filter Section */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>STATUS</Text>
            <View style={styles.optionsWrap}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    onPress={() => onStatusChange(opt.key)}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                    ]}
                  >
                    <Icon
                      name={opt.icon}
                      size={13}
                      color={isSelected ? "#ffffff" : colors.slate600}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Leave Type Filter Section */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>LEAVE CATEGORY</Text>
            <View style={styles.optionsWrap}>
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = type === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    onPress={() => onTypeChange(opt.key)}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Actions Footer */}
          <View style={styles.footerRow}>
            <Button
              title="Reset Filters"
              variant="outline"
              size="md"
              onPress={() => {
                onReset();
                onClose();
              }}
            />
            <Button
              title="Apply Filters"
              variant="primary"
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10, 17, 32, 0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  sheetSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionWrap: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate700,
  },
  chipTextSelected: {
    fontFamily: fonts.bold,
    color: "#ffffff",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
