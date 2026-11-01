import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing } from "../theme/tokens";
import { Badge } from "../components/ui";
import { DigitalIdSheet } from "../components/DigitalIdSheet";
import { ClassPresetsModal } from "../components/ClassPresetsModal";
import { HomeSkeleton } from "../components/HomeSkeleton";
import { balance, can, total } from "../domain/model";
import { useSchool } from "../providers/AppProvider";

// Role-adaptive home layout components
import { HomeHeader } from "./home/HomeHeader";
import { HomeHeroBanner } from "./home/HomeHeroBanner";
import { AttentionItem, HomeAttentionBanner } from "./home/HomeAttentionBanner";
import { QuickActionItem, QuickActionsBar } from "./home/QuickActionsBar";
import { OwnerHomeSection } from "./home/OwnerHomeSection";
import { TeacherHomeSection } from "./home/TeacherHomeSection";
import { ParentHomeSection } from "./home/ParentHomeSection";
import { FinanceHomeSection } from "./home/FinanceHomeSection";
import { HrHomeSection } from "./home/HrHomeSection";
import { StaffHomeSection } from "./home/StaffHomeSection";
import { NoticeboardSection } from "./home/NoticeboardSection";
import { StudentAttendanceOverviewCard } from "./home/StudentAttendanceOverviewCard";

