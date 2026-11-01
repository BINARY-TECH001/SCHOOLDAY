import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../../../theme/tokens";
import { Card } from "../../../components/ui";
import { ProfileFieldRow } from "../components/ProfileFieldRow";

export interface StaffProfileSectionProps {
  staffId: string;
  department?: string;
  dutyRole?: string;
  shiftHours?: string;
  phone?: string;
  email?: string;
  canViewPrivatePhone?: boolean;
}

export function StaffProfileSection({
  staffId,
  department = "Campus Operations",
  dutyRole = "Operations Officer",
  shiftHours = "07:00 AM – 04:00 PM",
  phone,
  email,
  canViewPrivatePhone = true,
}: StaffProfileSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Operations & Campus Duties</Text>

      <Card style={styles.card}>
        <ProfileFieldRow
          label="Staff Identification Number"
          value={staffId}
          icon="verify"
          copyable
        />
        <ProfileFieldRow
          label="Department / Unit"
          value={department}
          icon="building"
        />
        <ProfileFieldRow
          label="Operational Duty Assignment"
          value={dutyRole}
          icon="task"
        />
        <ProfileFieldRow
          label="Official Work Shift"
          value={shiftHours}
          icon="clock"
        />
        <ProfileFieldRow
          label="Campus Access Clearance"
          value="Security Level 2 · Active Gate Pass"
          icon="shield"
        />
        <ProfileFieldRow
          label="Official Campus Email"
          value={email || "staff@schoolday.ng"}
          icon="sms"
          copyable
        />
        <ProfileFieldRow
          label="Direct Mobile Line"
          value={phone}
          icon="call"
          copyable
          isProtected={!canViewPrivatePhone}
          isLast
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    marginLeft: 2,
  },
  card: {
    padding: 0,
    paddingHorizontal: spacing.md,
  },
});
