import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing } from "../theme/tokens";
import { TopBar } from "../components/TopBar";
import { Card, Empty, ScreenContainer } from "../components/ui";
import { Icon } from "../components/Icon";
import { DigitalIdSheet } from "../components/DigitalIdSheet";
import { useSchool } from "../providers/AppProvider";
import { Role } from "../domain/model";

// Staff Feature Sub-Components
import { StaffProfileTab } from "./staff/types";
import { computeStaffStatus } from "./staff/utils/staffStatus";
import { useStaffTasks } from "./staff/taskStore";
import { StaffIdentityCard } from "./staff/components/StaffIdentityCard";
import { StaffAttendanceSection } from "./staff/components/StaffAttendanceSection";
import { StaffTasksSection } from "./staff/components/StaffTasksSection";
import { StaffLeaveSection } from "./staff/components/StaffLeaveSection";
import { StaffPayrollSection } from "./staff/components/StaffPayrollSection";
import { StaffActivityTimeline } from "./staff/components/StaffActivityTimeline";
import { AssignTaskSheet } from "./staff/components/AssignTaskSheet";
import { ManageClassesSheet } from "./staff/components/ManageClassesSheet";
import { ManageRolePermissionsSheet } from "./staff/components/ManageRolePermissionsSheet";
import { UpdateSalarySheet } from "./staff/components/UpdateSalarySheet";

