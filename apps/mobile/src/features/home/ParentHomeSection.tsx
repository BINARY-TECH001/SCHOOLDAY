import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Card, EmptyState, ListItem } from "../../components/ui";
import { balance, money } from "../../domain/model";

export interface StudentChild {
  id: string;
  name: string;
  className: string;
  avatar?: string;
}

export interface InvoiceItem {
  id: string;
  studentId: string;
  paid: number;
  items: { amount: number }[];
}

export interface ParentHomeSectionProps {
  childrenList: StudentChild[];
  invoices: InvoiceItem[];
  totalOutstanding: number;
}

export function ParentHomeSection({
  childrenList,
  invoices,
  totalOutstanding,
}: ParentHomeSectionProps) {
  return (
    <View style={styles.container}>
      {/* Parent Executive Summary */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>OUTSTANDING TUITION</Text>
          <Text
            style={[
              styles.metricValue,
              totalOutstanding > 0 && { color: colors.orange },
            ]}
          >
            {money(totalOutstanding)}
          </Text>
          <Text style={styles.metricHint}>
            {childrenList.length} linked child{childrenList.length === 1 ? "" : "ren"}
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>CAMPUS ATTENDANCE</Text>
          <Text style={[styles.metricValue, { color: colors.greenDark }]}>
            Verified
          </Text>
          <Text style={styles.metricHint}>Present on campus today</Text>
        </Card>
      </View>

      {/* Enrolled Children Roster */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Enrolled Children</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/fees")}
          >
            <Text style={styles.sectionActionText}>Pay All</Text>
          </Pressable>
        </View>

        {childrenList.length === 0 ? (
          <EmptyState
            title="No Children Linked"
            subtitle="Contact school administration to link your student records."
            icon="people"
          />
        ) : (
          <Card style={styles.listCard}>
            {childrenList.map((child) => {
              const childBalance = invoices
                .filter((i) => i.studentId === child.id)
                .reduce((sum, i) => sum + balance(i as any), 0);

              const isSettled = childBalance <= 0;

              return (
                <ListItem
                  key={child.id}
                  title={child.name}
                  subtitle={`${child.className} · ID: ${child.id}`}
                  avatarUri={child.avatar}
                  trailing={money(childBalance)}
                  badge={isSettled ? "Settled" : "Tuition Due"}
                  badgeTone={isSettled ? "success" : "warning"}
                  onPress={() =>
                    router.push({
                      pathname: "/fees",
                      params: { child: child.id },
                    })
                  }
                />
              );
            })}
          </Card>
        )}
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
