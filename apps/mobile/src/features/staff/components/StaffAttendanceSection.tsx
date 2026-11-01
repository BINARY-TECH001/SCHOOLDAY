import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Badge, Card, EmptyState } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { Attendance } from "../../../domain/model";

export interface StaffAttendanceSectionProps {
  attendanceRecords: Attendance[];
  isOwnerOrAdmin: boolean;
  staffUserId?: string;
  onResolveMissedPunch?: (attendanceId: string) => void;
  isActionLoading?: boolean;
}

export function StaffAttendanceSection({
  attendanceRecords,
  isOwnerOrAdmin,
  staffUserId,
  onResolveMissedPunch,
  isActionLoading,
}: StaffAttendanceSectionProps) {
  // Sort reverse chronological
  const sortedRecords = useMemo(() => {
    return [...attendanceRecords].sort(
      (a, b) => new Date(b.inAt).getTime() - new Date(a.inAt).getTime()
    );
  }, [attendanceRecords]);

  // Attendance metrics
  const stats = useMemo(() => {
    const total = sortedRecords.length;
    let onTime = 0;
    let late = 0;
    let missedOut = 0;

    sortedRecords.forEach((r) => {
      if (r.arrivalStatus === "late") late++;
      else onTime++;
      if (!r.outAt) missedOut++;
    });

    const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 100;
    return { total, onTimeRate, late, missedOut };
  }, [sortedRecords]);

  if (sortedRecords.length === 0) {
    return (
      <Card style={styles.card}>
        <EmptyState
          title="No Attendance Logs"
          subtitle="This staff member has not logged any clock-in or clock-out shifts at campus gates yet."
          icon="clock"
        />
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Monthly Calendar Link Banner */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Monthly Attendance Calendar"
        style={({ pressed }) => [
          styles.calendarLinkBtn,
          pressed && { opacity: 0.8 },
        ]}
        onPress={() =>
          router.push({
            pathname: "/attendance-calendar",
            params: staffUserId ? { staffUserId } : undefined,
          })
        }
      >
        <View style={styles.calendarLinkIconWrap}>
          <Icon name="calendar" size={18} color={colors.navy} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.calendarLinkTitle}>Attendance Calendar View</Text>
          <Text style={styles.calendarLinkSub}>
            Inspect full month grid, shifts, punctuality & day details
          </Text>
        </View>
        <Icon name="chevron" size={16} color={colors.muted} />
      </Pressable>

      {/* Metrics Row */}
      <Card style={styles.metricsCard}>
        <View style={styles.metricCol}>
          <Text style={styles.metricVal}>{stats.total}</Text>
          <Text style={styles.metricLabel}>Total Shifts</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCol}>
          <Text style={[styles.metricVal, { color: colors.green }]}>
            {stats.onTimeRate}%
          </Text>
          <Text style={styles.metricLabel}>Punctuality</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCol}>
          <Text style={[styles.metricVal, stats.missedOut > 0 && { color: colors.orange }]}>
            {stats.missedOut}
          </Text>
          <Text style={styles.metricLabel}>Open / Incomplete</Text>
        </View>
      </Card>

      {/* Audit Log List */}
      <View style={styles.recordsList}>
        <Text style={styles.sectionHeader}>SHIFT AUDIT TRAIL ({sortedRecords.length})</Text>

        {sortedRecords.map((item) => {
          const inDate = new Date(item.inAt);
          const outDate = item.outAt ? new Date(item.outAt) : null;
          const dateStr = inDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const timeInStr = inDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const timeOutStr = outDate
            ? outDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : undefined;

          const durationStr = outDate
            ? `${Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60)))}h active`
            : "Shift active";

          const isLate = item.arrivalStatus === "late";
          const isMissedPunch = !outDate && item.inAt.slice(0, 10) < new Date().toISOString().slice(0, 10);

          return (
            <Card
              key={item.id}
              style={[
                styles.recordRow,
                isMissedPunch && styles.recordRowWarning,
              ]}
            >
              <View style={styles.rowTop}>
                <View style={styles.dateCol}>
                  <Text style={styles.recordDate}>{dateStr}</Text>
                  <Text style={styles.recordDuration}>{durationStr}</Text>
                </View>

                <View style={styles.badgeGroup}>
                  {isLate ? (
                    <Badge tone="warning" text="Late Arrival" size="sm" />
                  ) : (
                    <Badge tone="success" text="On Time" size="sm" />
                  )}

                  {isMissedPunch && (
                    <Badge tone="danger" text="Missed Clock-Out" size="sm" />
                  )}
                </View>
              </View>

              <View style={styles.rowBottom}>
                <View style={styles.timeDetail}>
                  <Icon name="clock" size={13} color={colors.muted} />
                  <Text style={styles.timeText}>
                    In: <Text style={{ fontFamily: fonts.bold }}>{timeInStr}</Text>
                    {timeOutStr ? (
                      <> · Out: <Text style={{ fontFamily: fonts.bold }}>{timeOutStr}</Text></>
                    ) : (
                      " · (No clock-out recorded)"
                    )}
                  </Text>
                </View>

                <Text style={styles.locationText} numberOfLines={1}>
                  {item.locationName || "Main Campus Gate"}
                </Text>
              </View>

              {/* Review / Resolve Exception Action for Proprietor */}
              {isMissedPunch && isOwnerOrAdmin && onResolveMissedPunch && (
                <View style={styles.resolveActionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Resolve missed clock-out"
                    style={({ pressed }) => [
                      styles.resolveBtn,
                      pressed && { opacity: 0.8 },
                    ]}
                    disabled={isActionLoading}
                    onPress={() => onResolveMissedPunch(item.id)}
                  >
                    <Icon name="verify" size={13} color={colors.navy} />
                    <Text style={styles.resolveBtnText}>
                      {isActionLoading ? "Saving…" : "Close & Verify Missed Shift"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  metricsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  metricCol: {
    alignItems: "center",
    gap: 2,
  },
  metricVal: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
  },
  metricLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  recordsList: {
    gap: spacing.sm,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.muted,
    textTransform: "uppercase",
  },
  recordRow: {
    padding: spacing.sm + 4,
    gap: 8,
    backgroundColor: colors.surface,
  },
  recordRowWarning: {
    borderColor: "#fed7aa",
    backgroundColor: "#fffdfa",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  dateCol: {
    gap: 2,
  },
  recordDate: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  recordDuration: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  badgeGroup: {
    flexDirection: "row",
    gap: 6,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
    paddingTop: 6,
  },
  timeDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate700,
  },
  locationText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  resolveActionRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#fed7aa",
    paddingTop: 8,
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffedd5",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  resolveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  calendarLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm + 2,
  },
  calendarLinkIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarLinkTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  calendarLinkSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
