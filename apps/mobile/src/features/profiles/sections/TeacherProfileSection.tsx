import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../../../theme/tokens";
import { Card } from "../../../components/ui";
import { ProfileFieldRow } from "../components/ProfileFieldRow";

export interface TeacherProfileSectionProps {
  staffId: string;
  department?: string;
  assignedClass?: string;
  subjects?: string[];
  rank?: string;
  phone?: string;
  email?: string;
  canViewPrivatePhone?: boolean;
}

export function TeacherProfileSection({
  staffId,
  department = "Academic Faculty",
  assignedClass,
  subjects = ["English Language", "Literature in English"],
  rank = "Senior Faculty Educator · Level 4",
  phone,
  email,
  canViewPrivatePhone = true,
}: TeacherProfileSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Academic Faculty & Classroom Duties</Text>

      <Card style={styles.card}>
        <ProfileFieldRow
          label="Staff Identification Number"
          value={staffId}
          icon="verify"
          copyable
        />
        <ProfileFieldRow
          label="Department / Faculty"
          value={department}
          icon="building"
        />
        <ProfileFieldRow
          label="Assigned Classroom Stream"
          value={assignedClass || "Classroom assignment pending"}
          icon="school"
        />
        <ProfileFieldRow
          label="Teaching Subjects & Modules"
          value={subjects.join(", ")}
          icon="book"
        />
        <ProfileFieldRow
          label="Academic Seniority Rank"
          value={rank}
          icon="verify"
        />
        <ProfileFieldRow
          label="Official Faculty Email"
          value={email || "faculty@schoolday.ng"}
          icon="sms"
          copyable
        />
        <ProfileFieldRow
          label="Mobile Contact"
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
