import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Badge, Card, EmptyState } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { Leave } from "../../../domain/model";

export interface StaffLeaveSectionProps {
  leaves: Leave[];
  isOwnerOrAdmin: boolean;
  onDecideLeave?: (leaveId: string, approve: boolean) => void;
  isDeciding?: boolean;
}

export function StaffLeaveSection({
  leaves,
  isOwnerOrAdmin,
  onDecideLeave,
  isDeciding,
}: StaffLeaveSectionProps) {
  if (leaves.length === 0) {
    return (
      <Card style={styles.card}>
        <EmptyState
          title="No Time-Off Requests"
          subtitle="This staff member has not submitted any annual, medical, or family leave requests."
          icon="calendar"
        />
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>LEAVE & ABSENCE HISTORY ({leaves.length})</Text>

      {leaves.map((leave) => {
        const startDate = new Date(leave.start);
        const endDate = new Date(leave.end);
        const dayDiff = Math.max(
          1,
          Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        const isPending =
          leave.status === "Submitted" || leave.status === "Waiting to sync";

        return (
          <Card key={leave.id} style={[styles.leaveCard, isPending && styles.leaveCardPending]}>
            <View style={styles.leaveTopRow}>
              <View style={styles.leaveTypeCol}>
                <Text style={styles.leaveTypeTitle}>{leave.type} Leave</Text>
                <Text style={styles.leaveDuration}>
                  {dayDiff} {dayDiff === 1 ? "day" : "days"} · {leave.start} to {leave.end}
                </Text>
              </View>

              <Badge
                tone={
                  leave.status === "Approved"
                    ? "success"
                    : leave.status === "Rejected"
                    ? "danger"
                    : isPending
                    ? "warning"
                    : "neutral"
                }
                text={
                  isPending
                    ? "Pending Decision"
                    : leave.status.toUpperCase()
                }
                size="sm"
              />
            </View>

            {/* Leave Reason Note */}
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{leave.reason}</Text>
            </View>

            {/* Proprietor Decision Controls */}
            {isPending && isOwnerOrAdmin && onDecideLeave && (
              <View style={styles.decisionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Approve leave request"
                  style={({ pressed }) => [
                    styles.decisionBtn,
                    styles.approveBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  disabled={isDeciding}
                  onPress={() => onDecideLeave(leave.id, true)}
                >
                  <Icon name="check" size={14} color="#ffffff" />
                  <Text style={styles.decisionBtnText}>
                    {isDeciding ? "Processing…" : "Approve Leave"}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reject leave request"
                  style={({ pressed }) => [
                    styles.decisionBtn,
                    styles.rejectBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  disabled={isDeciding}
                  onPress={() => onDecideLeave(leave.id, false)}
                >
                  <Icon name="close" size={14} color="#ffffff" />
                  <Text style={styles.decisionBtnText}>
                    {isDeciding ? "Processing…" : "Reject Request"}
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>
        );
      })}
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
  leaveCard: {
    padding: spacing.md,
    gap: 10,
    backgroundColor: colors.surface,
  },
  leaveCardPending: {
    borderColor: "#fed7aa",
    backgroundColor: "#fffdfa",
  },
  leaveTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  leaveTypeCol: {
    gap: 2,
    flex: 1,
  },
  leaveTypeTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  leaveDuration: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  reasonBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    borderRadius: radii.sm,
    gap: 2,
  },
  reasonLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    textTransform: "uppercase",
  },
  reasonText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.slate800,
    lineHeight: 18,
  },
  decisionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: radii.md,
  },
  approveBtn: {
    backgroundColor: colors.green,
  },
  rejectBtn: {
    backgroundColor: colors.danger,
  },
  decisionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
});
