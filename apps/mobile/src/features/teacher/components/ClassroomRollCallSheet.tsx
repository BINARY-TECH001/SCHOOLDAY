import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Avatar, Badge, Button, Card } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { SchoolClass, Student } from "../../../domain/model";
import { useSchool } from "../../../providers/AppProvider";
import { DailyStudentRosterAttendanceSheet } from "../../attendance/DailyStudentRosterAttendanceSheet";

export interface ClassroomRollCallSheetProps {
  visible: boolean;
  onClose: () => void;
  schoolClass: SchoolClass;
  students: Student[];
}

type RollCallStatus = "present" | "absent" | "late";
type SessionType = "morning" | "afternoon";

export function ClassroomRollCallSheet({
  visible,
  onClose,
  schoolClass,
  students,
}: ClassroomRollCallSheetProps) {
  const insets = useSafeAreaInsets();
  const { context, services, data, refresh } = useSchool();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [session, setSession] = useState<SessionType>(() => {
    const currentHour = new Date().getHours();
    return currentHour < 12 ? "morning" : "afternoon";
  });
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false);

  // State: pupilId -> status (defaults to "present")
  const [attendanceMap, setAttendanceMap] = useState<Record<string, RollCallStatus>>({});
  const [saving, setSaving] = useState(false);

  const studentIdsKey = useMemo(
    () => students.map((s) => s.id).join(","),
    [students]
  );

  // Sync attendanceMap from database records when selectedDate, session, or students change
  useEffect(() => {
    if (!visible) return;
    const records = data.studentAttendance || [];

    setAttendanceMap((prev) => {
      const next: Record<string, RollCallStatus> = {};
      let changed = false;

      students.forEach((st) => {
        const match = records.find(
          (r) =>
            r.studentId === st.id &&
            r.date === selectedDate &&
            (r.session === session || r.session === "full_day")
        );
        const val = match ? match.status : (prev[st.id] || "present");
        next[st.id] = val;
        if (prev[st.id] !== val) {
          changed = true;
        }
      });

      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [visible, selectedDate, session, studentIdsKey, data.studentAttendance]);

  // Statistics
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;

    Object.values(attendanceMap).forEach((status) => {
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "late") late++;
    });

    return { total: students.length, present, absent, late };
  }, [attendanceMap, students.length]);

  const toggleStatus = (studentId: string, status: RollCallStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, RollCallStatus> = {};
    students.forEach((st) => {
      updated[st.id] = "present";
    });
    setAttendanceMap(updated);
    toast.info("Marked all pupils as present.");
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    if (selectedDate >= todayStr) {
      toast.info("Cannot mark attendance for future dates.");
      return;
    }
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextDate = d.toISOString().slice(0, 10);
    if (nextDate > todayStr) {
      toast.info("Cannot mark attendance for future dates.");
      return;
    }
    setSelectedDate(nextDate);
  };

  const formattedDate = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const d = new Date(year, (month || 1) - 1, day);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedDate]);

  const handleSubmitRollCall = async () => {
    if (!context) return;
    if (selectedDate > todayStr) {
      toast.error("Cannot mark attendance for future dates.");
      return;
    }
    setSaving(true);
    try {
      const records = students.map((st) => ({
        studentId: st.id,
        status: attendanceMap[st.id] || "present",
      }));

      await services.submitClassRollCall(context, {
        classId: schoolClass.id,
        className: schoolClass.name,
        date: selectedDate,
        session,
        records,
      });

      await refresh();

      toast.success(
        `Roll call confirmed for ${schoolClass.name} (${session === "morning" ? "Morning" : "Afternoon"})! ${stats.present}/${stats.total} present.`
      );
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit class roll call.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Classroom Roll Call</Text>
              <Text style={styles.headerSub}>
                {schoolClass.name} · {session === "morning" ? "Morning" : "Afternoon"} Verification
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Calendar Full View"
                style={styles.calendarFullCtaBtn}
                onPress={() => setFullCalendarOpen(true)}
              >
                <Icon name="calendar" size={13} color={colors.navy} />
                <Text style={styles.calendarFullCtaText}>Calendar View</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close roll call"
                style={styles.closeBtn}
                onPress={onClose}
              >
                <Icon name="close" size={20} color={colors.navy} />
              </Pressable>
            </View>
          </View>

          {/* Date & Session Selector Strip */}
          <View style={styles.controlsStrip}>
            {/* Date Navigator */}
            <View style={styles.dateNavRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous Day"
                style={styles.dateNavBtn}
                onPress={handlePrevDay}
              >
                <Icon name="back" size={16} color={colors.navy} />
              </Pressable>

              <View style={styles.dateDisplay}>
                <Icon name="calendar" size={13} color={colors.navy} />
                <Text style={styles.dateText}>{formattedDate}</Text>
                {selectedDate === todayStr && (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayPillText}>TODAY</Text>
                  </View>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next Day"
                disabled={selectedDate >= todayStr}
                style={[
                  styles.dateNavBtn,
                  selectedDate >= todayStr && { opacity: 0.3 },
                ]}
                onPress={handleNextDay}
              >
                <Icon name="arrow" size={16} color={colors.navy} />
              </Pressable>
            </View>

            {/* Morning / Afternoon Segmented Buttons */}
            <View style={styles.sessionToggleRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Morning Session"
                style={[
                  styles.sessionBtn,
                  session === "morning" && styles.sessionBtnActive,
                ]}
                onPress={() => setSession("morning")}
              >
                <Icon
                  name="flash"
                  size={14}
                  color={session === "morning" ? colors.white : colors.slate500}
                />
                <Text
                  style={[
                    styles.sessionBtnText,
                    session === "morning" && styles.sessionBtnTextActive,
                  ]}
                >
                  Morning Roll Call
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Afternoon Session"
                style={[
                  styles.sessionBtn,
                  session === "afternoon" && styles.sessionBtnActive,
                ]}
                onPress={() => setSession("afternoon")}
              >
                <Icon
                  name="clock"
                  size={14}
                  color={session === "afternoon" ? colors.white : colors.slate500}
                />
                <Text
                  style={[
                    styles.sessionBtnText,
                    session === "afternoon" && styles.sessionBtnTextActive,
                  ]}
                >
                  Afternoon Roll Call
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.green }]}>
                {stats.present}
              </Text>
              <Text style={styles.metricLabel}>Present</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, stats.absent > 0 && { color: colors.danger }]}>
                {stats.absent}
              </Text>
              <Text style={styles.metricLabel}>Absent</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, stats.late > 0 && { color: colors.orange }]}>
                {stats.late}
              </Text>
              <Text style={styles.metricLabel}>Late</Text>
            </View>
            <View style={styles.metricDivider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all present"
              style={styles.markAllBtn}
              onPress={handleMarkAllPresent}
            >
              <Text style={styles.markAllBtnText}>All Present</Text>
            </Pressable>
          </View>

          {/* Pupils Roster List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {students.length === 0 ? (
              <Card style={{ padding: spacing.lg, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>
                  No pupils currently enrolled in {schoolClass.name}.
                </Text>
              </Card>
            ) : (
              students.map((st) => {
                const currentStatus = attendanceMap[st.id] || "present";
                return (
                  <Card key={st.id} style={styles.pupilRow}>
                    <Avatar name={st.name} size={40} role="student" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.pupilName} numberOfLines={1}>
                        {st.name}
                      </Text>
                      <Text style={styles.pupilMeta}>
                        ID: {st.id} {st.gender ? `· ${st.gender}` : ""}
                      </Text>
                    </View>

                    {/* Status Toggle Buttons */}
                    <View style={styles.statusButtonGroup}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Mark Present"
                        style={[
                          styles.statusBtn,
                          currentStatus === "present" && styles.statusBtnPresent,
                        ]}
                        onPress={() => toggleStatus(st.id, "present")}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            currentStatus === "present" && styles.statusBtnTextActive,
                          ]}
                        >
                          P
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Mark Late"
                        style={[
                          styles.statusBtn,
                          currentStatus === "late" && styles.statusBtnLate,
                        ]}
                        onPress={() => toggleStatus(st.id, "late")}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            currentStatus === "late" && styles.statusBtnTextActive,
                          ]}
                        >
                          L
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Mark Absent"
                        style={[
                          styles.statusBtn,
                          currentStatus === "absent" && styles.statusBtnAbsent,
                        ]}
                        onPress={() => toggleStatus(st.id, "absent")}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            currentStatus === "absent" && styles.statusBtnTextActive,
                          ]}
                        >
                          A
                        </Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <Button
              title={saving ? "Saving Roll Call…" : `Confirm ${session === "morning" ? "Morning" : "Afternoon"} Roll Call (${stats.present}/${stats.total})`}
              variant="primary"
              size="md"
              icon="check"
              disabled={saving || students.length === 0 || selectedDate > todayStr}
              onPress={handleSubmitRollCall}
            />
          </View>
        </View>
      </View>

      {/* Full Student Roster Attendance Sheet */}
      {fullCalendarOpen && (
        <DailyStudentRosterAttendanceSheet
          visible={fullCalendarOpen}
          dateStr={selectedDate}
          initialClassId={schoolClass.id}
          onClose={() => setFullCalendarOpen(false)}
          onDateChange={(d) => setSelectedDate(d)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarFullCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarFullCtaText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  controlsStrip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateNavBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  todayPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.orangeLight,
  },
  todayPillText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.orange,
  },
  sessionToggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 4,
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
    fontSize: 17,
    color: colors.navy,
  },
  metricLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  markAllBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  markAllBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  scrollList: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    gap: spacing.xs + 4,
  },
  pupilRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
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
  statusButtonGroup: {
    flexDirection: "row",
    gap: 4,
  },
  statusBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBtnPresent: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  statusBtnLate: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  statusBtnAbsent: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  statusBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.slate600,
  },
  statusBtnTextActive: {
    color: colors.white,
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
