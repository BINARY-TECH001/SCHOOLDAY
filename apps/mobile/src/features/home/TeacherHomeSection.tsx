import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing, shadows } from "../../theme/tokens";
import { Badge, Button, Card, Empty, ListItem } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useSchool } from "../../providers/AppProvider";
import { Attendance, SchoolClass, Staff } from "../../domain/model";
import { getTeacherAssignedClasses } from "../teacher/utils/teacherClass";
import { useStaffTasks } from "../staff/taskStore";

export interface TeacherHomeSectionProps {
  className?: string;
  studentCount?: number;
  clockedInToday?: boolean;
  clockInTime?: string;
  lessonsCount?: number;
  pendingLeavesCount?: number;
}

export function TeacherHomeSection(_props: TeacherHomeSectionProps) {
  const { data, context, services, act, busy } = useSchool();
  const [isClocking, setIsClocking] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Current staff profile
  const currentStaff = useMemo(() => {
    return data.staff.find((s) => s.userId === context.userId);
  }, [data.staff, context.userId]);

  // Real assigned classes
  const assignedClasses = useMemo(() => {
    return getTeacherAssignedClasses(data.classes || [], data.staff || [], context.userId);
  }, [data.classes, data.staff, context.userId]);

  // Real attendance punch today for this teacher
  const todayPunch = useMemo(() => {
    return data.attendance.find(
      (a) => a.userId === context.userId && a.inAt.slice(0, 10) === todayStr
    );
  }, [data.attendance, context.userId, todayStr]);

  const isClockedIn = Boolean(todayPunch && !todayPunch.outAt);
  const isClockedOut = Boolean(todayPunch?.outAt);
  const isNotClocked = !todayPunch;

  // Real tasks assigned to this teacher
  const { tasks, toggleTaskStatus } = useStaffTasks(
    context.schoolId,
    currentStaff?.id,
    context.userId
  );
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);

  // Lessons and leave count
  const lessonsCount = data.lessons.filter((l) => l.userId === context.userId).length;
  const pendingLeaves = data.leaves.filter(
    (l) => l.userId === context.userId && (l.status === "Submitted" || l.status === "Waiting to sync")
  ).length;

  // Attendance Punch Action
  const handleClockIn = async () => {
    if (isClocking) return;
    setIsClocking(true);
    try {
      await act(async () => {
        await services.attendance(context, "in", false);
      });
      Alert.alert("Clocked In", "Morning attendance has been successfully recorded.");
    } catch (err: any) {
      Alert.alert("Clock-In Error", err?.message || "Failed to record clock-in.");
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (isClocking) return;
    Alert.alert(
      "Confirm Clock-Out",
      "Are you ready to clock out and conclude your school day?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clock Out",
          onPress: async () => {
            setIsClocking(true);
            try {
              await act(async () => {
                await services.attendance(context, "out", false);
              });
              Alert.alert("Clocked Out", "Departure attendance has been successfully recorded.");
            } catch (err: any) {
              Alert.alert("Clock-Out Error", err?.message || "Failed to record clock-out.");
            } finally {
              setIsClocking(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Daily Attendance & Shift Punch Card */}
      <Card style={[styles.punchCard, shadows.sm]}>
        <View style={styles.punchHeader}>
          <View style={styles.punchStatusLeft}>
            <View
              style={[
                styles.punchDot,
                {
                  backgroundColor: isClockedIn
                    ? colors.greenDark
                    : isClockedOut
                    ? colors.navy
                    : colors.orange,
                },
              ]}
            />
            <Text style={styles.punchStatusTitle}>
              {isClockedIn
                ? "On Duty · Clocked In"
                : isClockedOut
                ? "Shift Finished · Clocked Out"
                : "Not Clocked In Today"}
            </Text>
          </View>
          <Badge
            text={
              isClockedIn
                ? todayPunch?.state === "Waiting to sync"
                  ? "Saved Locally"
                  : "Verified"
                : isClockedOut
                ? "Completed"
                : "Pending Punch"
            }
            tone={isClockedIn ? "success" : isClockedOut ? "neutral" : "warning"}
          />
        </View>

        <View style={styles.punchDetailRow}>
          <View style={styles.punchDetailCol}>
            <Text style={styles.punchMetaLabel}>ARRIVAL PUNCH</Text>
            <Text style={styles.punchMetaVal}>
              {todayPunch ? new Date(todayPunch.inAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "— —"}
            </Text>
          </View>
          <View style={styles.punchDivider} />
          <View style={styles.punchDetailCol}>
            <Text style={styles.punchMetaLabel}>DEPARTURE PUNCH</Text>
            <Text style={styles.punchMetaVal}>
              {todayPunch?.outAt ? new Date(todayPunch.outAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "— —"}
            </Text>
          </View>
          <View style={styles.punchDivider} />
          <View style={styles.punchDetailCol}>
            <Text style={styles.punchMetaLabel}>CAMPUS LOCATION</Text>
            <Text style={styles.punchMetaVal} numberOfLines={1}>
              {todayPunch?.locationName || "Main Campus"}
            </Text>
          </View>
        </View>

        {/* Primary Attendance Action Button */}
        {isNotClocked ? (
          <Button
            title={isClocking ? "Recording Arrival…" : "Clock In for Today"}
            onPress={handleClockIn}
            disabled={isClocking || busy}
            style={styles.clockInBtn}
          />
        ) : isClockedIn ? (
          <Button
            title={isClocking ? "Recording Departure…" : "Clock Out"}
            variant="outline"
            onPress={handleClockOut}
            disabled={isClocking || busy}
            style={styles.clockOutBtn}
          />
        ) : (
          <View style={styles.shiftDoneBanner}>
            <Icon name="verify" size={15} color={colors.navy} />
            <Text style={styles.shiftDoneText}>Today's attendance verified & complete</Text>
          </View>
        )}
      </Card>

      {/* 2. Assigned Classrooms Section */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assigned Classrooms</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/classes")}
            hitSlop={8}
          >
            <Text style={styles.sectionActionText}>View All</Text>
          </Pressable>
        </View>

        {assignedClasses.length === 0 ? (
          <Card style={[styles.emptyCard, shadows.sm]}>
            <View style={styles.emptyIconCircle}>
              <Icon name="school" size={24} color={colors.navy} />
            </View>
            <Text style={styles.emptyTitle}>No Classroom Assigned</Text>
            <Text style={styles.emptyDetail}>
              You have not been assigned to a classroom for this term. Please contact the school administrator to configure your assigned class.
            </Text>
          </Card>
        ) : (
          assignedClasses.map((cls) => {
            const classStudents = data.students.filter(
              (s) =>
                s.className.toLowerCase() === cls.name.toLowerCase() ||
                s.className.toLowerCase() === cls.code.toLowerCase() ||
                s.className.toLowerCase().includes(cls.name.toLowerCase())
            );

            return (
              <Card key={cls.id} style={[styles.classCard, shadows.sm]}>
                <View style={styles.classCardTop}>
                  <View style={styles.classIconTile}>
                    <Icon name="school" size={22} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.classNameText}>{cls.name}</Text>
                      <Badge text={cls.code} tone="brand" />
                    </View>
                    <Text style={styles.classStudentCount}>
                      {classStudents.length} {classStudents.length === 1 ? "Pupil" : "Pupils"} Enrolled
                    </Text>
                  </View>
                </View>

                <View style={styles.classActionsRow}>
                  <Pressable
                    style={styles.classActionBtn}
                    onPress={() => router.push({ pathname: "/class-detail", params: { id: cls.id } })}
                  >
                    <Icon name="people" size={14} color={colors.navy} />
                    <Text style={styles.classActionBtnText}>Class Workspace</Text>
                  </Pressable>

                  <Pressable
                    style={styles.classActionBtn}
                    onPress={() => router.push("/lessons")}
                  >
                    <Icon name="book" size={14} color={colors.navy} />
                    <Text style={styles.classActionBtnText}>Lesson Plans</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* 3. Assigned Operational Tasks */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assigned Operational Tasks</Text>
          {pendingTasks.length > 0 && (
            <Badge text={`${pendingTasks.length} Pending`} tone="warning" />
          )}
        </View>

        {tasks.length === 0 ? (
          <Card style={[styles.emptyTaskCard, shadows.sm]}>
            <Text style={styles.emptyTaskText}>No operational tasks currently assigned</Text>
          </Card>
        ) : (
          <Card style={[styles.taskListCard, shadows.sm]}>
            {tasks.slice(0, 4).map((task) => (
              <View key={task.id} style={styles.taskItemRow}>
                <Pressable
                  onPress={() => toggleTaskStatus(task.id)}
                  style={[
                    styles.taskCheckbox,
                    task.status === "completed" && styles.taskCheckboxActive,
                  ]}
                  hitSlop={8}
                >
                  {task.status === "completed" && (
                    <Icon name="verify" size={13} color="#ffffff" filled />
                  )}
                </Pressable>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[
                      styles.taskItemTitle,
                      task.status === "completed" && styles.taskItemDone,
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.taskDueDate}>Due {task.dueDate}</Text>
                    <Text style={styles.taskPriority}>· {task.priority.toUpperCase()} PRIORITY</Text>
                  </View>
                </View>

                <Badge
                  text={task.status === "completed" ? "Done" : "Pending"}
                  tone={task.status === "completed" ? "success" : "warning"}
                />
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* 4. Classroom Tools & Services List */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Teaching & Campus Services</Text>
        </View>

        <Card style={[styles.listCard, shadows.sm]}>
          <ListItem
            title="Curriculum & Lesson Modules"
            subtitle={`${lessonsCount} active curriculum lesson plans`}
            icon="book"
            badge={`${lessonsCount} Modules`}
            badgeTone="neutral"
            onPress={() => router.push("/lessons")}
          />
          <ListItem
            title="Time-Off & Leave Requests"
            subtitle={
              pendingLeaves > 0
                ? `${pendingLeaves} leave request pending HR decision`
                : "Submit leave or view annual time-off balance"
            }
            icon="calendar"
            badge={pendingLeaves > 0 ? "Under Review" : undefined}
            badgeTone="warning"
            onPress={() => router.push("/leave")}
          />
          <ListItem
            title="Academic Calendar & Milestones"
            subtitle="Campus schedule, mid-term breaks & exam periods"
            icon="calendar"
            onPress={() => router.push("/calendar" as any)}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  punchCard: {
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
  },
  punchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  punchStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  punchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  punchStatusTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  punchDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  punchDetailCol: {
    flex: 1,
    gap: 2,
  },
  punchDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  punchMetaLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  punchMetaVal: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  clockInBtn: {
    backgroundColor: colors.orange,
    height: 44,
  },
  clockOutBtn: {
    borderColor: colors.navy,
    height: 44,
  },
  shiftDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: radii.md,
  },
  shiftDoneText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  sectionActionText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.orange,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  emptyDetail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  classCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  classCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  classIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  classNameText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  classStudentCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  classActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  classActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classActionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  emptyTaskCard: {
    padding: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyTaskText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  taskListCard: {
    padding: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckboxActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  taskItemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  taskItemDone: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  taskDueDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  taskPriority: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.orange,
  },
  listCard: {
    padding: 0,
    paddingHorizontal: spacing.sm,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
