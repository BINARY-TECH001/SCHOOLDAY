import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Badge, Button } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { Attendance, Leave, Staff } from "../../domain/model";
import { StaffTask } from "../staff/types";

export interface DailyAttendanceDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  dateStr: string; // YYYY-MM-DD
  staff?: Staff;
  attendanceRecord?: Attendance;
  leaveRecord?: Leave;
  dailyTasks?: StaffTask[];
  onResolvePunch?: () => void;
}

export function DailyAttendanceDetailSheet({
  visible,
  onClose,
  dateStr,
  staff,
  attendanceRecord,
  leaveRecord,
  dailyTasks = [],
  onResolvePunch,
}: DailyAttendanceDetailSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const dateObj = new Date(dateStr + "T00:00:00");
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

  const inDate = attendanceRecord ? new Date(attendanceRecord.inAt) : undefined;
  const outDate = attendanceRecord?.outAt ? new Date(attendanceRecord.outAt) : undefined;

  let durationText = "—";
  if (inDate && outDate) {
    const diffMs = outDate.getTime() - inDate.getTime();
    if (diffMs > 0) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      durationText = `${hours}h ${mins}m`;
    }
  }

  const isMissedOut = Boolean(attendanceRecord && !attendanceRecord.outAt && !leaveRecord);

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
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sheetDate}>
                {dateObj.toLocaleDateString("en-NG", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.sheetStaff}>
                {staff?.name || "Staff Attendance Record"} {staff?.title ? `· ${staff.title}` : ""}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* Status Badge Strip */}
          <View style={styles.statusStrip}>
            {leaveRecord ? (
              <Badge text={`On Approved Leave · ${leaveRecord.type}`} tone="purple" dot />
            ) : attendanceRecord ? (
              attendanceRecord.outAt ? (
                <Badge text="Completed Shift · Verified" tone="success" dot />
              ) : (
                <Badge text="Open Punch · In Progress" tone="warning" dot />
              )
            ) : isWeekend ? (
              <Badge text="Weekend · Campus Closed" tone="neutral" />
            ) : (
              <Badge text="No Attendance Recorded" tone="neutral" />
            )}

            {attendanceRecord?.arrivalStatus === "late" && (
              <Badge text="Late Arrival" tone="warning" />
            )}
          </View>

          {/* Punch Timestamps Summary */}
          {attendanceRecord ? (
            <View style={styles.timestampsCard}>
              <View style={styles.timestampCol}>
                <Text style={styles.metaLabel}>CLOCK IN</Text>
                <Text style={styles.metaValue}>
                  {inDate ? inDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </Text>
                <Text style={styles.metaSub}>
                  {attendanceRecord.locationName || "Main Campus"}
                </Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.timestampCol}>
                <Text style={styles.metaLabel}>CLOCK OUT</Text>
                <Text style={styles.metaValue}>
                  {outDate ? outDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not Recorded"}
                </Text>
                <Text style={styles.metaSub}>
                  {attendanceRecord.outAt ? "Gate Departure" : "Open session"}
                </Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.timestampCol}>
                <Text style={styles.metaLabel}>WORK DURATION</Text>
                <Text style={[styles.metaValue, { color: colors.orange }]}>{durationText}</Text>
                <Text style={styles.metaSub}>On campus</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noRecordBox}>
              <Icon name="clock" size={20} color={colors.muted} />
              <Text style={styles.noRecordText}>
                {leaveRecord
                  ? `Approved ${leaveRecord.type} leave granted for this date.`
                  : isWeekend
                  ? "Standard weekend non-working school day."
                  : "No clock-in or attendance punch was recorded for this date."}
              </Text>
            </View>
          )}

          {/* Recorded Daily Tasks / Work Activities */}
          {dailyTasks.length > 0 && (
            <View style={styles.taskSection}>
              <Text style={styles.sectionTitle}>Recorded Tasks for this Day</Text>
              {dailyTasks.map((t) => (
                <View key={t.id} style={styles.taskRow}>
                  <Icon
                    name={t.status === "completed" ? "verify" : "clock"}
                    size={14}
                    color={t.status === "completed" ? colors.greenDark : colors.orange}
                  />
                  <Text style={styles.taskTitleText} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Badge
                    text={t.status === "completed" ? "Completed" : "Pending"}
                    tone={t.status === "completed" ? "success" : "warning"}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Missed Clock-out Resolution Action */}
          {isMissedOut && onResolvePunch && (
            <Button
              title="Resolve Missed Clock-Out"
              variant="outline"
              onPress={() => {
                onClose();
                onResolvePunch();
              }}
              style={{ height: 42 }}
            />
          )}
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
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sheetDate: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  sheetStaff: {
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
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timestampsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  timestampCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  metaLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  metaSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  noRecordBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  noRecordText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  taskSection: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  taskTitleText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
});
