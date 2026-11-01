import React, { useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Card } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useSchool } from "../../providers/AppProvider";
import { DailyStudentRosterAttendanceSheet } from "../attendance/DailyStudentRosterAttendanceSheet";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function StudentAttendanceOverviewCard() {
  const { data, context } = useSchool();

  const todayDateObj = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => todayDateObj.toISOString().slice(0, 10), [todayDateObj]);

  const [calYear, setCalYear] = useState(() => todayDateObj.getFullYear());
  const [calMonth, setCalMonth] = useState(() => todayDateObj.getMonth());

  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  const isOwnerOrAdmin = context.role === "owner" || context.role === "admin";
  const isTeacher = context.role === "teacher";

  // Filter students based on role
  const totalStudents = useMemo(() => {
    if (isTeacher) {
      const teacherClass = data.classes?.find((c) => c.teacherUserId === context.userId);
      if (teacherClass) {
        return (data.students || []).filter(
          (s) => s.className === teacherClass.name || s.classes?.includes(teacherClass.name)
        ).length;
      }
    }
    return (data.students || []).length;
  }, [data.students, data.classes, isTeacher, context.userId]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      isWeekend: boolean;
      isFuture: boolean;
      presentCount: number;
    }[] = [];

    // Empty lead slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: "", isWeekend: false, isFuture: false, presentCount: 0 });
    }

    // Month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const monthPadded = String(calMonth + 1).padStart(2, "0");
      const dayPadded = String(d).padStart(2, "0");
      const dateStr = `${calYear}-${monthPadded}-${dayPadded}`;
      const dayOfWeek = new Date(calYear, calMonth, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFuture = dateStr > todayStr;

      // Count present pupils for that date
      const presentCount = (data.studentAttendance || []).filter(
        (a) => a.date === dateStr && a.status === "present"
      ).length;

      days.push({
        day: d,
        dateStr,
        isWeekend,
        isFuture,
        presentCount,
      });
    }

    return days;
  }, [calYear, calMonth, todayStr, data.studentAttendance]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  return (
    <Card style={[styles.containerCard, shadows.sm]}>
      {/* Top Header with CTA to Staff Calendar */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Pupil Attendance Calendar</Text>
          <Text style={styles.cardSub}>
            Tap any date to inspect full class roster & records
          </Text>
        </View>

        {isOwnerOrAdmin && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Staff Attendance Calendar"
            style={styles.staffCtaBtn}
            onPress={() => router.push("/attendance-calendar")}
          >
            <Icon name="calendar" size={13} color={colors.navy} />
            <Text style={styles.staffCtaText}>Staff Calendar</Text>
          </Pressable>
        )}
      </View>

      {/* Month Navigator Header */}
      <View style={styles.monthNavRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={styles.arrowBtn}
          onPress={handlePrevMonth}
        >
          <Icon name="back" size={14} color={colors.navy} />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[calMonth]} {calYear}
          </Text>
          {calMonth !== todayDateObj.getMonth() && (
            <Pressable
              onPress={() => {
                setCalMonth(todayDateObj.getMonth());
                setCalYear(todayDateObj.getFullYear());
              }}
            >
              <Text style={styles.returnTodayLink}>Return to Current Month</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.arrowBtn}
          onPress={handleNextMonth}
        >
          <Icon name="arrow" size={14} color={colors.navy} />
        </Pressable>
      </View>

      {/* Weekday Names Header */}
      <View style={styles.weekdaysRow}>
        {WEEKDAY_NAMES.map((w) => (
          <Text key={w} style={styles.weekdayText}>
            {w}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {calendarDays.map((item, idx) => {
          if (item.day === 0) {
            return <View key={`empty-${idx}`} style={styles.dayEmptyCell} />;
          }

          const isToday = item.dateStr === todayStr;

          return (
            <View key={item.dateStr} style={styles.dayCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Day ${item.day}`}
                onPress={() => setSelectedDayStr(item.dateStr)}
                style={[
                  styles.dayCellInner,
                  isToday && styles.dayCellToday,
                  item.isFuture && { opacity: 0.4 },
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

                {/* Pupil Count Pill */}
                {!item.isWeekend && !item.isFuture && totalStudents > 0 && (
                  <View style={styles.countWrap}>
                    <Text
                      style={[
                        styles.countText,
                        item.presentCount === totalStudents
                          ? { color: colors.greenDark }
                          : item.presentCount > 0
                          ? { color: colors.orange }
                          : { color: colors.slate400 },
                      ]}
                    >
                      {item.presentCount}/{totalStudents}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Daily Student Attendance Roster Bottomsheet */}
      {selectedDayStr && (
        <DailyStudentRosterAttendanceSheet
          visible={!!selectedDayStr}
          dateStr={selectedDayStr}
          onClose={() => setSelectedDayStr(null)}
          onDateChange={(d) => setSelectedDayStr(d)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  containerCard: {
    padding: spacing.md,
    gap: spacing.sm + 2,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  staffCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffCtaText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + 2,
    marginTop: 2,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  returnTodayLink: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.orange,
  },
  weekdaysRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekdayText: {
    width: "14.285%",
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  dayEmptyCell: {
    width: "14.285%",
    height: 44,
    marginVertical: 1,
  },
  dayCell: {
    width: "14.285%",
    height: 44,
    padding: 1.5,
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
    fontSize: 11,
    color: colors.navy,
  },
  dayTextToday: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  dayTextWeekend: {
    color: colors.muted,
  },
  countWrap: {
    marginTop: 1,
    paddingHorizontal: 2,
    borderRadius: 3,
    backgroundColor: colors.surfaceSubtle,
  },
  countText: {
    fontFamily: fonts.bold,
    fontSize: 8,
  },
});