export function Home() {
  const insets = useSafeAreaInsets();
  const { data, context, school, offline, ready, refresh } = useSchool();
  const [digitalIdOpen, setDigitalIdOpen] = useState(false);
  const [classPresetsOpen, setClassPresetsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      refresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  if (!ready) {
    return <HomeSkeleton />;
  }

  // Financial calculations
  const totalOutstanding = data.invoices.reduce(
    (sum, i) => sum + balance(i),
    0,
  );
  const totalBilled = data.invoices.reduce((sum, i) => sum + total(i), 0);
  const totalCollected = data.invoices.reduce((sum, i) => sum + i.paid, 0);
  const collectionRate =
    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

  // Active user details
  const currentMembership =
    data.memberships.find((m) => m.userId === context.userId) ||
    data.memberships[0];

  const firstName: string = currentMembership?.name?.split(" ")?.[0] || "there";

  const assignedTeacherClass = data.classes?.find(
    (c) => c.teacherUserId === context.userId,
  );

  // Today's date formatting
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const todayStr = now.toISOString().split("T")[0] ?? "";

  // Attendance details
  const userClockedInToday = data.attendance.some(
    (a) => a.userId === context.userId && a.inAt.startsWith(todayStr),
  );
  const userAttendanceRecord = data.attendance.find(
    (a) => a.userId === context.userId && a.inAt.startsWith(todayStr),
  );
  const staffClockedInCount = data.attendance.filter((a) =>
    a.inAt.startsWith(todayStr),
  ).length;

  // Operational items
  const pendingLeaves = data.leaves.filter(
    (l) => l.status === "Submitted",
  ).length;
  const pendingTransfers = data.payments.filter(
    (p) => p.state === "awaiting confirmation",
  ).length;
  const unreadNotices = data.notices.filter((n) => !n.read).length;

  // Determine highest-priority action item for active role
  const getAttentionItem = (): AttentionItem | null => {
    const isOwner = context.role === "owner" || context.role === "admin";
    const isFinance = context.role === "finance";
    const isStaffOrTeacher =
      context.role === "teacher" || context.role === "staff";
    const isHr = context.role === "hr";

    if ((isOwner || isFinance) && pendingTransfers > 0) {
      return {
        title: `${pendingTransfers} Bank Transfer${pendingTransfers > 1 ? "s" : ""} to Reconcile`,
        subtitle: "Direct deposits awaiting bursary review",
        icon: "wallet",
        route: "/finance",
        actionText: "Review",
      };
    }

    if (isStaffOrTeacher && !userClockedInToday) {
      return {
        title: "Daily Attendance Clock-In Required",
        subtitle: "Campus geofence and facial alignment active",
        icon: "camera",
        route: "/attendance",
        actionText: "Clock In",
      };
    }

    if ((isOwner || isHr) && pendingLeaves > 0) {
      return {
        title: `${pendingLeaves} Staff Leave Request${pendingLeaves > 1 ? "s" : ""} Pending`,
        subtitle: "Time-off requests awaiting administrative approval",
        icon: "verify",
        route: "/approvals",
        actionText: "Review",
      };
    }

    return null;
  };

  const attentionItem = getAttentionItem();

  // Role-specific quick actions
  const getQuickActions = (): QuickActionItem[] => {
    switch (context.role) {
      case "owner":
      case "admin":
        return [
          {
            id: "presets",
            title: "Class Presets",
            icon: "school",
            onPress: () => setClassPresetsOpen(true),
          },
          {
            id: "enroll",
            title: "Enroll Pupils",
            icon: "userAdd",
            accent: data.students.length === 0,
            onPress: () => router.push("/add-pupil" as any),
          },
          {
            id: "invite",
            title: "Invite Staff",
            icon: "sms",
            onPress: () => router.push("/invite-staff" as any),
          },
          {
            id: "staffCalendar",
            title: "Staff Calendar",
            icon: "calendar",
            onPress: () => router.push("/attendance-calendar"),
          },
          {
            id: "payroll",
            title: "Disburse Payroll",
            icon: "wallet",
            onPress: () => router.push("/payroll"),
          },
          {
            id: "digitalPass",
            title: "Digital Pass",
            icon: "verify",
            onPress: () => setDigitalIdOpen(true),
          },
        ];

      case "teacher":
        return [
          {
            id: "clock",
            title: userClockedInToday ? "Clock Out" : "Clock In",
            icon: "camera",
            accent: !userClockedInToday,
            onPress: () => router.push("/attendance"),
          },
          {
            id: "roster",
            title: "Class Roster",
            icon: "school",
            onPress: () => router.push("/classes"),
          },
          {
            id: "lessons",
            title: "Lesson Plans",
            icon: "book",
            onPress: () => router.push("/lessons"),
          },
          {
            id: "leave",
            title: "Request Leave",
            icon: "calendar",
            onPress: () => router.push("/leave"),
          },
          {
            id: "digitalPass",
            title: "Digital Pass",
            icon: "verify",
            onPress: () => setDigitalIdOpen(true),
          },
        ];

      case "parent":
        return [
          {
            id: "fees",
            title: "Clear Tuition",
            icon: "wallet",
            accent: totalOutstanding > 0,
            onPress: () => router.push("/fees"),
          },
          {
            id: "receipts",
            title: "Official Receipts",
            icon: "receipt",
            onPress: () => router.push("/receipts"),
          },
          {
            id: "attendance",
            title: "Campus Clock",
            icon: "clock",
            onPress: () => router.push("/attendance"),
          },
          {
            id: "calendar",
            title: "School Calendar",
            icon: "calendar",
            onPress: () => router.push("/calendar" as any),
          },
        ];

      case "finance":
        return [
          {
            id: "ledger",
            title: "Bank Transfers",
            icon: "wallet",
            accent: pendingTransfers > 0,
            onPress: () => router.push("/finance"),
          },
          {
            id: "invoices",
            title: "Fee Invoices",
            icon: "document",
            onPress: () => router.push("/fees"),
          },
          {
            id: "receipts",
            title: "Issue Receipts",
            icon: "receipt",
            onPress: () => router.push("/receipts"),
          },
          {
            id: "payroll",
            title: "Payroll Ledger",
            icon: "wallet",
            onPress: () => router.push("/payroll"),
          },
        ];

      case "hr":
        return [
          {
            id: "approvals",
            title: "Leave Approvals",
            icon: "verify",
            accent: pendingLeaves > 0,
            onPress: () => router.push("/approvals"),
          },
          {
            id: "directory",
            title: "Staff Directory",
            icon: "people",
            onPress: () => router.push("/directory"),
          },
          {
            id: "attendance",
            title: "Attendance Audit",
            icon: "clock",
            onPress: () => router.push("/attendance"),
          },
          {
            id: "payroll",
            title: "Payroll Prep",
            icon: "wallet",
            onPress: () => router.push("/payroll"),
          },
        ];

      case "staff":
      default:
        return [
          {
            id: "clock",
            title: userClockedInToday ? "Clock Out" : "Punch In",
            icon: "clock",
            accent: !userClockedInToday,
            onPress: () => router.push("/attendance"),
          },
          {
            id: "digitalPass",
            title: "Digital Pass",
            icon: "verify",
            onPress: () => setDigitalIdOpen(true),
          },
          {
            id: "leave",
            title: "Request Leave",
            icon: "calendar",
            onPress: () => router.push("/leave"),
          },
          {
            id: "calendar",
            title: "School Calendar",
            icon: "calendar",
            onPress: () => router.push("/calendar" as any),
          },
        ];
    }
  };

  return (
    <View style={styles.root}>
      {/* Fixed Header Bar */}
      <HomeHeader
        firstName={firstName}
        avatarUri={currentMembership?.avatar}
        role={context.role}
        term={school.term}
        unreadNoticesCount={unreadNotices}
        topInset={insets.top}
      />

      {/* Main Scrollable Canvas */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.orange}
            colors={[colors.orange, colors.navy]}
          />
        }
      >
        {/* Campus Hero Card */}
        <HomeHeroBanner
          schoolName={school.name}
          shortName={school.short}
          motto={school.motto}
          coverPhoto={school.coverPhoto}
          openTime={school.openTime}
          closeTime={school.closeTime}
          activeRole={context.role}
          dateFormatted={dateFormatted}
          logo={school.logo}
          primaryColor={school.primaryColor}
          secondaryColor={school.secondaryColor}
        />

        {/* Offline Indicator */}
        {offline && (
          <Badge
            text="Offline Mode · Local device persistence active"
            tone="warning"
            dot
          />
        )}

        {/* Urgent Actionable Banner */}
        <HomeAttentionBanner item={attentionItem} />

        {/* Quick Actions Bar */}
        <QuickActionsBar actions={getQuickActions()} />

        {/* Role-Specific Core Section */}
        {context.role === "parent" ? (
          <ParentHomeSection
            childrenList={data.students}
            invoices={data.invoices}
            totalOutstanding={totalOutstanding}
          />
        ) : context.role === "teacher" ? (
          <TeacherHomeSection
            className={assignedTeacherClass?.name}
            studentCount={assignedTeacherClass?.studentCount ?? 0}
            clockedInToday={userClockedInToday}
            clockInTime={userAttendanceRecord?.inAt?.slice(11, 16)}
            lessonsCount={data.lessons.length}
            pendingLeavesCount={pendingLeaves}
          />
        ) : context.role === "finance" ? (
          <FinanceHomeSection
            totalCollected={totalCollected}
            totalOutstanding={totalOutstanding}
            collectionRate={collectionRate}
            pendingTransfersCount={pendingTransfers}
          />
        ) : context.role === "hr" ? (
          <HrHomeSection
            totalStaff={data.staff.length}
            staffClockedInCount={staffClockedInCount}
            pendingLeavesCount={pendingLeaves}
          />
        ) : context.role === "staff" ? (
          <StaffHomeSection
            clockedInToday={userClockedInToday}
            clockInTime={userAttendanceRecord?.inAt?.slice(11, 16)}
            onOpenDigitalId={() => setDigitalIdOpen(true)}
            pendingLeavesCount={pendingLeaves}
          />
        ) : (
          /* owner or admin */
          <OwnerHomeSection
            totalCollected={totalCollected}
            collectionRate={collectionRate}
            studentsCount={data.students.length}
            classesCount={data.classes.length}
            staffCount={data.staff.length}
            pendingTransfersCount={pendingTransfers}
            onOpenClassPresets={() => setClassPresetsOpen(true)}
          />
        )}

        {/* Official Noticeboard Section */}
        <NoticeboardSection
          notices={data.notices}
          isOwnerOrAdmin={context.role === "owner" || context.role === "admin"}
        />

        {/* Pupil Attendance Calendar Overview for Faculty & Proprietors */}
        {(context.role === "owner" ||
          context.role === "admin" ||
          context.role === "teacher") && <StudentAttendanceOverviewCard />}
      </ScrollView>

      {/* Digital ID Modal Sheet */}
      <DigitalIdSheet
        visible={digitalIdOpen}
        onClose={() => setDigitalIdOpen(false)}
      />

      {/* Class Presets Setup Modal */}
      <ClassPresetsModal
        visible={classPresetsOpen}
        onClose={() => setClassPresetsOpen(false)}
        onSuccess={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 120,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
});
