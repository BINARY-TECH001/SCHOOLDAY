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

export interface HrHomeSectionProps {
  totalStaff: number;
  staffClockedInCount: number;
  pendingLeavesCount: number;
}

export function HrHomeSection({
  totalStaff,
  staffClockedInCount,
  pendingLeavesCount,
}: HrHomeSectionProps) {
  const attendanceRate =
    totalStaff > 0 ? Math.round((staffClockedInCount / totalStaff) * 100) : 100;

  return (
    <View style={styles.container}>
      {/* HR Executive Metrics Grid */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>FACULTY ATTENDANCE</Text>
          <Text style={styles.metricValue}>{attendanceRate}%</Text>
          <Text style={styles.metricHint}>
            {staffClockedInCount} of {totalStaff} on campus
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>LEAVE REQUESTS</Text>
          <Text
            style={[
              styles.metricValue,
              pendingLeavesCount > 0 && { color: colors.orange },
            ]}
          >
            {pendingLeavesCount}
          </Text>
          <Text style={styles.metricHint}>
            {pendingLeavesCount > 0 ? "Awaiting HR approval" : "All reviews cleared"}
          </Text>
        </Card>
      </View>

      {/* Human Resources Operations */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>HR & People Operations</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/directory")}
          >
            <Text style={styles.sectionActionText}>Staff Directory</Text>
          </Pressable>
        </View>

        <Card style={styles.listCard}>
          <ListItem
            title="Leave & Time-Off Approvals"
            subtitle={`${pendingLeavesCount} pending approval review`}
            icon="calendar"
            badge={pendingLeavesCount > 0 ? "Requires Review" : "Up to Date"}
            badgeTone={pendingLeavesCount > 0 ? "warning" : "success"}
            onPress={() => router.push("/approvals")}
          />
          <ListItem
            title="Faculty & Staff Directory"
            subtitle={`${totalStaff} registered members across departments`}
            icon="people"
            onPress={() => router.push("/directory")}
          />
          <ListItem
            title="Daily Attendance Audit"
            subtitle="View clock-in times, geofences, and exceptions"
            icon="clock"
            onPress={() => router.push("/attendance")}
          />
          <ListItem
            title="Payroll Records"
            subtitle="Staff payroll verification & net pay readiness"
            icon="wallet"
            onPress={() => router.push("/payroll")}
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
  sectionActionText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.orange,
  },
  listCard: {
    padding: 0,
    paddingHorizontal: spacing.sm,
  },
});
