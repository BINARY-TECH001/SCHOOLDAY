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
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Badge, Button } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { Staff } from "../../domain/model";

export type AttendanceFilterStatus = "all" | "present" | "late" | "missed_out" | "leave";

export interface AttendanceFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  staffList?: Staff[];
  selectedStaffId?: string;
  selectedStatus: AttendanceFilterStatus;
  onApplyFilters: (filters: { staffId?: string; status: AttendanceFilterStatus }) => void;
  onResetFilters: () => void;
}

export function AttendanceFilterSheet({
  visible,
  onClose,
  staffList = [],
  selectedStaffId,
  selectedStatus,
  onApplyFilters,
  onResetFilters,
}: AttendanceFilterSheetProps) {
  const insets = useSafeAreaInsets();

  const [tempStatus, setTempStatus] = useState<AttendanceFilterStatus>(selectedStatus);
  const [tempStaffId, setTempStaffId] = useState<string | undefined>(selectedStaffId);

  if (!visible) return null;

  const statusOptions: { key: AttendanceFilterStatus; label: string; tone: "brand" | "success" | "warning" | "purple" | "neutral" }[] = [
    { key: "all", label: "All Records", tone: "neutral" },
    { key: "present", label: "Present & On-Time", tone: "success" },
    { key: "late", label: "Late Arrivals", tone: "warning" },
    { key: "missed_out", label: "Missed Clock-Out", tone: "warning" },
    { key: "leave", label: "On Approved Leave", tone: "purple" },
  ];

  const handleApply = () => {
    onApplyFilters({ staffId: tempStaffId, status: tempStatus });
    onClose();
  };

  const handleReset = () => {
    setTempStatus("all");
    setTempStaffId(undefined);
    onResetFilters();
    onClose();
  };

  const activeCount = (tempStatus !== "all" ? 1 : 0) + (tempStaffId ? 1 : 0);

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
              <Text style={styles.sheetTitle}>Filter Attendance Calendar</Text>
              {activeCount > 0 && (
                <Badge text={`${activeCount} Active`} tone="brand" />
              )}
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* Status Filter Options */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>ATTENDANCE STATUS</Text>
            <View style={styles.chipsWrap}>
              {statusOptions.map((opt) => {
                const isSelected = tempStatus === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setTempStatus(opt.key)}
                    style={[
                      styles.statusChip,
                      isSelected && styles.statusChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isSelected && styles.statusChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Staff Member Selector (When available for management roles) */}
          {staffList.length > 0 && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>STAFF MEMBER</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <Pressable
                  onPress={() => setTempStaffId(undefined)}
                  style={[
                    styles.staffPill,
                    !tempStaffId && styles.staffPillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.staffPillText,
                      !tempStaffId && styles.staffPillTextSelected,
                    ]}
                  >
                    All Faculty & Staff
                  </Text>
                </Pressable>

                {staffList.map((s) => {
                  const isSelected = tempStaffId === s.id || tempStaffId === s.userId;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setTempStaffId(s.userId)}
                      style={[
                        styles.staffPill,
                        isSelected && styles.staffPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.staffPillText,
                          isSelected && styles.staffPillTextSelected,
                        ]}
                      >
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={styles.footerRow}>
            <Pressable onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </Pressable>

            <View style={{ flex: 1, maxWidth: 200 }}>
              <Button title="Apply Filters" onPress={handleApply} style={{ height: 42 }} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 17, 32, 0.45)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
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
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  statusChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  statusChipTextSelected: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  staffPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffPillSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  staffPillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  staffPillTextSelected: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  resetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  resetBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.muted,
  },
});
