import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../../../theme/tokens";
import { Card } from "../../../components/ui";
import { ProfileFieldRow } from "../components/ProfileFieldRow";

export interface OwnerProfileSectionProps {
  memberId: string;
  governanceTitle?: string;
  phone?: string;
  email?: string;
  schoolName: string;
  canViewPrivatePhone?: boolean;
}

export function OwnerProfileSection({
  memberId,
  governanceTitle = "School Proprietor & Chief Executive",
  phone,
  email,
  schoolName,
  canViewPrivatePhone = true,
}: OwnerProfileSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Institutional Governance & Leadership</Text>

      <Card style={styles.card}>
        <ProfileFieldRow
          label="Proprietor Member ID"
          value={memberId}
          icon="verify"
          copyable
        />
        <ProfileFieldRow
          label="Governance Authority"
          value={governanceTitle}
          icon="building"
        />
        <ProfileFieldRow
          label="Institution Managed"
          value={schoolName}
          icon="school"
        />
        <ProfileFieldRow
          label="Administrative Clearance"
          value="Root School Ownership · Full Signing Authority"
          icon="shield"
        />
        <ProfileFieldRow
          label="Executive Office Email"
          value={email || "proprietor@schoolday.ng"}
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
