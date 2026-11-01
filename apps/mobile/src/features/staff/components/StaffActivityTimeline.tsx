import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Badge, Card, EmptyState } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { Attendance, Leave, Payroll, Staff } from "../../../domain/model";
import { StaffActivityEvent, StaffTask } from "../types";

export interface StaffActivityTimelineProps {
  staff: Staff;
  attendance: Attendance[];
  leaves: Leave[];
  payroll?: Payroll;
  tasks: StaffTask[];
}

export function StaffActivityTimeline({
  staff,
  attendance,
  leaves,
  payroll,
  tasks,
}: StaffActivityTimelineProps) {
  // Aggregate real events from domain records
  const events = useMemo<StaffActivityEvent[]>(() => {
    const list: StaffActivityEvent[] = [];

    // 1. Attendance events
    attendance.forEach((a) => {
      list.push({
        id: `act-in-${a.id}`,
        timestamp: a.inAt,
        type: "attendance",
        title: a.arrivalStatus === "late" ? "Late Arrival Clock-In" : "Campus Arrival Recorded",
        description: `Verified at ${a.locationName || "Campus Gate"} (${a.photoVerified ? "Biometric Match" : "Gate Scanner"})`,
        badgeTone: a.arrivalStatus === "late" ? "warning" : "success",
      });

      if (a.outAt) {
        list.push({
          id: `act-out-${a.id}`,
          timestamp: a.outAt,
          type: "attendance",
          title: "Campus Dismissal Clock-Out",
          description: `Completed shift recorded at ${a.locationName || "Campus Gate"}`,
          badgeTone: "neutral",
        });
      }
    });

    // 2. Leave events
    leaves.forEach((l) => {
      list.push({
        id: `act-leave-${l.id}`,
        timestamp: l.start,
        type: "leave",
        title: `${l.type} Leave · ${l.status.toUpperCase()}`,
        description: `Dates: ${l.start} to ${l.end}. Reason: "${l.reason}"`,
        badgeTone:
          l.status === "Approved"
            ? "success"
            : l.status === "Rejected"
            ? "danger"
            : "warning",
      });
    });

    // 3. Task events
    tasks.forEach((t) => {
      list.push({
        id: `act-task-${t.id}`,
        timestamp: t.createdAt,
        type: "task",
        title: `Task Assigned: ${t.title}`,
        description: `Priority: ${t.priority.toUpperCase()} · Due: ${t.dueDate}`,
        badgeTone: t.status === "completed" ? "success" : "purple",
        actorName: t.assignedByName,
      });

      if (t.completedAt) {
        list.push({
          id: `act-task-done-${t.id}`,
          timestamp: t.completedAt,
          type: "task",
          title: `Task Completed: ${t.title}`,
          description: t.completionNotes || "Marked as completed by staff member",
          badgeTone: "success",
        });
      }
    });

    // 4. Payroll event
    if (payroll) {
      list.push({
        id: `act-pay-${payroll.id}`,
        timestamp: payroll.disbursedAt || new Date().toISOString(),
        type: "payroll",
        title: `Payroll Record: ${payroll.period}`,
        description: `Status: ${payroll.status}. Salary structure active.`,
        badgeTone: payroll.status === "Paid" ? "success" : "neutral",
      });
    }

    // Sort newest first
    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [attendance, leaves, payroll, tasks]);

  if (events.length === 0) {
    return (
      <Card style={styles.card}>
        <EmptyState
          title="No Activity Events Recorded"
          subtitle="Meaningful operational events such as attendance punches, task assignments, and time-off requests will appear here."
          icon="document"
        />
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>VERIFIED OPERATIONAL TIMELINE ({events.length})</Text>

      <View style={styles.timelineList}>
        {events.map((event, idx) => {
          const eventDate = new Date(event.timestamp);
          const dateStr = eventDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const timeStr = eventDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const isLast = idx === events.length - 1;

          return (
            <View key={event.id} style={styles.timelineItem}>
              {/* Left Column: Icon & Vertical Line */}
              <View style={styles.lineCol}>
                <View
                  style={[
                    styles.eventIconCircle,
                    event.type === "attendance"
                      ? styles.iconAttendance
                      : event.type === "leave"
                      ? styles.iconLeave
                      : event.type === "task"
                      ? styles.iconTask
                      : styles.iconPayroll,
                  ]}
                >
                  <Icon
                    name={
                      event.type === "attendance"
                        ? "clock"
                        : event.type === "leave"
                        ? "calendar"
                        : event.type === "task"
                        ? "verify"
                        : "wallet"
                    }
                    size={13}
                    color={colors.navy}
                  />
                </View>
                {!isLast && <View style={styles.verticalLine} />}
              </View>

              {/* Right Column: Event Content Card */}
              <View style={styles.eventContent}>
                <View style={styles.eventHeaderRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTimestamp}>
                    {dateStr} · {timeStr}
                  </Text>
                </View>

                <Text style={styles.eventDesc}>{event.description}</Text>

                {event.actorName ? (
                  <Text style={styles.eventActor}>Recorded by: {event.actorName}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.muted,
    textTransform: "uppercase",
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  lineCol: {
    alignItems: "center",
    width: 28,
  },
  eventIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconAttendance: {
    backgroundColor: "#ecfdf5",
  },
  iconLeave: {
    backgroundColor: "#faf5ff",
  },
  iconTask: {
    backgroundColor: "#fff7ed",
  },
  iconPayroll: {
    backgroundColor: "#f0f9ff",
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  eventContent: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 4,
  },
  eventHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  eventTimestamp: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  eventDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate700,
    lineHeight: 16,
  },
  eventActor: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
