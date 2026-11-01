import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../../../theme/tokens";
import { Card } from "../../../components/ui";
import { ProfileFieldRow } from "../components/ProfileFieldRow";
import { Student } from "../../../domain/model";

export interface StudentProfileSectionProps {
  student: Student;
  guardianName?: string;
  canViewPrivateContact?: boolean;
  canViewFinancials?: boolean;
}

export function StudentProfileSection({
  student,
  guardianName,
  canViewPrivateContact = false,
  canViewFinancials = false,
}: StudentProfileSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Academic Student Record</Text>

      <Card style={styles.card}>
        <ProfileFieldRow
          label="Student Matriculation ID"
          value={student.id}
          icon="profile"
          copyable
        />
        <ProfileFieldRow
          label="Grade Classroom & Arm"
          value={student.className}
          icon="school"
        />
        <ProfileFieldRow
          label="Academic Session"
          value="2026/2027 Academic Year"
          icon="calendar"
        />
        <ProfileFieldRow
          label="Campus Enrollment Status"
          value="Active Student · Good Standing"
          icon="verify"
        />
        <ProfileFieldRow
          label="Registered Guardian Name"
          value={guardianName || "Parent / Guardian Record"}
          icon="people"
        />
        <ProfileFieldRow
          label="Emergency Guardian Contact"
          value={student.guardianPhone}
          icon="call"
          copyable
          isProtected={!canViewPrivateContact}
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
