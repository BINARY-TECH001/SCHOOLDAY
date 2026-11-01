import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Card, ListItem } from "../../components/ui";

export interface StaffHomeSectionProps {
  clockedInToday: boolean;
  clockInTime?: string;
  onOpenDigitalId: () => void;
  pendingLeavesCount: number;
}

export function StaffHomeSection({
  clockedInToday,
  clockInTime,
  onOpenDigitalId,
  pendingLeavesCount,
}: StaffHomeSectionProps) {
  return (
    <View style={styles.container}>
      {/* Staff Daily Status Metrics */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>PUNCH CLOCK</Text>
          <Text
            style={[
              styles.metricValue,
              { color: clockedInToday ? colors.greenDark : colors.orange },
            ]}
          >
            {clockedInToday ? "Clocked In" : "Not Clocked"}
          </Text>
          <Text style={styles.metricHint}>
            {clockedInToday
              ? `Verified on campus at ${clockInTime || "07:30"}`
              : "Face ID punch-in required"}
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>GATE ACCESS</Text>
          <Text style={[styles.metricValue, { color: colors.navy }]}>Active</Text>
          <Text style={styles.metricHint}>Official Staff Pass</Text>
        </Card>
      </View>

      {/* Staff Daily Duties & Services */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Operations</Text>
        </View>

        <Card style={styles.listCard}>
          <ListItem
            title="Attendance Clock"
            subtitle={
              clockedInToday
                ? "Clock-in verified · Tap to clock out at departure"
                : "Clock-in required · Tap to verify attendance"
            }
            icon="clock"
            badge={clockedInToday ? "Verified" : "Pending"}
            badgeTone={clockedInToday ? "success" : "warning"}
            onPress={() => router.push("/attendance")}
          />
          <ListItem
            title="Digital Staff ID Card"
            subtitle="Campus access pass with photo & QR code"
            icon="verify"
            badge="Digital Pass"
            badgeTone="brand"
            onPress={onOpenDigitalId}
          />
          <ListItem
            title="Leave & Time-Off"
            subtitle={
              pendingLeavesCount > 0
                ? `${pendingLeavesCount} request pending HR review`
                : "Submit time-off or check leave balance"
            }
            icon="calendar"
            onPress={() => router.push("/leave")}
          />
          <ListItem
            title="School Calendar & Holidays"
            subtitle="View term milestones and official campus events"
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
    gap: spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  metricValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  metricHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
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
  listCard: {
    padding: 0,
    paddingHorizontal: spacing.sm,
  },
});
