import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Icon } from "../../components/Icon";
import { Badge, Card, ListItem } from "../../components/ui";
import { money } from "../../domain/model";

export interface OwnerHomeSectionProps {
  totalCollected: number;
  collectionRate: number;
  studentsCount: number;
  classesCount: number;
  staffCount: number;
  pendingTransfersCount: number;
  onOpenClassPresets: () => void;
}

export function OwnerHomeSection({
  totalCollected,
  collectionRate,
  studentsCount,
  classesCount,
  staffCount,
  pendingTransfersCount,
  onOpenClassPresets,
}: OwnerHomeSectionProps) {
  return (
    <View style={styles.container}>
      {/* Executive Metrics Grid */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>TUITION SETTLEMENT</Text>
          <Text style={styles.metricValue}>{collectionRate}%</Text>
          <Text style={styles.metricHint}>
            {money(totalCollected)} collected
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>ENROLLED PUPILS</Text>
          <Text style={styles.metricValue}>{studentsCount}</Text>
          <Text style={styles.metricHint}>
            {classesCount} active classes
          </Text>
        </Card>
      </View>

      {/* Onboarding Checklist for Proprietor */}
      <CampusSetupCard
        classesCount={classesCount}
        studentsCount={studentsCount}
        staffCount={staffCount}
        onOpenClassPresets={onOpenClassPresets}
      />

      {/* Campus Management Directory */}
      <View style={styles.sectionGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Campus Operations</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/classes" as any)}
          >
            <Text style={styles.sectionActionText}>View Classes</Text>
          </Pressable>
        </View>

        <Card style={styles.listCard}>
          <ListItem
            title="Classrooms & Arms"
            subtitle={`${classesCount} registered academic arms`}
            icon="school"
            badge={`${classesCount} Classes`}
            badgeTone="neutral"
            onPress={() => router.push("/classes" as any)}
          />
          <ListItem
            title="Direct Bank Transfers"
            subtitle={`${pendingTransfersCount} pending verification`}
            icon="wallet"
            badge={pendingTransfersCount > 0 ? "Requires Review" : "All Settled"}
            badgeTone={pendingTransfersCount > 0 ? "warning" : "success"}
            onPress={() => router.push("/finance")}
          />
          <ListItem
            title="Faculty Attendance Calendar"
            subtitle="Campus shift roster & punctuality logs"
            icon="calendar"
            badge="Full Roster"
            badgeTone="brand"
            onPress={() => router.push("/attendance-calendar")}
          />
          <ListItem
            title="Faculty Directory"
            subtitle={`${staffCount} teaching & support staff`}
            icon="people"
            onPress={() => router.push("/directory")}
          />
        </Card>
      </View>
    </View>
  );
}

function CampusSetupCard({
  classesCount,
  studentsCount,
  staffCount,
  onOpenClassPresets,
}: {
  classesCount: number;
  studentsCount: number;
  staffCount: number;
  onOpenClassPresets: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const step1Done = classesCount > 0;
  const step2Done = studentsCount > 0;
  const step3Done = staffCount > 1;

  const completedCount =
    (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const progressPercent = Math.round((completedCount / 3) * 100);
  const allDone = completedCount === 3;

  if (collapsed && allDone) {
    return (
      <Pressable
        onPress={() => setCollapsed(false)}
        style={styles.setupCardCollapsed}
      >
        <Icon name="verify" size={16} color={colors.greenDark} filled />
        <Text style={styles.setupCardCollapsedText}>
          Campus Setup Complete (3/3 steps) · Tap to view
        </Text>
      </Pressable>
    );
  }

  return (
    <Card style={styles.setupCard}>
      <View style={styles.setupHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.setupTitle}>Next Steps: Campus Setup</Text>
            <Badge
              text={`${progressPercent}%`}
              tone={allDone ? "success" : "warning"}
            />
          </View>
          <Text style={styles.setupSubtitle}>
            {allDone
              ? "All essential campus onboarding milestones reached!"
              : `${completedCount} of 3 foundational steps completed`}
          </Text>
        </View>
        {allDone && (
          <Pressable onPress={() => setCollapsed(true)} style={styles.collapseBtn}>
            <Text style={styles.collapseBtnText}>Minimize</Text>
          </Pressable>
        )}
      </View>

      {/* Progress Track */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.max(progressPercent, 6)}%`,
              backgroundColor: allDone ? colors.green : colors.orange,
            },
          ]}
        />
      </View>

      {/* Step 1: Classes */}
      <View style={styles.stepRow}>
        <View style={[styles.stepIconBox, step1Done && styles.stepIconBoxDone]}>
          <Icon
            name={step1Done ? "check" : "school"}
            size={14}
            color={step1Done ? "#ffffff" : colors.navy}
            filled={step1Done}
          />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[styles.stepTitle, step1Done && styles.stepTitleDone]}>
            1. Setup Classrooms
          </Text>
          <Text style={styles.stepDesc}>
            {step1Done
              ? `${classesCount} classrooms registered`
              : "Use quick presets (Creche, Nursery, Primary 1–6)"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenClassPresets}
          style={[styles.stepBtn, step1Done && styles.stepBtnDone]}
        >
          <Text style={[styles.stepBtnText, step1Done && styles.stepBtnTextDone]}>
            {step1Done ? "Edit" : "Presets"}
          </Text>
        </Pressable>
      </View>

      {/* Step 2: Students */}
      <View style={styles.stepRow}>
        <View style={[styles.stepIconBox, step2Done && styles.stepIconBoxDone]}>
          <Icon
            name={step2Done ? "check" : "profile"}
            size={14}
            color={step2Done ? "#ffffff" : colors.navy}
            filled={step2Done}
          />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[styles.stepTitle, step2Done && styles.stepTitleDone]}>
            2. Enroll Students
          </Text>
          <Text style={styles.stepDesc}>
            {step2Done
              ? `${studentsCount} pupils enrolled`
              : "Add manually or upload via bulk CSV"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/add-pupil" as any)}
          style={[styles.stepBtn, step2Done && styles.stepBtnDone]}
        >
          <Text style={[styles.stepBtnText, step2Done && styles.stepBtnTextDone]}>
            {step2Done ? "Add More" : "Enroll"}
          </Text>
        </Pressable>
      </View>

      {/* Step 3: Staff */}
      <View style={styles.stepRow}>
        <View style={[styles.stepIconBox, step3Done && styles.stepIconBoxDone]}>
          <Icon
            name={step3Done ? "check" : "userAdd"}
            size={14}
            color={step3Done ? "#ffffff" : colors.navy}
            filled={step3Done}
          />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[styles.stepTitle, step3Done && styles.stepTitleDone]}>
            3. Invite Teachers & Staff
          </Text>
          <Text style={styles.stepDesc}>
            {step3Done
              ? `${staffCount} faculty members active`
              : "Invite staff via phone number or email"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/invite-staff" as any)}
          style={[styles.stepBtn, step3Done && styles.stepBtnDone]}
        >
          <Text style={[styles.stepBtnText, step3Done && styles.stepBtnTextDone]}>
            {step3Done ? "Invite More" : "Invite"}
          </Text>
        </Pressable>
      </View>
    </Card>
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
    fontSize: 22,
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
  setupCard: {
    padding: spacing.md,
    gap: spacing.sm + 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  setupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  setupTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  setupSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  collapseBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  collapseBtnText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  setupCardCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setupCardCollapsedText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.greenDark,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slate100,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  stepIconBox: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconBoxDone: {
    backgroundColor: colors.green,
  },
  stepTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  stepTitleDone: {
    color: colors.slate700,
  },
  stepDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  stepBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.xs,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnDone: {
    backgroundColor: colors.surface,
  },
  stepBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  stepBtnTextDone: {
    color: colors.muted,
  },
});
