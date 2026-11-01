import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../../../theme/tokens";
import { Card, ListItem } from "../../../components/ui";
import { ProfileFieldRow } from "../components/ProfileFieldRow";
import { Student } from "../../../domain/model";
import { router } from "expo-router";

export interface ParentProfileSectionProps {
  guardianId: string;
  phone?: string;
  email?: string;
  childrenList: Student[];
  canViewPrivateContact?: boolean;
}

export function ParentProfileSection({
  guardianId,
  phone,
  email,
  childrenList,
  canViewPrivateContact = true,
}: ParentProfileSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Guardian Affiliation & Contact</Text>

      <Card style={styles.card}>
        <ProfileFieldRow
          label="Guardian Identifier"
          value={guardianId}
          icon="profile"
          copyable
        />
        <ProfileFieldRow
          label="Registered Parent Email"
          value={email || "guardian@parent.schoolday.ng"}
          icon="sms"
          copyable
        />
        <ProfileFieldRow
          label="Emergency Contact Mobile"
          value={phone}
          icon="call"
          copyable
          isProtected={!canViewPrivateContact}
          isLast
        />
      </Card>

      {/* Linked Children Roster */}
      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
        <Text style={styles.sectionTitle}>Linked Enrolled Children</Text>
        <Card style={styles.card}>
          {childrenList.length === 0 ? (
            <View style={{ padding: spacing.md }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
                No student profiles currently linked to this guardian record.
              </Text>
            </View>
          ) : (
            childrenList.map((child, idx) => (
              <ListItem
                key={child.id}
                title={child.name}
                subtitle={`${child.className} · ID: ${child.id}`}
                avatarUri={child.avatar}
                badge={child.className}
                badgeTone="neutral"
                onPress={() =>
                  router.push({
                    pathname: "/student-detail",
                    params: { id: child.id },
                  })
                }
              />
            ))
          )}
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
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
