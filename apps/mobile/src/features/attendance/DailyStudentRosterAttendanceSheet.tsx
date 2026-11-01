import React, { useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Avatar, Badge, Card } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useSchool } from "../../providers/AppProvider";
import { Student, StudentAttendance } from "../../domain/model";

export interface DailyStudentRosterAttendanceSheetProps {
  visible: boolean;
  onClose: () => void;
  dateStr: string;
  initialClassId?: string;
  onDateChange?: (date: string) => void;
}

type SessionType = "morning" | "afternoon";

export function DailyStudentRosterAttendanceSheet({
  visible,
  onClose,
  dateStr,
  initialClassId,
  onDateChange,
}: DailyStudentRosterAttendanceSheetProps) {
  const insets = useSafeAreaInsets();
  const { data, context, services, refresh } = useSchool();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [session, setSession] = useState<SessionType>(() => {
    return new Date().getHours() < 12 ? "morning" : "afternoon";
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || "all"
  );
  const [markingStudentId, setMarkingStudentId] = useState<string | null>(null);

  const canMark =
    context.role === "owner" ||
    context.role === "admin" ||
    context.role === "teacher";

  const isFutureDate = dateStr > todayStr;

  // Format header date
  const formattedDate = useMemo(() => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, (m || 1) - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [dateStr]);

  // Students list filtered by class
  const filteredStudents = useMemo(() => {
    let list = data.students || [];
    if (selectedClassId !== "all") {
      const cls = data.classes?.find((c) => c.id === selectedClassId);
      if (cls) {
        list = list.filter(
          (s) => s.className === cls.name || s.classes?.includes(cls.name)
        );
      }
    }
    return list;
  }, [data.students, data.classes, selectedClassId]);

  // Attendance records for this date & session
  const recordsForDateAndSession = useMemo(() => {
    return (data.studentAttendance || []).filter(
      (a) =>
        a.date === dateStr &&
        (a.session === session || a.session === "full_day")
    );
  }, [data.studentAttendance, dateStr, session]);

  // Map student ID to record
  const studentRecordsMap = useMemo(() => {
    const map = new Map<string, StudentAttendance>();
    recordsForDateAndSession.forEach((r) => {
      map.set(r.studentId, r);
    });
    return map;
  }, [recordsForDateAndSession]);

  // Partition students into Present, Late, Absent / Unmarked
  const { presentStudents, lateStudents, absentStudents } = useMemo(() => {
    const present: { student: Student; record?: StudentAttendance }[] = [];
    const late: { student: Student; record?: StudentAttendance }[] = [];
    const absent: { student: Student; record?: StudentAttendance }[] = [];

    filteredStudents.forEach((student) => {
      const rec = studentRecordsMap.get(student.id);
      if (rec?.status === "present") {
        present.push({ student, record: rec });
      } else if (rec?.status === "late") {
        late.push({ student, record: rec });
      } else {
        absent.push({ student, record: rec });
      }
    });

    return {
      presentStudents: present,
      lateStudents: late,
      absentStudents: absent,
    };
  }, [filteredStudents, studentRecordsMap]);

  // Statistics
  const totalPupils = filteredStudents.length;
  const presentCount = presentStudents.length;
  const lateCount = lateStudents.length;
  const absentCount = absentStudents.length;
  const attendanceRate =
    totalPupils > 0
      ? Math.round(((presentCount + lateCount) / totalPupils) * 100)
      : 100;

  // Quick mark handler directly in sheet
  const handleQuickMark = async (
    student: Student,
    status: "present" | "late" | "absent"
  ) => {
    if (isFutureDate) {
      toast.error("Cannot mark attendance for future dates.");
      return;
    }
    if (!context) return;
    setMarkingStudentId(student.id);
    try {
      const cls = data.classes?.find((c) => c.name === student.className);
      await services.markStudentAttendance(context, {
        studentId: student.id,
        classId: cls?.id || student.className,
        className: student.className,
        date: dateStr,
        session,
        status,
      });
      await refresh();
      toast.success(
        `Marked ${student.name} as ${status.toUpperCase()} (${session}).`
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark attendance.");
    } finally {
      setMarkingStudentId(null);
    }
  };

  const handlePrevDay = () => {
    if (!onDateChange) return;
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    if (!onDateChange) return;
    if (dateStr >= todayStr) {
      toast.info("Cannot mark or view attendance for future dates.");
      return;
    }
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const nextDate = d.toISOString().slice(0, 10);
    if (nextDate > todayStr) {
      toast.info("Cannot mark or view attendance for future dates.");
      return;
    }
    onDateChange(nextDate);
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
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Pupil Attendance Roster</Text>
              <Text style={styles.headerSub}>
                {formattedDate} {dateStr === todayStr ? "· Today" : ""}
              </Text>
            </View>

            {onDateChange && (
              <View style={styles.dateNavRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous day"
                  style={styles.navBtn}
                  onPress={handlePrevDay}
                >
                  <Icon name="back" size={14} color={colors.navy} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next day"
                  disabled={dateStr >= todayStr}
                  style={[
                    styles.navBtn,
                    dateStr >= todayStr && { opacity: 0.3 },
                  ]}
                  onPress={handleNextDay}
                >
                  <Icon name="arrow" size={14} color={colors.navy} />
                </Pressable>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close roster"
              style={styles.closeBtn}
              onPress={onClose}
            >
              <Icon name="close" size={20} color={colors.navy} />
            </Pressable>
          </View>

          {/* Controls: Class Selector & Session Switcher */}
          <View style={styles.controlsBar}>
            {/* Session Tabs */}
            <View style={styles.sessionToggleRow}>
              <Pressable
                style={[
                  styles.sessionBtn,
                  session === "morning" && styles.sessionBtnActive,
                ]}
                onPress={() => setSession("morning")}
              >
                <Icon
                  name="flash"
                  size={12}
                  color={session === "morning" ? colors.white : colors.slate500}
                />
                <Text
                  style={[
                    styles.sessionBtnText,
                    session === "morning" && styles.sessionBtnTextActive,
                  ]}
                >
                  Morning
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.sessionBtn,
                  session === "afternoon" && styles.sessionBtnActive,
                ]}
                onPress={() => setSession("afternoon")}
              >
                <Icon
                  name="clock"
                  size={12}
                  color={session === "afternoon" ? colors.white : colors.slate500}
                />
                <Text
                  style={[
                    styles.sessionBtnText,
                    session === "afternoon" && styles.sessionBtnTextActive,
                  ]}
                >
                  Afternoon
                </Text>
              </Pressable>
            </View>

            {/* Class Arm Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              <Pressable
                style={[
                  styles.classFilterPill,
                  selectedClassId === "all" && styles.classFilterPillActive,
                ]}
                onPress={() => setSelectedClassId("all")}
              >
                <Text
                  style={[
                    styles.classFilterText,
                    selectedClassId === "all" && styles.classFilterTextActive,
                  ]}
                >
                  All Classes ({data.students.length})
                </Text>
              </Pressable>

              {(data.classes || []).map((c) => {
                const count = (data.students || []).filter(
                  (s) => s.className === c.name || s.classes?.includes(c.name)
                ).length;
                const isSelected = selectedClassId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.classFilterPill,
                      isSelected && styles.classFilterPillActive,
                    ]}
                    onPress={() => setSelectedClassId(c.id)}
                  >
                    <Text
                      style={[
                        styles.classFilterText,
                        isSelected && styles.classFilterTextActive,
                      ]}
                    >
                      {c.name} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.greenDark }]}>
                {presentCount}
              </Text>
              <Text style={styles.metricLabel}>PRESENT</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.orange }]}>
                {lateCount}
              </Text>
              <Text style={styles.metricLabel}>LATE</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.danger }]}>
                {absentCount}
              </Text>
              <Text style={styles.metricLabel}>ABSENT / UNMARKED</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{attendanceRate}%</Text>
              <Text style={styles.metricLabel}>ATTENDANCE</Text>
            </View>
          </View>

          {/* Roster Scroll List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredStudents.length === 0 ? (
              <Card style={{ padding: spacing.xl, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>
                  No pupils found in this classroom filter.
                </Text>
              </Card>
            ) : (
              <>
                {/* 1. Present Students Section */}
                {presentStudents.length > 0 && (
                  <View style={styles.sectionWrap}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionTitle}>
                        PRESENT PUPILS ({presentStudents.length})
                      </Text>
                      <Badge text="Confirmed" tone="success" dot />
                    </View>

                    {presentStudents.map(({ student, record }) => (
                      <PupilRowItem
                        key={student.id}
                        student={student}
                        status="present"
                        record={record}
                        canMark={canMark}
                        isFutureDate={isFutureDate}
                        markingStudentId={markingStudentId}
                        onQuickMark={handleQuickMark}
                        onClose={onClose}
                      />
                    ))}
                  </View>
                )}

                {/* 2. Late Students Section */}
                {lateStudents.length > 0 && (
                  <View style={styles.sectionWrap}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionTitle}>
                        LATE ARRIVALS ({lateStudents.length})
                      </Text>
                      <Badge text="Late" tone="warning" dot />
                    </View>

                    {lateStudents.map(({ student, record }) => (
                      <PupilRowItem
                        key={student.id}
                        student={student}
                        status="late"
                        record={record}
                        canMark={canMark}
                        isFutureDate={isFutureDate}
                        markingStudentId={markingStudentId}
                        onQuickMark={handleQuickMark}
                        onClose={onClose}
                      />
                    ))}
                  </View>
                )}

                {/* 3. Absent / Unmarked Students Section */}
                {absentStudents.length > 0 && (
                  <View style={styles.sectionWrap}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionTitle}>
                        ABSENT / UNMARKED ({absentStudents.length})
                      </Text>
                      <Badge text="Action Needed" tone="danger" dot />
                    </View>

                    {absentStudents.map(({ student, record }) => (
                      <PupilRowItem
                        key={student.id}
                        student={student}
                        status="absent"
                        record={record}
                        canMark={canMark}
                        isFutureDate={isFutureDate}
                        markingStudentId={markingStudentId}
                        onQuickMark={handleQuickMark}
                        onClose={onClose}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface PupilRowItemProps {
  student: Student;
  status: "present" | "late" | "absent";
  record?: StudentAttendance;
  canMark: boolean;
  isFutureDate: boolean;
  markingStudentId: string | null;
  onQuickMark: (student: Student, status: "present" | "late" | "absent") => void;
  onClose: () => void;
}

function PupilRowItem({
  student,
  status,
  record,
  canMark,
  isFutureDate,
  markingStudentId,
  onQuickMark,
  onClose,
}: PupilRowItemProps) {
  const isPending = markingStudentId === student.id;

  const handleNavigateProfile = () => {
    onClose();
    router.push({
      pathname: "/student-detail" as any,
      params: { id: student.id },
    });
  };

  return (
    <Card style={styles.pupilCard}>
      <Pressable style={styles.pupilInfo} onPress={handleNavigateProfile}>
        <Avatar name={student.name} size={40} role="student" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.pupilName} numberOfLines={1}>
            {student.name}
          </Text>
          <Text style={styles.pupilMeta}>
            {student.className} · ID: {student.id}
          </Text>
        </View>
      </Pressable>

      {/* Quick Mark Buttons for Faculty */}
      {canMark && !isFutureDate ? (
        <View style={styles.markBtnGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark Present"
            disabled={isPending}
            style={[
              styles.markBtn,
              status === "present" && styles.markBtnActivePresent,
            ]}
            onPress={() => onQuickMark(student, "present")}
          >
            <Text
              style={[
                styles.markBtnText,
                status === "present" && styles.markBtnTextActive,
              ]}
            >
              P
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark Late"
            disabled={isPending}
            style={[
              styles.markBtn,
              status === "late" && styles.markBtnActiveLate,
            ]}
            onPress={() => onQuickMark(student, "late")}
          >
            <Text
              style={[
                styles.markBtnText,
                status === "late" && styles.markBtnTextActive,
              ]}
            >
              L
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark Absent"
            disabled={isPending}
            style={[
              styles.markBtn,
              status === "absent" && styles.markBtnActiveAbsent,
            ]}
            onPress={() => onQuickMark(student, "absent")}
          >
            <Text
              style={[
                styles.markBtnText,
                status === "absent" && styles.markBtnTextActive,
              ]}
            >
              A
            </Text>
          </Pressable>
        </View>
      ) : (
        <Badge
          text={status.toUpperCase()}
          tone={
            status === "present"
              ? "success"
              : status === "late"
              ? "warning"
              : "danger"
          }
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "92%",
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  dateNavRow: {
    flexDirection: "row",
    gap: 4,
    marginRight: 6,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionToggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sessionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  sessionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slate600,
  },
  sessionBtnTextActive: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  classFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classFilterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  classFilterText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.slate600,
  },
  classFilterTextActive: {
    color: colors.white,
  },
  metricsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricItem: {
    alignItems: "center",
    gap: 1,
  },
  metricVal: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  scrollList: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sectionWrap: {
    gap: spacing.xs + 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  pupilCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  pupilInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  pupilName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  pupilMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  markBtnGroup: {
    flexDirection: "row",
    gap: 4,
  },
  markBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  markBtnActivePresent: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  markBtnActiveLate: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  markBtnActiveAbsent: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  markBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.slate600,
  },
  markBtnTextActive: {
    color: "#ffffff",
  },
});