export function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, context, services, act, school, offline } = useSchool();

  // Find target staff member by id or userId strictly
  const staff = useMemo(() => {
    return id ? data.staff.find((s) => s.id === id || s.userId === id) : undefined;
  }, [id, data.staff]);

  const [activeTab, setActiveTab] = useState<StaffProfileTab>("overview");
  const [digitalIdOpen, setDigitalIdOpen] = useState(false);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [manageClassesOpen, setManageClassesOpen] = useState(false);
  const [manageRoleOpen, setManageRoleOpen] = useState(false);
  const [updateSalaryOpen, setUpdateSalaryOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isOwnerOrAdmin =
    context.role === "owner" || context.role === "admin" || context.role === "hr";

  // Task store
  const { tasks, addTask, updateTaskStatus } = useStaffTasks(
    school.id,
    staff?.id
  );

  // Today string
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter records for this staff member
  const staffAttendance = useMemo(() => {
    if (!staff) return [];
    return data.attendance.filter((a) => a.userId === staff.userId);
  }, [data.attendance, staff]);

  const staffLeaves = useMemo(() => {
    if (!staff) return [];
    return data.leaves.filter((l) => l.userId === staff.userId);
  }, [data.leaves, staff]);

  const staffPayroll = useMemo(() => {
    if (!staff) return undefined;
    return data.payroll.find((p) => p.userId === staff.userId);
  }, [data.payroll, staff]);

  // Computed live status
  const computedStatus = useMemo(() => {
    if (!staff) return null;
    return computeStaffStatus(staff, data.attendance, data.leaves, todayStr);
  }, [staff, data.attendance, data.leaves, todayStr]);

  if (!staff || !computedStatus) {
    return (
      <View style={styles.root}>
        <TopBar
          title="Staff Record"
          subtitle="Directory Lookup"
          back={() => (router.canGoBack() ? router.back() : router.replace("/directory" as any))}
        />
        <View style={styles.notFoundCenter}>
          <Empty
            title="Staff Member Not Found"
            detail={`No staff record matching identifier "${id || "unknown"}" was found in ${school.name}.`}
            actionText="Return to Directory"
            onAction={() => (router.canGoBack() ? router.back() : router.replace("/directory" as any))}
            icon="people"
          />
        </View>
      </View>
    );
  }

  // Assisted Clock-Out action for proprietor
  const handleClockOutAssist = async () => {
    setActionLoading(true);
    try {
      await act(
        () =>
          services.attendance(context, "out", offline, {
            targetUserId: staff.userId,
            locationName: `${school.name} Campus Gate`,
          }),
        `Clock-out confirmed for ${staff.name}!`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Assisted Clock-In action for proprietor
  const handleClockInAssist = async () => {
    setActionLoading(true);
    try {
      await act(
        () =>
          services.attendance(context, "in", offline, {
            targetUserId: staff.userId,
            photoVerified: true,
            locationName: `${school.name} Campus Gate (Assisted)`,
          }),
        `Clocked in ${staff.name} at ${school.name} gate!`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve missed clock-out from previous days
  const handleResolveMissedPunch = async (attendanceId: string) => {
    setActionLoading(true);
    try {
      await act(
        () =>
          services.attendance(context, "out", offline, {
            targetUserId: staff.userId,
            locationName: "Resolved by Administration",
          }),
        `Resolved missed shift for ${staff.name}!`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Leave approval / rejection
  const handleDecideLeave = async (leaveId: string, approve: boolean) => {
    setActionLoading(true);
    try {
      await act(
        () => services.decideLeave(context, leaveId, approve),
        approve
          ? `Approved leave request for ${staff.name}!`
          : `Rejected leave request for ${staff.name}.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Class allocations update
  const handleSaveClassAllocations = async (selectedClasses: string[]) => {
    await act(
      () =>
        services.updateStaff(context, staff.id, {
          assignedClasses: selectedClasses,
          assignedClass: selectedClasses[0] || undefined,
        }),
      `Updated class allocations for ${staff.name}!`
    );
  };

  // Role and credentials update
  const handleSaveRoleAndPermissions = async (patch: {
    role: Role;
    title: string;
    rank?: string;
    status: "active" | "invited" | "suspended";
    permissions: string[];
  }) => {
    await act(
      () => services.updateStaff(context, staff.id, patch),
      `Updated credentials and access for ${staff.name}!`
    );
  };

  // Payroll compensation update
  const handleSavePayroll = async (
    basicKobo: number,
    allowancesKobo: number,
    deductionsKobo: number
  ) => {
    if (staffPayroll) {
      await act(
        () =>
          services.updatePayroll(context, staffPayroll.id, {
            basic: basicKobo,
            allowances: allowancesKobo,
            deductions: deductionsKobo,
          }),
        `Updated salary and compensation for ${staff.name}!`
      );
    } else {
      toast.info("No prior payroll period record found for this staff member.");
    }
  };

  // Tab definitions
  const tabs: { key: StaffProfileTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "attendance", label: "Attendance", count: staffAttendance.length },
    { key: "tasks", label: "Tasks", count: tasks.filter((t) => t.status !== "completed").length },
    { key: "leave", label: "Time-Off", count: computedStatus.pendingLeavesCount || staffLeaves.length },
    { key: "payroll", label: "Payroll" },
    { key: "activity", label: "Activity" },
  ];

  const assignedClassesList =
    staff.assignedClasses && staff.assignedClasses.length > 0
      ? staff.assignedClasses
      : staff.assignedClass
      ? [staff.assignedClass]
      : [];

  return (
    <View style={styles.root}>
      {/* Universal Inline TopBar */}
      <TopBar
        title={staff.name}
        subtitle={`${staff.title || staff.role} · ${staff.id}`}
        back={() => (router.canGoBack() ? router.back() : router.replace("/directory" as any))}
        rightAction={
          isOwnerOrAdmin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage staff credentials"
              onPress={() => setManageRoleOpen(true)}
              style={styles.headerBtn}
            >
              <Icon name="settings" size={18} color={colors.navy} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ScreenContainer>
          {/* Identity & Presence Summary Card */}
          <StaffIdentityCard
            staff={staff}
            computed={computedStatus}
            isOwnerOrAdmin={isOwnerOrAdmin}
            onOpenDigitalId={() => setDigitalIdOpen(true)}
            onClockOutAssist={handleClockOutAssist}
            onClockInAssist={handleClockInAssist}
            isClockingAction={actionLoading}
          />

          {/* Segmented Horizontal Navigation Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabStrip}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tabChip, isActive && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <View style={styles.tabBody}>
              {/* Classroom Allocation Section */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Icon name="school" size={16} color={colors.navy} />
                    <Text style={styles.sectionCardTitle}>Classroom Streams</Text>
                  </View>

                  {isOwnerOrAdmin && (
                    <Pressable
                      onPress={() => setManageClassesOpen(true)}
                      style={styles.cardHeaderLink}
                    >
                      <Text style={styles.cardHeaderLinkText}>Reallocate</Text>
                    </Pressable>
                  )}
                </View>

                {assignedClassesList.length === 0 ? (
                  <Text style={styles.emptyInlineText}>
                    No specific classrooms or student arms currently assigned.
                  </Text>
                ) : (
                  <View style={styles.classesBadgeGrid}>
                    {assignedClassesList.map((clsName) => (
                      <View key={clsName} style={styles.classBadge}>
                        <Icon name="book" size={13} color={colors.orange} />
                        <Text style={styles.classBadgeText}>{clsName}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>

              {/* Responsibilities & Qualifications */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Icon name="verify" size={16} color={colors.navy} />
                    <Text style={styles.sectionCardTitle}>Faculty Profile</Text>
                  </View>
                </View>

                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>Official Email</Text>
                  <Text style={styles.profileFieldValue}>{staff.email || "No email recorded"}</Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>Phone Number</Text>
                  <Text style={styles.profileFieldValue}>{staff.phone || "No phone recorded"}</Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>Academic Rank</Text>
                  <Text style={styles.profileFieldValue}>
                    {staff.rank || "Faculty Member · Standard Grade"}
                  </Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>School Affiliation</Text>
                  <Text style={styles.profileFieldValue}>{school.name}</Text>
                </View>
              </Card>

              {/* System Permissions */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Icon name="shield" size={16} color={colors.navy} />
                    <Text style={styles.sectionCardTitle}>System Permissions</Text>
                  </View>
                  {isOwnerOrAdmin && (
                    <Pressable
                      onPress={() => setManageRoleOpen(true)}
                      style={styles.cardHeaderLink}
                    >
                      <Text style={styles.cardHeaderLinkText}>Edit Access</Text>
                    </Pressable>
                  )}
                </View>

                {!staff.permissions || staff.permissions.length === 0 ? (
                  <Text style={styles.emptyInlineText}>
                    Standard faculty access permissions.
                  </Text>
                ) : (
                  <View style={styles.permissionsPillGrid}>
                    {staff.permissions.map((perm) => (
                      <View key={perm} style={styles.permPill}>
                        <Icon name="check" size={11} color={colors.green} />
                        <Text style={styles.permPillText}>{perm.toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === "attendance" && (
            <View style={styles.tabBody}>
              <StaffAttendanceSection
                attendanceRecords={staffAttendance}
                isOwnerOrAdmin={isOwnerOrAdmin}
                staffUserId={staff.userId}
                onResolveMissedPunch={handleResolveMissedPunch}
                isActionLoading={actionLoading}
              />
            </View>
          )}

          {/* TAB 3: TASKS */}
          {activeTab === "tasks" && (
            <View style={styles.tabBody}>
              <StaffTasksSection
                tasks={tasks}
                isOwnerOrAdmin={isOwnerOrAdmin}
                onOpenAssignTask={() => setAssignTaskOpen(true)}
                onToggleStatus={updateTaskStatus}
              />
            </View>
          )}

          {/* TAB 4: TIME-OFF */}
          {activeTab === "leave" && (
            <View style={styles.tabBody}>
              <StaffLeaveSection
                leaves={staffLeaves}
                isOwnerOrAdmin={isOwnerOrAdmin}
                onDecideLeave={handleDecideLeave}
                isDeciding={actionLoading}
              />
            </View>
          )}

          {/* TAB 5: PAYROLL & EMPLOYMENT */}
          {activeTab === "payroll" && (
            <View style={styles.tabBody}>
              <StaffPayrollSection
                payroll={staffPayroll}
                isOwnerOrAdmin={isOwnerOrAdmin}
                onOpenUpdateSalary={() => setUpdateSalaryOpen(true)}
              />
            </View>
          )}

          {/* TAB 6: ACTIVITY TIMELINE */}
          {activeTab === "activity" && (
            <View style={styles.tabBody}>
              <StaffActivityTimeline
                staff={staff}
                attendance={staffAttendance}
                leaves={staffLeaves}
                payroll={staffPayroll}
                tasks={tasks}
              />
            </View>
          )}
        </ScreenContainer>
      </ScrollView>

      {/* Digital ID Pass Sheet */}
      <DigitalIdSheet
        visible={digitalIdOpen}
        onClose={() => setDigitalIdOpen(false)}
      />

      {/* Task Assignment Modal */}
      <AssignTaskSheet
        visible={assignTaskOpen}
        onClose={() => setAssignTaskOpen(false)}
        staffName={staff.name}
        staffId={staff.id}
        staffUserId={staff.userId}
        currentUserId={context.userId}
        currentUserName={context.userId}
        onSaveTask={addTask}
      />

      {/* Classroom Allocations Modal */}
      <ManageClassesSheet
        visible={manageClassesOpen}
        onClose={() => setManageClassesOpen(false)}
        staffName={staff.name}
        allClasses={data.classes || []}
        currentAssigned={assignedClassesList}
        onSaveClasses={handleSaveClassAllocations}
      />

      {/* Role & Permissions Modal */}
      <ManageRolePermissionsSheet
        visible={manageRoleOpen}
        onClose={() => setManageRoleOpen(false)}
        staff={staff}
        onSaveRoleAndPermissions={handleSaveRoleAndPermissions}
      />

      {/* Compensation & Salary Modal */}
      <UpdateSalarySheet
        visible={updateSalaryOpen}
        onClose={() => setUpdateSalaryOpen(false)}
        staffName={staff.name}
        currentPayroll={staffPayroll}
        onSavePayroll={handleSavePayroll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  notFoundCenter: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
    gap: spacing.md,
  },
  tabStrip: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  tabChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.slate700,
  },
  tabChipTextActive: {
    color: "#ffffff",
  },
  tabBody: {
    gap: spacing.md,
    marginTop: 4,
  },
  sectionCard: {
    padding: spacing.md,
    gap: 12,
    backgroundColor: colors.surface,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  cardHeaderLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardHeaderLinkText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
  },
  classesBadgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
  },
  classBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
    paddingBottom: 8,
  },
  profileFieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  profileFieldValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  permissionsPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  permPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radii.xs,
  },
  permPillText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.navy,
  },
  emptyInlineText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
});
