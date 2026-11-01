import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Screen,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon, IconName } from "../components/Icon";
import { useApp } from "../providers/AppProvider";
import { Role } from "../domain/model";
import { Onboarding } from "./Onboarding";
import { LoginScreen } from "./LoginScreen";
import { CreateSchoolScreen } from "./CreateSchoolScreen";

export const roleLabels: Record<Role, string> = {
  owner: "School Proprietor",
  admin: "Administrator",
  teacher: "Class Teacher",
  parent: "Parent / Guardian",
  finance: "Finance Manager",
  hr: "HR Director",
  staff: "School Staff",
};

export const roleDescriptions: Record<Role, string> = {
  owner: "Full campus governance, staff invitations & operating rules",
  admin: "Student records, class setup & school operations",
  teacher: "Assigned class, facial clock-in & student lessons",
  parent: "Children tuition, verified payments & receipts",
  finance: "Reconciliations, bank settlements & fee tracking",
  hr: "Team records, staff attendance & payroll administration",
  staff: "Daily clock-in, assigned tasks & personal profile",
};

export const roleIcons: Record<Role, IconName> = {
  owner: "building",
  admin: "settings",
  teacher: "school",
  parent: "people",
  finance: "wallet",
  hr: "verify",
  staff: "profile",
};

export function Entry() {
  const app = useApp();

  // Root authentication views: "carousel" -> "login" -> "create"
  const [authView, setAuthView] = useState<"carousel" | "login" | "create">("carousel");

  if (!app.ready) {
    return (
      <Screen title="schoolday">
        <Card>
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>
            {app.error || "Opening secure local database…"}
          </Text>
          {app.error && (
            <View style={{ gap: 10, marginTop: 10 }}>
              <Button title="Retry Connection" onPress={() => void app.initialize()} />
              <Button
                title="Reset Local Database"
                variant="outline"
                onPress={() => void app.act(app.reset, "")}
              />
            </View>
          )}
        </Card>
      </Screen>
    );
  }

  // View 1: Onboarding Carousel (Shown first and after every logout)
  if (authView === "carousel") {
    return (
      <Onboarding
        onSelectAction={(action) => {
          setAuthView(action);
        }}
      />
    );
  }

  // View 2: Separate, Minimal Email + OTP Login (Staff, Proprietors, Parents)
  if (authView === "login") {
    return (
      <LoginScreen
        onBack={() => setAuthView("carousel")}
        onGoToCreate={() => setAuthView("create")}
      />
    );
  }

  // View 3: Separate, Step-Based School Setup for Proprietors
  return (
    <CreateSchoolScreen
      onBack={() => setAuthView("carousel")}
      onGoToLogin={() => setAuthView("login")}
    />
  );
}

// Clean Account Management Screen for /account
export function AccountSetup() {
  const app = useApp();
  const catalog = app.services.catalog();
  const activeSchool =
    catalog.schools.find((s) => s.id === app.context?.schoolId) ||
    catalog.schools[0]!;

  return (
    <Screen
      title="Campus Workspace"
      subtitle="Manage your institution affiliation and active credentials."
      back={() => router.back()}
    >
      <View style={{ gap: 16 }}>
        {/* Active Campus Card */}
        <Card style={styles.currentSchoolCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={styles.schoolIconTile}>
              <Icon name="school" size={22} color={colors.navy} filled />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.currentSchoolTitle}>{activeSchool.name}</Text>
              <Text style={styles.currentSchoolSub}>{activeSchool.address}</Text>
              {activeSchool.motto && (
                <Text style={styles.currentSchoolMotto}>"{activeSchool.motto}"</Text>
              )}
            </View>
            <Badge text="ACTIVE" tone="success" dot />
          </View>
        </Card>

        {/* Current User Credentials */}
        <Card style={styles.authCard}>
          <Text style={styles.sectionHeaderLabel}>SESSION CREDENTIALS</Text>
          <View style={{ gap: 10 }}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>User ID</Text>
              <Text style={styles.summaryVal}>{app.context?.userId || "N/A"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Campus Role</Text>
              <Text style={styles.summaryVal}>
                {app.context?.role
                  ? roleLabels[app.context.role as Role] || app.context.role
                  : "Member"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Persistence</Text>
              <Text style={[styles.summaryVal, { color: colors.greenDark }]}>
                Offline First (Active)
              </Text>
            </View>
          </View>

          {app.context?.role === "owner" && (
            <Button
              title="Invite New Staff Member"
              icon="teacher"
              variant="primary"
              size="lg"
              onPress={() => router.push("/invite-staff")}
              style={{ marginTop: 8 }}
            />
          )}

          <Button
            title="Sign Out of Campus"
            icon="logout"
            variant="danger"
            size="lg"
            onPress={() =>
              void app.act(async () => {
                await app.update({ context: null, onboarded: false });
                router.replace("/");
              }, "Signed out safely.")
            }
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  currentSchoolCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    ...shadows.sm,
  },
  schoolIconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  currentSchoolTitle: {
    fontFamily: fonts.extra,
    fontSize: 16,
    color: colors.navy,
  },
  currentSchoolSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#64748B",
  },
  currentSchoolMotto: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.orange,
    fontStyle: "italic",
    marginTop: 2,
  },
  authCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 16,
    ...shadows.sm,
  },
  sectionHeaderLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: "#64748B",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryKey: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "#64748B",
  },
  summaryVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
});
