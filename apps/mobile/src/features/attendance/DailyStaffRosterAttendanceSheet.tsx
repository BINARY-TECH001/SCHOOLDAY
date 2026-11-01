import React, { useMemo } from "react";
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
import { Avatar, Badge } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { Attendance, Leave, Staff } from "../../domain/model";

export interface DailyStaffRosterAttendanceSheetProps {
  visible: boolean;
  onClose: () => void;
  dateStr: string; // YYYY-MM-DD
  staffList: Staff[];
  attendances: Attendance[];
  leaves: Leave[];
  onSelectStaff: (staff: Staff) => void;
}

export function DailyStaffRosterAttendanceSheet({
  visible,
  onClose,
  dateStr,
  staffList,
  attendances,
  leaves,
  onSelectStaff,
}: DailyStaffRosterAttendanceSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const dateObj = new Date(dateStr + "T00:00:00");
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

  // Segment staff into Present and Absent / On Leave
  const { presentStaff, absentStaff } = useMemo(() => {
    const present: Array<{
      staff: Staff;
      attendance: Attendance;
      inTimeStr: string;
      outTimeStr: string;
      durationStr: string;
      isLate: boolean;
    }> = [];

    const absent: Array<{
      staff: Staff;
      leave?: Leave;
    }> = [];

    staffList.forEach((st) => {
      const att = attendances.find(
        (a) => a.userId === st.userId && a.inAt.slice(0, 10) === dateStr
      );

      if (att) {
        const inDate = new Date(att.inAt);
        const inTimeStr = inDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        let outTimeStr = "Active on Duty";
        let durationStr = "In progress";

        if (att.outAt) {
          const outDate = new Date(att.outAt);
          outTimeStr = outDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const diffMs = outDate.getTime() - inDate.getTime();
          if (diffMs > 0) {
            const h = Math.floor(diffMs / (1000 * 60 * 60));
            const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            durationStr = `${h}h ${m}m`;
          }
        }

        present.push({
          staff: st,
          attendance: att,
          inTimeStr,
          outTimeStr,
          durationStr,
          isLate: att.arrivalStatus === "late",
        });
      } else {
        const matchingLeave = leaves.find(
          (l) =>
            l.userId === st.userId &&
            l.start.slice(0, 10) <= dateStr &&
            l.end.slice(0, 10) >= dateStr
        );
        absent.push({
          staff: st,
          leave: matchingLeave,
        });
      }
    });

    return { presentStaff: present, absentStaff: absent };
  }, [dateStr, staffList, attendances, leaves]);

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
          {/* Top Sheet Header */}
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
              <Text style={styles.sheetSub}>
                Campus Attendance & Roster Breakdown
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* Metrics Pill Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{presentStaff.length}</Text>
              <Text style={styles.metricLabel}>PRESENT</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.red }]}>
                {absentStaff.length}
              </Text>
              <Text style={styles.metricLabel}>ABSENT / LEAVE</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>
                {staffList.length > 0
                  ? `${Math.round((presentStaff.length / staffList.length) * 100)}%`
                  : "0%"}
              </Text>
              <Text style={styles.metricLabel}>ATTENDANCE RATE</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {/* PRESENT STAFF SECTION */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.greenDark }]} />
              <Text style={styles.sectionTitle}>
                Present Staff ({presentStaff.length})
              </Text>
            </View>

            {presentStaff.length === 0 ? (
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyNoticeText}>
                  {isWeekend
                    ? "Weekend non-working day · No staff clocked in."
                    : "No staff clock-in records logged for this day."}
                </Text>
              </View>
            ) : (
              presentStaff.map(({ staff, inTimeStr, outTimeStr, durationStr, isLate }) => (
                <Pressable
                  key={staff.id}
                  style={({ pressed }) => [
                    styles.staffCard,
                    pressed && styles.staffCardPressed,
                  ]}
                  onPress={() => onSelectStaff(staff)}
                >
                  <Avatar name={staff.name} size={38} role="staff" />
                  <View style={styles.staffInfo}>
                    <View style={styles.staffTitleRow}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {staff.name}
                      </Text>
                      {isLate ? (
                        <Badge text="Late" tone="warning" />
                      ) : (
                        <Badge text="On Time" tone="success" dot />
                      )}
                    </View>

                    <Text style={styles.staffRole} numberOfLines={1}>
                      {staff.title || staff.role || "Faculty Member"}
                    </Text>

                    <View style={styles.punchTimeRow}>
                      <Icon name="clock" size={12} color={colors.slate500} />
                      <Text style={styles.punchTimeText}>
                        In: {inTimeStr} · Out: {outTimeStr} ({durationStr})
                      </Text>
                    </View>
                  </View>
                  <Icon name="forward" size={14} color={colors.slate400} />
                </Pressable>
              ))
            )}

            {/* ABSENT / ON LEAVE STAFF SECTION */}
            <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
              <View style={[styles.sectionDot, { backgroundColor: colors.red }]} />
              <Text style={styles.sectionTitle}>
                Absent & On Leave ({absentStaff.length})
              </Text>
            </View>

            {absentStaff.length === 0 ? (
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyNoticeText}>
                  All campus staff were present and clocked in!
                </Text>
              </View>
            ) : (
              absentStaff.map(({ staff, leave }) => (
                <Pressable
                  key={staff.id}
                  style={({ pressed }) => [
                    styles.staffCard,
                    styles.absentStaffCard,
                    pressed && styles.staffCardPressed,
                  ]}
                  onPress={() => onSelectStaff(staff)}
                >
                  <Avatar name={staff.name} size={38} role="staff" />
                  <View style={styles.staffInfo}>
                    <View style={styles.staffTitleRow}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {staff.name}
                      </Text>
                      {leave ? (
                        <Badge text={`On ${leave.type} Leave`} tone="purple" />
                      ) : isWeekend ? (
                        <Badge text="Off Duty" tone="neutral" />
                      ) : (
                        <Badge text="Absent" tone="danger" />
                      )}
                    </View>

                    <Text style={styles.staffRole} numberOfLines={1}>
                      {staff.title || staff.role || "Faculty Member"}
                    </Text>

                    <Text style={styles.absentReasonText}>
                      {leave
                        ? `Approved absence: ${leave.reason}`
                        : isWeekend
                        ? "Standard campus weekend closure"
                        : "No gate clock-in registered for this school day"}
                    </Text>
                  </View>
                  <Icon name="forward" size={14} color={colors.slate400} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
    maxHeight: "86%",
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetDate: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  sheetSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surfaceSubtle,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricItem: {
    alignItems: "center",
    gap: 2,
  },
  metricVal: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  scrollList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  emptyNotice: {
    padding: spacing.sm + 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyNoticeText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate600,
    textAlign: "center",
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  absentStaffCard: {
    backgroundColor: "#fffdfd",
    borderColor: "#fed7d7",
  },
  staffCardPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  staffInfo: {
    flex: 1,
    gap: 2,
  },
  staffTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  staffName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
    flex: 1,
    marginRight: 8,
  },
  staffRole: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate500,
  },
  punchTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  punchTimeText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate600,
  },
  absentReasonText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate600,
    marginTop: 2,
  },
});
