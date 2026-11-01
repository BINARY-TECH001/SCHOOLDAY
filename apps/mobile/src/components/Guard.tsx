import React, { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { can, Role } from "../domain/model";
import { useApp } from "../providers/AppProvider";
import { Button, Card, colors, fonts, shadows, Badge } from "./ui";
import { Icon } from "./Icon";
import { HomeSkeleton } from "./HomeSkeleton";
import { roleLabels } from "../features/Entry";

export function Guard({
  children,
  permissions = [],
}: {
  children: ReactNode;
  permissions?: string[];
}) {
  const app = useApp();
  const insets = useSafeAreaInsets();

  if (!app.ready) {
    return <HomeSkeleton />;
  }

  if (!app.context) {
    return <Redirect href="/" />;
  }

  // 1. Proprietor ("owner") and Campus Administrator ("admin") always have full master access
  if (app.context.role === "owner" || app.context.role === "admin") {
    return <>{children}</>;
  }

  // 2. Check if user's staff profile has custom permissions assigned by the proprietor
  let staffCustomPermissions: string[] = [];
  try {
    const schoolDb = app.services.snapshot(app.context);
    const member = schoolDb.staff.find(
      (s) => s.userId === app.context!.userId && s.schoolId === app.context!.schoolId,
    );
    if (member?.permissions) {
      staffCustomPermissions = member.permissions;
    }
  } catch {
    // Local fallback
  }

  // 3. Check access
  const hasAccess =
    permissions.length === 0 ||
    permissions.some(
      (p) =>
        can(app.context!.role, p) ||
        staffCustomPermissions.includes(p),
    );

  if (!hasAccess) {
    const currentRoleLabel = roleLabels[app.context.role] || app.context.role;

    return (
      <View
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <View style={styles.contentWrap}>
          {/* Elevation Card */}
          <Card style={[styles.noAccessCard, shadows.md]}>
            {/* Top Amber Shield */}
            <View style={styles.iconCircle}>
              <Icon name="shield" size={32} color={colors.orange} filled />
            </View>

            <Badge
              text="CAMPUS SECURITY · ACCESS RESTRICTED"
              tone="warning"
            />

            <View style={{ gap: 6, alignItems: "center" }}>
              <Text style={styles.title}>Access Permission Required</Text>
              <Text style={styles.description}>
                This campus tool is reserved for authorized staff roles and is not currently enabled for your profile.
              </Text>
            </View>

            {/* Profile Info Card */}
            <View style={styles.profileBox}>
              <View style={styles.profileRow}>
                <Text style={styles.profileKey}>Your Current Role</Text>
                <Badge text={currentRoleLabel} tone="purple" />
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileKey}>School Workspace</Text>
                <Text style={styles.profileVal} numberOfLines={1}>
                  {app.context.schoolId}
                </Text>
              </View>
            </View>

            <Text style={styles.instructionNote}>
              💡 If your appointment requires access to this tool, contact your <Text style={{ fontFamily: fonts.bold, color: colors.navy }}>School Proprietor</Text> or <Text style={{ fontFamily: fonts.bold, color: colors.navy }}>Bursar</Text> to grant custom permissions to your staff account.
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonStack}>
              <Button
                title="Return to Campus Home"
                variant="primary"
                size="lg"
                icon="home"
                onPress={() => router.replace("/home")}
                style={{ width: "100%" }}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch active account"
                onPress={() => router.replace("/account")}
                style={({ pressed }) => [
                  styles.switchAccountBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.switchAccountText}>
                  Switch Account or Role
                </Text>
                <Icon name="chevron" size={14} color={colors.muted} />
              </Pressable>
            </View>
          </Card>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  noAccessCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  profileBox: {
    width: "100%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileKey: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  profileVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  instructionNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  buttonStack: {
    width: "100%",
    gap: 10,
    alignItems: "center",
    marginTop: 4,
  },
  switchAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchAccountText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
  },
});
