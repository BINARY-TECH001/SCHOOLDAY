import React, { useState, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Badge, Card } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { TopBar } from "../../components/TopBar";
import { useSchool } from "../../providers/AppProvider";
import { Attendance, Leave, Staff } from "../../domain/model";
import { DailyAttendanceDetailSheet } from "./DailyAttendanceDetailSheet";
import { DailyStaffRosterAttendanceSheet } from "./DailyStaffRosterAttendanceSheet";
import {
  AttendanceFilterSheet,
  AttendanceFilterStatus,
} from "./AttendanceFilterSheet";
import { useStaffTasks } from "../staff/taskStore";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function AttendanceCalendarScreen() {
  const params = useLocalSearchParams<{ staffUserId?: string; staffId?: string }>();
  const { data, context, services, act } = useSchool();

  const isOwnerOrAdmin =
    context.role === "owner" || context.role === "admin" || context.role === "hr";

  // Scope: Campus Faculty Master Roster vs Personal Staff Record
  const [scopeMode, setScopeMode] = useState<"campus" | "personal">(
    isOwnerOrAdmin && !params.staffUserId && !params.staffId ? "campus" : "personal"
  );

  // Active staff subject (either specific staff queried by proprietor, or self)
  const targetUserId = params.staffUserId || context.userId;
  const targetStaff = useMemo(() => {
    return data.staff.find((s) => s.userId === targetUserId || s.id === params.staffId);
  }, [data.staff, targetUserId, params.staffId]);

  // Current Month/Year state
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  // Filter state
  const [filterModal, setFilterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AttendanceFilterStatus>("all");
  const [filterStaffUserId, setFilterStaffUserId] = useState<string | undefined>(
    scopeMode === "campus" ? undefined : targetUserId
  );

  // Selected Day Detail Modal state
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtered attendance records for target staff
  const staffAttendances = useMemo(() => {
    const uid = filterStaffUserId || targetUserId;
    return data.attendance.filter((a) => a.userId === uid);
  }, [data.attendance, filterStaffUserId, targetUserId]);

  // Approved leaves for target staff
  const staffLeaves = useMemo(() => {
    const uid = filterStaffUserId || targetUserId;
    return data.leaves.filter((l) => l.userId === uid && l.status === "Approved");
  }, [data.leaves, filterStaffUserId, targetUserId]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      isWeekend: boolean;
      attendance?: Attendance;
      leave?: Leave;
    }[] = [];

    // Empty slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: "", isWeekend: false });
    }

    // Month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const monthPadded = String(currentMonth + 1).padStart(2, "0");
      const dayPadded = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${monthPadded}-${dayPadded}`;
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const att = staffAttendances.find((a) => a.inAt.slice(0, 10) === dateStr);
      const leave = staffLeaves.find(
        (l) => l.start.slice(0, 10) <= dateStr && l.end.slice(0, 10) >= dateStr
      );

      // Campus Master Counts for all staff
      const campusPresentCount = data.attendance.filter(
        (a) => a.inAt.slice(0, 10) === dateStr
      ).length;
      const campusLeaveCount = data.leaves.filter(
        (l) =>
          l.status === "Approved" &&
          l.start.slice(0, 10) <= dateStr &&
          l.end.slice(0, 10) >= dateStr
      ).length;

      days.push({
        day: d,
        dateStr,
        isWeekend,
        attendance: att,
        leave,
        campusPresentCount,
        campusLeaveCount,
      });
    }

    return days;
  }, [currentYear, currentMonth, staffAttendances, staffLeaves, data.attendance, data.leaves]);

  // Monthly summary stats
  const monthStats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let missedOutCount = 0;
    let leaveCount = 0;

    calendarDays.forEach((item) => {
      if (!item.day) return;
      if (item.leave) {
        leaveCount++;
      } else if (item.attendance) {
        presentCount++;
        if (item.attendance.arrivalStatus === "late") lateCount++;
        if (!item.attendance.outAt) missedOutCount++;
      }
    });

    const punctuality = presentCount > 0
      ? Math.round(((presentCount - lateCount) / presentCount) * 100)
      : 100;

    return {
      presentCount,
      lateCount,
      missedOutCount,
      leaveCount,
      punctuality,
    };
  }, [calendarDays]);

  // Selected Day records
  const selectedDayRecord = useMemo(() => {
    if (!selectedDayStr) return undefined;
    return staffAttendances.find((a) => a.inAt.slice(0, 10) === selectedDayStr);
  }, [selectedDayStr, staffAttendances]);

  const selectedDayLeave = useMemo(() => {
    if (!selectedDayStr) return undefined;
    return staffLeaves.find(
      (l) => l.start.slice(0, 10) <= selectedDayStr && l.end.slice(0, 10) >= selectedDayStr
    );
  }, [selectedDayStr, staffLeaves]);

  const { tasks } = useStaffTasks(context.schoolId, targetStaff?.id, targetUserId);
  const selectedDayTasks = useMemo(() => {
    if (!selectedDayStr) return [];
    return tasks.filter((t) => t.dueDate === selectedDayStr);
  }, [tasks, selectedDayStr]);

  const isFiltered = filterStatus !== "all" || (filterStaffUserId && filterStaffUserId !== targetUserId);

  return (
    <View style={styles.root}>
      {/* 1. Universal Single-Row Inline TopBar */}
      <TopBar
        title="Attendance Calendar"
        subtitle={
          scopeMode === "campus"
            ? "Campus Faculty Attendance Roster"
            : targetStaff
            ? `${targetStaff.name} · Shift History`
            : "Monthly Roster History"
        }
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={() => setFilterModal(true)}
            style={[styles.filterTopBtn, isFiltered && styles.filterTopBtnActive]}
            hitSlop={8}
          >
            <Icon
              name="filter"
              size={15}
              color={isFiltered ? "#ffffff" : colors.navy}
              filled={Boolean(isFiltered)}
            />
            <Text style={[styles.filterTopBtnText, isFiltered && styles.filterTopBtnTextActive]}>
              Filter
            </Text>
          </Pressable>
        }
      />

      {/* Scope Mode Switcher for Proprietor / Admin */}
      {isOwnerOrAdmin && !params.staffUserId && (
        <View style={styles.scopeTabBar}>
          <Pressable
            style={[
              styles.scopeTabBtn,
              scopeMode === "campus" && styles.scopeTabBtnActive,
            ]}
            onPress={() => {
              setScopeMode("campus");
              setFilterStaffUserId(undefined);
            }}
          >
            <Icon
              name="people"
              size={14}
              color={scopeMode === "campus" ? colors.white : colors.slate500}
            />
            <Text
              style={[
                styles.scopeTabBtnText,
                scopeMode === "campus" && styles.scopeTabBtnTextActive,
              ]}
            >
              Campus Faculty Roster
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.scopeTabBtn,
              scopeMode === "personal" && styles.scopeTabBtnActive,
            ]}
            onPress={() => {
              setScopeMode("personal");
              setFilterStaffUserId(context.userId);
            }}
          >
            <Icon
              name="calendar"
              size={14}
              color={scopeMode === "personal" ? colors.white : colors.slate500}
            />
            <Text
              style={[
                styles.scopeTabBtnText,
                scopeMode === "personal" && styles.scopeTabBtnTextActive,
              ]}
            >
              My Shifts
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Monthly Summary Metric Strip */}
        <Card style={[styles.statsStrip, shadows.sm]}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{monthStats.presentCount}</Text>
            <Text style={styles.statLabel}>DAYS PRESENT</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.greenDark }]}>
              {monthStats.punctuality}%
            </Text>
            <Text style={styles.statLabel}>PUNCTUALITY</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.orange }]}>
              {monthStats.lateCount}
            </Text>
            <Text style={styles.statLabel}>LATE ARRIVALS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.purple }]}>
              {monthStats.leaveCount}
            </Text>
            <Text style={styles.statLabel}>LEAVE DAYS</Text>
          </View>
        </Card>

        {/* 3. Interactive Month Grid Card */}
        <Card style={[styles.calendarCard, shadows.sm]}>
          {/* Month & Year Navigation Header */}
          <View style={styles.monthNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={handlePrevMonth}
              style={styles.arrowBtn}
              hitSlop={8}
            >
              <Icon name="back" size={16} color={colors.navy} />
            </Pressable>

            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              <Pressable
                onPress={() => {
                  setCurrentYear(new Date().getFullYear());
                  setCurrentMonth(new Date().getMonth());
                }}
                hitSlop={6}
              >
                <Text style={styles.todayReturnLink}>Return to Current Month</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={handleNextMonth}
              style={styles.arrowBtn}
              hitSlop={8}
            >
              <Icon name="arrow" size={16} color={colors.navy} />
            </Pressable>
          </View>

          {/* Weekday Column Headers */}
          <View style={styles.weekdaysRow}>
            {DAYS_OF_WEEK.map((d) => (
              <Text key={d} style={styles.weekdayHeader}>
                {d}
              </Text>
            ))}
          </View>

          {/* Month Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, idx) => {
              if (item.day === 0) {
                return <View key={`empty-${idx}`} style={styles.dayEmptyCell} />;
              }

              const isToday = item.dateStr === todayStr;
              const hasLeave = !!item.leave;
              const hasAttendance = !!item.attendance;
              const isLate = item.attendance?.arrivalStatus === "late";
              const isMissed = hasAttendance && !item.attendance?.outAt;

              // Filter match check
              let passesFilter = true;
              if (filterStatus === "present") passesFilter = hasAttendance && !isLate;
              if (filterStatus === "late") passesFilter = isLate;
              if (filterStatus === "missed_out") passesFilter = isMissed;
              if (filterStatus === "leave") passesFilter = hasLeave;

              return (
                <View key={item.dateStr} style={styles.dayCell}>
                  <Pressable
                    onPress={() => setSelectedDayStr(item.dateStr)}
                    style={[
                      styles.dayCellInner,
                      isToday && styles.dayCellToday,
                      !passesFilter && { opacity: 0.25 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                        item.isWeekend && styles.dayTextWeekend,
                      ]}
                    >
                      {item.day}
                    </Text>

                    {/* Campus Mode Counts vs Personal Mode Markers */}
                    {scopeMode === "campus" ? (
                      !item.isWeekend ? (
                        <View style={styles.campusCountWrap}>
                          <Text
                            style={[
                              styles.campusCountText,
                              item.campusPresentCount === data.staff.length && data.staff.length > 0
                                ? { color: colors.greenDark }
                                : item.campusPresentCount > 0
                                ? { color: colors.orange }
                                : { color: colors.slate400 },
                            ]}
                          >
                            {item.campusPresentCount}/{data.staff.length}
                          </Text>
                        </View>
                      ) : null
                    ) : (
                      <View style={styles.markerContainer}>
                        {hasLeave ? (
                          <View style={[styles.statusMarker, { backgroundColor: colors.purple }]} />
                        ) : hasAttendance ? (
                          <View
                            style={[
                              styles.statusMarker,
                              {
                                backgroundColor: isLate
                                  ? colors.orange
                                  : isMissed
                                  ? colors.amber
                                  : colors.greenDark,
                              },
                            ]}
                          />
                        ) : isToday ? (
                          <View style={[styles.statusMarker, { backgroundColor: colors.navy }]} />
                        ) : null}
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* 4. Compact Accessible Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.greenDark }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.orange }]} />
              <Text style={styles.legendText}>Late Arrival</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.amber }]} />
              <Text style={styles.legendText}>Missed Punch</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.purple }]} />
              <Text style={styles.legendText}>Leave</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Daily Campus Staff Roster Bottom Sheet (For Proprietor / Master View) */}
      {selectedDayStr && scopeMode === "campus" && (
        <DailyStaffRosterAttendanceSheet
          visible={Boolean(selectedDayStr)}
          onClose={() => setSelectedDayStr(null)}
          dateStr={selectedDayStr}
          staffList={data.staff}
          attendances={data.attendance}
          leaves={data.leaves}
          onSelectStaff={(st) => {
            setSelectedDayStr(null);
            router.push({
              pathname: "/staff-detail",
              params: { id: st.id },
            });
          }}
        />
      )}

      {/* Daily Personal Detail Bottom Sheet */}
      {selectedDayStr && scopeMode === "personal" && (
        <DailyAttendanceDetailSheet
          visible={Boolean(selectedDayStr)}
          onClose={() => setSelectedDayStr(null)}
          dateStr={selectedDayStr}
          staff={targetStaff}
          attendanceRecord={selectedDayRecord}
          leaveRecord={selectedDayLeave}
          dailyTasks={selectedDayTasks}
        />
      )}

      {/* Advanced Attendance Filters Sheet */}
      <AttendanceFilterSheet
        visible={filterModal}
        onClose={() => setFilterModal(false)}
        staffList={isOwnerOrAdmin ? data.staff : []}
        selectedStaffId={filterStaffUserId}
        selectedStatus={filterStatus}
        onApplyFilters={({ staffId, status }) => {
          setFilterStatus(status);
          setFilterStaffUserId(staffId);
        }}
        onResetFilters={() => {
          setFilterStatus("all");
          setFilterStaffUserId(targetUserId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  filterTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTopBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterTopBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  filterTopBtnTextActive: {
    color: "#ffffff",
  },
  scopeTabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scopeTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeTabBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  scopeTabBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slate600,
  },
  scopeTabBtnTextActive: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  statVal: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  calendarCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  todayReturnLink: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.orange,
  },
  weekdaysRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekdayHeader: {
    width: "14.285%",
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  dayEmptyCell: {
    width: "14.285%",
    height: 52,
    marginVertical: 1,
  },
  dayCell: {
    width: "14.285%",
    height: 52,
    padding: 2,
    marginVertical: 1,
  },
  dayCellInner: {
    flex: 1,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellToday: {
    borderColor: colors.orange,
    borderWidth: 1.5,
    backgroundColor: colors.orangeLight,
  },
  dayText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  dayTextToday: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  dayTextWeekend: {
    color: colors.muted,
  },
  campusCountWrap: {
    marginTop: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: colors.surfaceSubtle,
  },
  campusCountText: {
    fontFamily: fonts.bold,
    fontSize: 9,
  },
  markerContainer: {
    height: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  statusMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
});
