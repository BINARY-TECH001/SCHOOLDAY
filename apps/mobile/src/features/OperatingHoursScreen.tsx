import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import {
  Badge,
  Button,
  Card,
  Field,
  ModalSheet,
  Txt,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";

export interface GradeSchedule {
  id: string;
  name: string;
  badge: string;
  tone: "purple" | "success" | "warning" | "neutral";
  arrivalWindow: string;
  assemblyTime: string;
  dismissalTime: string;
  extraCurricular: string;
  lateCutoff: string;
  active: boolean;
}

export function OperatingHoursScreen() {
  const { school, context, act, busy } = useSchool();
  const isOwner = context.role === "owner" || context.role === "admin";

  // Section schedules
  const [schedules, setSchedules] = useState<GradeSchedule[]>([
    {
      id: "sec-ey",
      name: "Early Years & Kindergarten",
      badge: "NURSERY & KG",
      tone: "warning",
      arrivalWindow: "08:00 AM – 08:30 AM",
      assemblyTime: "08:30 AM (Indoor Circle)",
      dismissalTime: "01:00 PM",
      extraCurricular: "Aftercare & Nap until 04:00 PM",
      lateCutoff: "08:45 AM",
      active: true,
    },
    {
      id: "sec-pri",
      name: "Primary School (Grades 1 – 5)",
      badge: "BASIC 1 - 5",
      tone: "success",
      arrivalWindow: "07:15 AM – 07:45 AM",
      assemblyTime: "07:45 AM – 08:00 AM",
      dismissalTime: "02:30 PM",
      extraCurricular: "Friday Clubs until 03:45 PM",
      lateCutoff: "08:00 AM",
      active: true,
    },
    {
      id: "sec-jss",
      name: "Junior Secondary (JSS 1 – 3)",
      badge: "JUNIOR WING",
      tone: "purple",
      arrivalWindow: "07:00 AM – 07:30 AM",
      assemblyTime: "07:30 AM – 07:45 AM",
      dismissalTime: "03:30 PM",
      extraCurricular: "STEM Practicals until 04:30 PM",
      lateCutoff: "07:45 AM",
      active: true,
    },
    {
      id: "sec-sss",
      name: "Senior Secondary (SSS 1 – 3)",
      badge: "SENIOR COLLEGE",
      tone: "neutral",
      arrivalWindow: "07:00 AM – 07:20 AM",
      assemblyTime: "07:20 AM – 07:35 AM",
      dismissalTime: "04:00 PM",
      extraCurricular: "WAEC Clinic & Prep until 05:15 PM",
      lateCutoff: "07:35 AM",
      active: true,
    },
  ]);

  // Global Campus Attendance Policies
  const [strictWindowEnforced, setStrictWindowEnforced] = useState(true);
  const [autoParentLateAlert, setAutoParentLateAlert] = useState(true);
  const [staffClockInWindow, setStaffClockInWindow] = useState("06:45 AM – 07:45 AM");
  const [staffClockOutWindow, setStaffClockOutWindow] = useState("04:00 PM – 06:00 PM");
  const [gracePeriodMins, setGracePeriodMins] = useState("15");

  // Edit Modal State
  const [editingSchedule, setEditingSchedule] = useState<GradeSchedule | null>(null);
  const [editArrival, setEditArrival] = useState("");
  const [editAssembly, setEditAssembly] = useState("");
  const [editDismissal, setEditDismissal] = useState("");
  const [editLateCutoff, setEditLateCutoff] = useState("");

  const handleOpenEdit = (s: GradeSchedule) => {
    setEditingSchedule(s);
    setEditArrival(s.arrivalWindow);
    setEditAssembly(s.assemblyTime);
    setEditDismissal(s.dismissalTime);
    setEditLateCutoff(s.lateCutoff);
  };

  const handleSaveScheduleEdit = () => {
    if (!editingSchedule) return;
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === editingSchedule.id
          ? {
              ...s,
              arrivalWindow: editArrival,
              assemblyTime: editAssembly,
              dismissalTime: editDismissal,
              lateCutoff: editLateCutoff,
            }
          : s,
      ),
    );
    toast.success(`${editingSchedule.name} hours updated successfully!`);
    setEditingSchedule(null);
  };

  return (
    <View style={styles.root}>
      <TopBar
        title="Campus Operating Hours"
        subtitle={`${school.name} · Dynamic Grade Schedules`}
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={() => router.push("/scan-utility" as any)}
            style={styles.utilityTopBtn}
          >
            <Icon name="scan" size={14} color="#ffffff" />
            <Text style={styles.utilityTopBtnText}>Clock-In Hub</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Campus Overview Status Card */}
        <Card variant="dark" style={[styles.heroCard, shadows.md]}>
          <View style={styles.heroHeader}>
            <View style={{ gap: 2 }}>
              <Text style={styles.heroPre}>INSTITUTIONAL GATE PROTOCOL</Text>
              <Text style={styles.heroTitle}>Main Campus Operational</Text>
            </View>
            <Badge text="07:00 AM – 05:30 PM" tone="dark" />
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Icon name="location" size={15} color="#38bdf8" />
              <Text style={styles.heroMetaText}>Main Gate & Campus Geofence Active</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Icon name="clock" size={15} color="#4ade80" />
              <Text style={styles.heroMetaText}>Grace Period: {gracePeriodMins} Minutes</Text>
            </View>
          </View>
        </Card>

        {/* Dynamic Grade-Level Schedules */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.sectionTitle}>Section & Grade Timings</Text>
            <Text style={styles.sectionSub}>Dynamic per grade level</Text>
          </View>

          {schedules.map((sec) => (
            <Card key={sec.id} style={[styles.scheduleCard, shadows.sm]}>
              <View style={styles.scheduleHeader}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={styles.scheduleName}>{sec.name}</Text>
                  <Badge text={sec.badge} tone={sec.tone} />
                </View>

                {isOwner && (
                  <Pressable
                    onPress={() => handleOpenEdit(sec)}
                    style={styles.editBtn}
                    hitSlop={8}
                  >
                    <Icon name="edit" size={13} color={colors.navy} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.timingGrid}>
                <View style={styles.timingRow}>
                  <Text style={styles.timingKey}>Arrival Window</Text>
                  <Text style={styles.timingVal}>{sec.arrivalWindow}</Text>
                </View>

                <View style={styles.timingRow}>
                  <Text style={styles.timingKey}>Morning Assembly</Text>
                  <Text style={styles.timingVal}>{sec.assemblyTime}</Text>
                </View>

                <View style={styles.timingRow}>
                  <Text style={styles.timingKey}>Gate Lock / Late Cut-Off</Text>
                  <Text style={[styles.timingVal, { color: colors.orange }]}>
                    {sec.lateCutoff}
                  </Text>
                </View>

                <View style={styles.timingRow}>
                  <Text style={styles.timingKey}>Standard Dismissal</Text>
                  <Text style={[styles.timingVal, { fontFamily: fonts.bold, color: colors.greenDark }]}>
                    {sec.dismissalTime}
                  </Text>
                </View>

                <View style={styles.timingRow}>
                  <Text style={styles.timingKey}>Extended Care / Clubs</Text>
                  <Text style={styles.timingVal}>{sec.extraCurricular}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Faculty & Staff Clock-In Rules */}
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Faculty Attendance Protocol</Text>

          <Card style={{ padding: 16, gap: 14 }}>
            <View style={styles.ruleRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.ruleTitle}>Staff Morning Clock-In Window</Text>
                <Text style={styles.ruleSub}>{staffClockInWindow} · Biometric / QR Pass</Text>
              </View>
              <Badge text="MANDATORY" tone="warning" />
            </View>

            <View style={styles.ruleRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.ruleTitle}>Staff Afternoon Clock-Out Window</Text>
                <Text style={styles.ruleSub}>{staffClockOutWindow} · Day Closure</Text>
              </View>
              <Badge text="MANDATORY" tone="purple" />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.switchTitle}>Enforce Strict Time Window</Text>
                <Text style={styles.switchSub}>
                  Block faculty clock-in attempts outside authorized morning window
                </Text>
              </View>
              <Switch
                value={strictWindowEnforced}
                onValueChange={setStrictWindowEnforced}
                trackColor={{ false: "#e2e8f0", true: colors.orange }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.switchTitle}>Parent Late Arrival SMS Alerts</Text>
                <Text style={styles.switchSub}>
                  Dispatch notification if student clocks in after grade cut-off
                </Text>
              </View>
              <Switch
                value={autoParentLateAlert}
                onValueChange={setAutoParentLateAlert}
                trackColor={{ false: "#e2e8f0", true: colors.indigo }}
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Edit Schedule Modal */}
      {editingSchedule && (
        <ModalSheet
          visible={Boolean(editingSchedule)}
          onClose={() => setEditingSchedule(null)}
          title={`Edit Hours · ${editingSchedule.name}`}
          subtitle="Adjust daily operational timings for this section."
        >
          <Field
            label="Arrival Window"
            placeholder="e.g. 07:15 AM – 07:45 AM"
            value={editArrival}
            onChangeText={setEditArrival}
            icon="clock"
          />

          <Field
            label="Assembly Time"
            placeholder="e.g. 07:45 AM – 08:00 AM"
            value={editAssembly}
            onChangeText={setEditAssembly}
          />

          <Field
            label="Gate Lock / Late Cutoff"
            placeholder="e.g. 08:00 AM"
            value={editLateCutoff}
            onChangeText={setEditLateCutoff}
          />

          <Field
            label="Dismissal Time"
            placeholder="e.g. 02:30 PM"
            value={editDismissal}
            onChangeText={setEditDismissal}
          />

          <Button
            title="Save Section Operating Hours"
            variant="primary"
            size="lg"
            icon="check"
            onPress={handleSaveScheduleEdit}
          />
        </ModalSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  utilityTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  utilityTopBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroPre: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: "#94a3b8",
  },
  heroTitle: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: "#ffffff",
  },
  heroMetaRow: {
    gap: 8,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 10,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroMetaText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#e2e8f0",
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  sectionSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  scheduleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  scheduleName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  editBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  timingGrid: {
    gap: 8,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
  },
  timingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timingKey: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  timingVal: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  ruleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  ruleTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  ruleSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  switchTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  switchSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
