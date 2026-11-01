import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { TopBar } from "../../../components/TopBar";
import { useSchool } from "../../../providers/AppProvider";
import { Role, Staff, Student } from "../../../domain/model";
import { DigitalIdSheet } from "../../../components/DigitalIdSheet";
import { AvatarCoverPickerSheet } from "../../../components/AvatarCoverPickerSheet";
import { roleLabels } from "../../Entry";

// Visibility & Sections
import {
  getStaffVisibility,
  getStudentVisibility,
  ViewerContext,
} from "../utils/visibilityRules";
import { TeacherProfileSection } from "../sections/TeacherProfileSection";
import { ParentProfileSection } from "../sections/ParentProfileSection";
import { StudentProfileSection } from "../sections/StudentProfileSection";
import { OwnerProfileSection } from "../sections/OwnerProfileSection";
import { StaffProfileSection } from "../sections/StaffProfileSection";

export interface RoleProfileShellProps {
  targetUserId?: string;
  targetId?: string; // Can be a student.id or staff.id
  targetType?: "student" | "staff" | "parent" | "user";
}

export function RoleProfileShell({
  targetUserId,
  targetId,
  targetType,
}: RoleProfileShellProps) {
  const { data, context, school, services, act } = useSchool();

  const [digitalIdOpen, setDigitalIdOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const viewerContext: ViewerContext = {
    userId: context.userId,
    role: context.role,
    schoolId: context.schoolId,
  };

  // Determine if this is the viewer's own profile
  const effectiveUserId = targetUserId || (targetId ? undefined : context.userId);
  const isSelf = !targetId && (!targetUserId || targetUserId === context.userId);

  // 1. Check if this is a Student record
  const isStudentLookup =
    targetType === "student" ||
    (targetId && data.students.some((s) => s.id === targetId));

  if (isStudentLookup) {
    const student = data.students.find((s) => s.id === targetId);

    // ZERO MOCK FALLBACK: Explicit not-found state
    if (!student) {
      return (
        <View style={styles.container}>
          <TopBar title="Student Profile" subtitle="Directory Lookup" />
          <View style={styles.stateContainer}>
            <EmptyState
              title="Student Record Not Found"
              subtitle={`No enrolled student matching identifier "${targetId || "unknown"}" was found in ${school.name}.`}
              actionLabel="Return to Previous Screen"
              onAction={() => (router.canGoBack() ? router.back() : router.replace("/home" as any))}
              icon="people"
            />
          </View>
        </View>
      );
    }

    const visibility = getStudentVisibility(viewerContext, student);

    // Minor privacy protection
    if (!visibility.canViewRecord) {
      return (
        <View style={styles.container}>
          <TopBar title="Student Profile" subtitle="Access Restricted" />
          <View style={styles.stateContainer}>
            <ErrorState
              title="Restricted Minor Record"
              message="You do not have administrative or guardian authorization to view this student's profile."
              retryLabel="Return to Previous Screen"
              onRetry={() => (router.canGoBack() ? router.back() : router.replace("/home" as any))}
            />
          </View>
        </View>
      );
    }

    const guardianMember = data.memberships.find((m) => m.userId === student.guardianId);

    return (
      <View style={styles.container}>
        <TopBar
          title={student.name}
          subtitle={`${student.className} · Student Profile`}
          rightAction={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Digital ID Pass"
              style={styles.headerActionBtn}
              onPress={() => setDigitalIdOpen(true)}
            >
              <Icon name="verify" size={18} color={colors.navy} />
            </Pressable>
          }
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Student Hero Header */}
          <Card style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Avatar
                uri={student.avatar}
                name={student.name}
                size={76}
                role="parent" // neutral pupil frame
              />
              <View style={styles.heroInfoCol}>
                <Text style={styles.heroNameText} numberOfLines={1}>
                  {student.name}
                </Text>
                <Text style={styles.heroSchoolLabel} numberOfLines={1}>
                  {school.name}
                </Text>

                <View style={styles.badgesRow}>
                  <Badge text="STUDENT" tone="neutral" size="sm" />
                  <Badge text={student.className} tone="purple" size="sm" />
                  <Badge text="ENROLLED" tone="success" size="sm" dot />
                </View>
              </View>
            </View>

            <View style={styles.identifierBox}>
              <Text style={styles.identifierLabel}>Matriculation Number:</Text>
              <Text style={styles.identifierValue}>{student.id}</Text>
            </View>
          </Card>

          {/* Quick Action Bar for Student */}
          <View style={styles.quickActionsRow}>
            {visibility.canViewPrivateContact && student.guardianPhone ? (
              <Pressable
                style={styles.quickActionBtn}
                onPress={() => Linking.openURL(`tel:${student.guardianPhone}`)}
              >
                <Icon name="call" size={16} color={colors.navy} />
                <Text style={styles.quickActionBtnText}>Call Guardian</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.quickActionBtn}
              onPress={() => setDigitalIdOpen(true)}
            >
              <Icon name="verify" size={16} color={colors.navy} />
              <Text style={styles.quickActionBtnText}>Digital Student ID</Text>
            </Pressable>
          </View>

          {/* Biometric Gate Status */}
          <Card style={styles.biometricCard}>
            <View style={styles.biometricIconCircle}>
              <Icon name="scan" size={18} color={colors.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.biometricTitle}>Gate Access & QR Pass</Text>
              <Text style={styles.biometricSub}>
                Authorized for campus turnstiles and school transport pickup
              </Text>
            </View>
            <Badge tone="success" text="ACTIVE PASS" size="sm" />
          </Card>

          {/* Role Details */}
          <StudentProfileSection
            student={student}
            guardianName={guardianMember?.name}
            canViewPrivateContact={visibility.canViewPrivateContact}
            canViewFinancials={visibility.canViewFinancials}
          />
        </ScrollView>

        <DigitalIdSheet
          visible={digitalIdOpen}
          targetStudent={student}
          onClose={() => setDigitalIdOpen(false)}
        />
      </View>
    );
  }

  // 2. Staff, Parent, or User Lookup
  const targetIdStr = targetUserId || targetId || context.userId;

  // Resolve staff
  const staff = data.staff.find((s) => s.userId === targetIdStr || s.id === targetIdStr);

  // Resolve membership
  const membership =
    data.memberships.find((m) => m.userId === targetIdStr || m.userId === staff?.userId) ||
    (isSelf ? data.memberships.find((m) => m.userId === context.userId) : undefined);

  // ZERO MOCK FALLBACK: If querying an external user who doesn't exist, fail gracefully
  if (!isSelf && !staff && !membership) {
    return (
      <View style={styles.container}>
        <TopBar title="User Profile" subtitle="Directory Lookup" />
        <View style={styles.stateContainer}>
          <EmptyState
            title="Profile Record Not Found"
            subtitle={`No staff, faculty, or registered campus member matching identifier "${targetIdStr}" was found in ${school.name}.`}
            actionLabel="Return to Previous Screen"
            onAction={() => (router.canGoBack() ? router.back() : router.replace("/home" as any))}
            icon="profile"
          />
        </View>
      </View>
    );
  }

  // Determine profile role
  const profileRole: Role =
    staff?.role ? (staff.role as Role) : isSelf ? context.role : "staff";

  // Check Staff Visibility if staff
  const staffVisibility = staff
    ? getStaffVisibility(viewerContext, staff)
    : {
        canViewRecord: true,
        canViewCompensation: isSelf,
        canViewPrivatePhone: isSelf || viewerContext.role === "owner" || viewerContext.role === "admin",
        canManagePermissions: viewerContext.role === "owner" || viewerContext.role === "admin",
      };

  if (!staffVisibility.canViewRecord) {
    return (
      <View style={styles.container}>
        <TopBar title="Staff Profile" subtitle="Access Restricted" />
        <View style={styles.stateContainer}>
          <ErrorState
            title="Access Restricted"
            message="You do not have administrative authorization to inspect this staff member's profile record."
            retryLabel="Return to Previous Screen"
            onRetry={() => (router.canGoBack() ? router.back() : router.replace("/home" as any))}
          />
        </View>
      </View>
    );
  }

  const profileName = staff?.name || membership?.name || (isSelf ? "My Campus Account" : "Staff Member");
  const avatarUri = staff?.avatar || membership?.avatar;
  const identifier =
    staff?.id || (profileRole === "parent" ? `GUA-${targetIdStr.slice(-4)}` : `USR-${targetIdStr.slice(-4)}`);

  // Assigned classes
  const teacherClass = data.classes.find(
    (c) => c.teacherUserId === targetIdStr || (staff && c.teacherUserId === staff.userId)
  );
  const parentChildren = data.students.filter(
    (s) => s.guardianId === targetIdStr || (membership && s.guardianId === membership.userId)
  );

  const handleUpdateAvatar = async (url: string) => {
    await act(
      () => services.updateProfile(context, { avatar: url }),
      "Profile avatar updated successfully!"
    );
  };

  return (
    <View style={styles.container}>
      <TopBar
        title={isSelf ? "My Profile" : profileName}
        subtitle={isSelf ? "Personal Academic & Staff Identity" : `${roleLabels[profileRole] || profileRole} · Campus Profile`}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Digital School Identity Card"
            style={styles.headerActionBtn}
            onPress={() => setDigitalIdOpen(true)}
          >
            <Icon name="verify" size={18} color={colors.navy} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Header */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarContainer}>
              <Avatar
                uri={avatarUri}
                name={profileName}
                size={76}
                role={profileRole}
              />
              {isSelf ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change profile avatar"
                  onPress={() => setAvatarPickerOpen(true)}
                  style={styles.avatarEditBadge}
                >
                  <Icon name="camera" size={13} color="#ffffff" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.heroInfoCol}>
              <Text style={styles.heroNameText} numberOfLines={1}>
                {profileName}
              </Text>
              <Text style={styles.heroSchoolLabel} numberOfLines={1}>
                {school.name}
              </Text>

              <View style={styles.badgesRow}>
                <Badge
                  text={roleLabels[profileRole] || profileRole}
                  tone={profileRole === "owner" || profileRole === "admin" ? "purple" : "neutral"}
                  size="sm"
                />
                {staff?.title || staff?.rank ? (
                  <Badge text={staff.title || staff.rank || ""} tone="neutral" size="sm" />
                ) : null}
                <Badge text="VERIFIED" tone="success" size="sm" dot />
              </View>
            </View>
          </View>

          <View style={styles.identifierBox}>
            <Text style={styles.identifierLabel}>Permanent Identifier:</Text>
            <Text style={styles.identifierValue}>{identifier}</Text>
          </View>
        </Card>

        {/* Digital ID Pass Banner */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Digital School Identity Card"
          onPress={() => setDigitalIdOpen(true)}
          style={[styles.digitalIdCard, shadows.sm]}
        >
          <View style={styles.digitalIdLeft}>
            <View style={styles.digitalIdIconBox}>
              <Icon name="verify" size={22} color={colors.orange} />
            </View>
            <View style={styles.digitalIdTextGroup}>
              <Text style={styles.digitalIdTitle}>Digital School Identity Card</Text>
              <Text style={styles.digitalIdSubtitle}>
                Tap to display official gate pass & QR attendance code
              </Text>
            </View>
          </View>
          <Icon name="chevron" size={16} color={colors.orange} />
        </Pressable>

        {/* Quick Contact Bar for Others */}
        {!isSelf && (
          <View style={styles.quickActionsRow}>
            {staffVisibility.canViewPrivatePhone && staff?.phone ? (
              <Pressable
                style={styles.quickActionBtn}
                onPress={() => Linking.openURL(`tel:${staff.phone}`)}
              >
                <Icon name="call" size={16} color={colors.navy} />
                <Text style={styles.quickActionBtnText}>Call</Text>
              </Pressable>
            ) : null}

            {staff?.email ? (
              <Pressable
                style={styles.quickActionBtn}
                onPress={() => Linking.openURL(`mailto:${staff.email}`)}
              >
                <Icon name="sms" size={16} color={colors.navy} />
                <Text style={styles.quickActionBtnText}>Email</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.quickActionBtn}
              onPress={() =>
                router.push({
                  pathname: "/chat-detail",
                  params: { recipientId: targetIdStr, recipientName: profileName },
                })
              }
            >
              <Icon name="message" size={16} color={colors.navy} />
              <Text style={styles.quickActionBtnText}>Message</Text>
            </Pressable>
          </View>
        )}

        {/* Role Modular Section */}
        {profileRole === "teacher" ? (
          <TeacherProfileSection
            staffId={identifier}
            department="Senior Academic Faculty"
            assignedClass={teacherClass?.name}
            subjects={["English Language", "Literature in English"]}
            rank={staff?.rank}
            phone={staff?.phone}
            email={staff?.email}
            canViewPrivatePhone={staffVisibility.canViewPrivatePhone}
          />
        ) : profileRole === "parent" ? (
          <ParentProfileSection
            guardianId={identifier}
            phone={isSelf ? "+234 802 987 6543" : undefined}
            email={membership?.userId === context.userId ? "guardian@schoolday.ng" : undefined}
            childrenList={parentChildren}
            canViewPrivateContact={isSelf || viewerContext.role === "owner" || viewerContext.role === "admin"}
          />
        ) : profileRole === "owner" || profileRole === "admin" ? (
          <OwnerProfileSection
            memberId={identifier}
            governanceTitle={staff?.title || "School Proprietor & Chief Executive"}
            phone={staff?.phone}
            email={staff?.email || "proprietor@schoolday.ng"}
            schoolName={school.name}
            canViewPrivatePhone={staffVisibility.canViewPrivatePhone}
          />
        ) : (
          <StaffProfileSection
            staffId={identifier}
            department="Campus Operations"
            dutyRole={staff?.title || "Operations Officer"}
            shiftHours="07:30 AM – 04:30 PM"
            phone={staff?.phone}
            email={staff?.email}
            canViewPrivatePhone={staffVisibility.canViewPrivatePhone}
          />
        )}

        {/* Self Account Preferences & Security Section */}
        {isSelf && (
          <View style={styles.actionsGroup}>
            <Text style={styles.actionsLabel}>ACCOUNT PREFERENCES & SECURITY</Text>
            <Card style={styles.actionsCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/account")}
                style={styles.actionRow}
              >
                <View style={styles.actionIconBox}>
                  <Icon name="profile" size={16} color={colors.navy} />
                </View>
                <View style={styles.actionTextGroup}>
                  <Text style={styles.actionTitle}>Switch Campus or Role</Text>
                  <Text style={styles.actionSubtitle}>
                    Change active multi-school workspace
                  </Text>
                </View>
                <Icon name="chevron" size={14} color={colors.muted} />
              </Pressable>

              <View style={styles.actionDivider} />

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/more")}
                style={styles.actionRow}
              >
                <View style={styles.actionIconBox}>
                  <Icon name="settings" size={16} color={colors.navy} />
                </View>
                <View style={styles.actionTextGroup}>
                  <Text style={styles.actionTitle}>Settings & Preferences</Text>
                  <Text style={styles.actionSubtitle}>
                    Notifications, security, and app configuration
                  </Text>
                </View>
                <Icon name="chevron" size={14} color={colors.muted} />
              </Pressable>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Digital ID Sheet */}
      <DigitalIdSheet
        visible={digitalIdOpen}
        onClose={() => setDigitalIdOpen(false)}
      />

      {/* Avatar Picker Sheet */}
      <AvatarCoverPickerSheet
        visible={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        initialTab="avatar"
        onSelectAvatar={handleUpdateAvatar}
        onSelectCover={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stateContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 48,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  heroInfoCol: {
    flex: 1,
    gap: 3,
  },
  heroNameText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  heroSchoolLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  identifierBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identifierLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  identifierValue: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  digitalIdCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  digitalIdLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  digitalIdIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  digitalIdTextGroup: {
    flex: 1,
    gap: 2,
  },
  digitalIdTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  digitalIdSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    ...shadows.sm,
  },
  quickActionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  biometricCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  biometricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  biometricTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  biometricSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  actionsGroup: {
    gap: 6,
    marginTop: 4,
  },
  actionsLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.muted,
    textTransform: "uppercase",
    marginLeft: 2,
  },
  actionsCard: {
    padding: 0,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextGroup: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  actionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
