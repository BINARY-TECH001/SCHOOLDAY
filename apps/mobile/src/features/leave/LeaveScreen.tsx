import React, { useState, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Avatar, Badge, Button, Card, EmptyState } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { TopBar } from "../../components/TopBar";
import { useSchool } from "../../providers/AppProvider";
import { Leave, LeaveInput } from "../../domain/model";
import { RequestLeaveSheet } from "./RequestLeaveSheet";
import {
  LeaveFilterSheet,
  LeaveStatusFilter,
  LeaveTypeFilter,
} from "./components/LeaveFilterSheet";
import {
  calculateLeaveDuration,
  formatLeaveDateRange,
} from "./utils/leaveValidation";

export function LeaveScreen() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const { data, context, services, act, offline, busy } = useSchool();

  const isOwnerOrAdmin =
    context.role === "owner" || context.role === "admin" || context.role === "hr";

  // Tab: Approvals Queue vs My Requests
  const [activeTab, setActiveTab] = useState<"approvals" | "my_requests">(
    isOwnerOrAdmin ? "approvals" : "my_requests"
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<LeaveStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Sheet State
  const [sheetVisible, setSheetVisible] = useState(Boolean(create));
  const [editingLeave, setEditingLeave] = useState<{
    data: LeaveInput;
    id?: string;
    isDraft?: boolean;
  } | null>(null);

  // Decision loading state
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Split leaves into approvals (school-wide) vs my personal requests
  const approvalsList = useMemo(() => {
    return [...data.leaves].sort((a, b) => b.start.localeCompare(a.start));
  }, [data.leaves]);

  const myLeavesList = useMemo(() => {
    return data.leaves
      .filter((l) => l.userId === context.userId)
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [data.leaves, context.userId]);

  // Pending leaves count for badge
  const pendingApprovalsCount = useMemo(() => {
    return approvalsList.filter(
      (l) => l.status === "Submitted" || l.status === "Waiting to sync"
    ).length;
  }, [approvalsList]);

  // Current working list based on tab
  const baseList = activeTab === "approvals" && isOwnerOrAdmin ? approvalsList : myLeavesList;

  // Filtered by status, category, and search query
  const filteredList = useMemo(() => {
    return baseList.filter((l) => {
      // 1. Status Filter
      if (statusFilter === "pending" && l.status !== "Submitted" && l.status !== "Waiting to sync") {
        return false;
      }
      if (statusFilter === "approved" && l.status !== "Approved") {
        return false;
      }
      if (statusFilter === "rejected" && l.status !== "Rejected") {
        return false;
      }
      if (statusFilter === "draft" && l.status !== "Draft") {
        return false;
      }

      // 2. Category Filter
      if (typeFilter !== "all" && l.type !== typeFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const requester = data.staff.find((s) => s.userId === l.userId);
        const nameMatch = requester ? requester.name.toLowerCase().includes(q) : false;
        const reasonMatch = l.reason ? l.reason.toLowerCase().includes(q) : false;
        const typeMatch = l.type.toLowerCase().includes(q);
        const dateMatch = l.start.includes(q) || l.end.includes(q);
        if (!nameMatch && !reasonMatch && !typeMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [baseList, statusFilter, typeFilter, searchQuery, data.staff]);

  // Summary Metrics
  const mySummary = useMemo(() => {
    let approvedDays = 0;
    let pendingCount = 0;

    myLeavesList.forEach((l) => {
      if (l.status === "Approved") {
        const { workingDays } = calculateLeaveDuration(l.start, l.end);
        approvedDays += workingDays;
      } else if (l.status === "Submitted" || l.status === "Waiting to sync") {
        pendingCount++;
      }
    });

    return { approvedDays, pendingCount, totalRequests: myLeavesList.length };
  }, [myLeavesList]);

  // Handler: Submit / Save Leave
  const handleSaveLeave = async (
    input: LeaveInput,
    draft: boolean,
    id?: string
  ) => {
    await act(
      async () => {
        await services.leave(context, input, draft, offline, id);
        setEditingLeave(null);
      },
      draft
        ? "Draft saved on device."
        : offline
        ? "Saved on device · Waiting to sync"
        : "Leave request submitted successfully."
    );
  };

  // Handler: Approve / Reject Leave
  const handleDecideLeave = async (leaveId: string, approve: boolean, staffName: string) => {
    setDecidingId(leaveId);
    try {
      await act(
        () => services.decideLeave(context, leaveId, approve),
        approve
          ? `Approved leave request for ${staffName}.`
          : `Rejected leave request for ${staffName}.`
      );
    } finally {
      setDecidingId(null);
    }
  };

  // Resolve staff details
  const getStaffForLeave = (userId: string) => {
    return data.staff.find((s) => s.userId === userId);
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="Time-Off & Leave"
        subtitle="Staff requests, approvals & coverage"
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request time off"
            style={styles.requestNewBtn}
            onPress={() => router.push("/request-leave")}
          >
            <Icon name="add" size={16} color={colors.white} />
            <Text style={styles.requestNewBtnText}>Request</Text>
          </Pressable>
        }
      />

      {/* Role-based Tab Switcher for Owner / Admin / HR */}
      {isOwnerOrAdmin && (
        <View style={styles.tabBar}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "approvals" }}
            style={[
              styles.tabBtn,
              activeTab === "approvals" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("approvals")}
          >
            <Icon
              name="verify"
              size={15}
              color={activeTab === "approvals" ? colors.white : colors.slate500}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "approvals" && styles.tabBtnTextActive,
              ]}
            >
              Approvals Queue
            </Text>
            {pendingApprovalsCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "approvals"
                    ? styles.tabBadgeActive
                    : styles.tabBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "approvals"
                      ? styles.tabBadgeTextActive
                      : styles.tabBadgeTextInactive,
                  ]}
                >
                  {pendingApprovalsCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "my_requests" }}
            style={[
              styles.tabBtn,
              activeTab === "my_requests" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("my_requests")}
          >
            <Icon
              name="calendar"
              size={15}
              color={activeTab === "my_requests" ? colors.white : colors.slate500}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "my_requests" && styles.tabBtnTextActive,
              ]}
            >
              My Requests
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PERSONAL SUMMARY HERO CARD (WHEN ON MY REQUESTS TAB) */}
        {activeTab === "my_requests" && (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryVal}>{mySummary.approvedDays}</Text>
              <Text style={styles.summaryLabel}>Days Taken</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text
                style={[
                  styles.summaryVal,
                  mySummary.pendingCount > 0 && { color: colors.orange },
                ]}
              >
                {mySummary.pendingCount}
              </Text>
              <Text style={styles.summaryLabel}>Pending Review</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryVal}>{mySummary.totalRequests}</Text>
              <Text style={styles.summaryLabel}>Total Records</Text>
            </View>
          </Card>
        )}

        {/* PROPRIETOR HERO CARD (WHEN ON APPROVALS TAB) */}
        {activeTab === "approvals" && isOwnerOrAdmin && (
          <Card style={styles.approvalsHeroCard}>
            <View style={styles.approvalsHeroIcon}>
              <Icon name="verify" size={20} color={colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.approvalsHeroTitle}>
                Staff Leave Management & Cover
              </Text>
              <Text style={styles.approvalsHeroSub}>
                Review time-off requests, ensure classroom cover, and approve or reject in real time.
              </Text>
            </View>
          </Card>
        )}

        {/* Search & Filter Bar with Filter BottomSheet Trigger */}
        <View style={styles.searchFilterBar}>
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color={colors.slate400} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search staff, reason or dates..."
              placeholderTextColor={colors.slate400}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Icon name="close" size={16} color={colors.slate400} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter requests"
            onPress={() => setFilterSheetVisible(true)}
            style={[
              styles.filterIconBtn,
              (statusFilter !== "all" || typeFilter !== "all") && styles.filterIconBtnActive,
            ]}
          >
            <Icon
              name="filter"
              size={18}
              color={(statusFilter !== "all" || typeFilter !== "all") ? "#ffffff" : colors.navy}
            />
            {(statusFilter !== "all" || typeFilter !== "all") && (
              <View style={styles.filterActiveBadge} />
            )}
          </Pressable>
        </View>

        {/* Active filter summary pill if filtered */}
        {(statusFilter !== "all" || typeFilter !== "all" || searchQuery) && (
          <View style={styles.filterSummaryRow}>
            <Text style={styles.filterSummaryText}>
              Filtered: {statusFilter !== "all" ? `${statusFilter} · ` : ""}{typeFilter !== "all" ? `${typeFilter} · ` : ""}{filteredList.length} results
            </Text>
            <Pressable
              onPress={() => {
                setStatusFilter("all");
                setTypeFilter("all");
                setSearchQuery("");
              }}
            >
              <Text style={styles.clearFilterLink}>Reset Filters</Text>
            </Pressable>
          </View>
        )}

        {/* LEAVE REQUESTS LIST */}
        {filteredList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title={
                statusFilter === "all"
                  ? "No Leave Requests Found"
                  : `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Requests`
              }
              subtitle={
                activeTab === "approvals"
                  ? "There are currently no staff leave requests matching this filter."
                  : "You have not submitted or drafted any leave requests under this category."
              }
              icon="calendar"
            />
            {activeTab === "my_requests" && (
              <Button
                title="Request Time Off"
                variant="primary"
                size="sm"
                icon="add"
                style={{ alignSelf: "center", marginTop: spacing.md }}
                onPress={() => router.push("/request-leave")}
              />
            )}
          </Card>
        ) : (
          <View style={styles.cardsList}>
            {filteredList.map((leave) => {
              const staff = getStaffForLeave(leave.userId);
              const staffName = staff?.name || `Staff Member (${leave.userId.slice(0, 6)})`;
              const staffRole = staff?.title || staff?.role || "Staff";
              const { formatted: durationStr } = calculateLeaveDuration(
                leave.start,
                leave.end
              );
              const dateRangeStr = formatLeaveDateRange(leave.start, leave.end);

              const isPending =
                leave.status === "Submitted" || leave.status === "Waiting to sync";
              const isApproved = leave.status === "Approved";
              const isRejected = leave.status === "Rejected";
              const isDraft = leave.status === "Draft";

              return (
                <Card key={leave.id} style={styles.leaveCard}>
                  {/* Top Row: Staff / Type + Status Badge */}
                  <View style={styles.cardTopRow}>
                    {activeTab === "approvals" && isOwnerOrAdmin ? (
                      <View style={styles.staffHeaderRow}>
                        <Avatar name={staffName} size={36} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.staffNameText} numberOfLines={1}>
                            {staffName}
                          </Text>
                          <Text style={styles.staffRoleText}>
                            {staffRole} · {leave.type} Leave
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.personalTypeRow}>
                        <View style={styles.typeBadgeCircle}>
                          <Icon name="calendar" size={14} color={colors.navy} />
                        </View>
                        <Text style={styles.leaveTypeTitle}>
                          {leave.type} Leave
                        </Text>
                      </View>
                    )}

                    <Badge
                      tone={
                        isApproved
                          ? "success"
                          : isPending
                          ? "warning"
                          : isRejected
                          ? "danger"
                          : "neutral"
                      }
                      text={
                        leave.status === "Waiting to sync"
                          ? "OFFLINE SYNC"
                          : leave.status.toUpperCase()
                      }
                      dot={isPending}
                    />
                  </View>

                  {/* Date Range & Duration Banner */}
                  <View style={styles.dateDurationBanner}>
                    <Icon name="clock" size={14} color={colors.navy} />
                    <Text style={styles.dateRangeText}>{dateRangeStr}</Text>
                    <View style={styles.durationTag}>
                      <Text style={styles.durationTagText}>{durationStr}</Text>
                    </View>
                  </View>

                  {/* Reason Text */}
                  <View style={styles.reasonWrap}>
                    <Text style={styles.reasonText}>{leave.reason}</Text>
                  </View>

                  {/* Status-specific notices */}
                  {isRejected && (
                    <View style={styles.rejectedNotice}>
                      <Icon name="close" size={14} color={colors.danger} />
                      <Text style={styles.rejectedNoticeText}>
                        Academic or assessment-week cover conflict. Please consult HR for alternate dates.
                      </Text>
                    </View>
                  )}

                  {leave.status === "Waiting to sync" && (
                    <View style={styles.offlineNotice}>
                      <Icon name="refresh" size={13} color={colors.orange} />
                      <Text style={styles.offlineNoticeText}>
                        Saved locally on device. Will automatically sync to campus servers when online.
                      </Text>
                    </View>
                  )}

                  {/* Action Bar */}
                  {/* Option A: Approvals Tab & Pending Leave -> Approve / Reject Actions */}
                  {activeTab === "approvals" && isOwnerOrAdmin && isPending && (
                    <View style={styles.adminActionRow}>
                      <Button
                        title="Reject"
                        variant="outline"
                        size="sm"
                        disabled={busy || decidingId === leave.id}
                        style={{ flex: 1 }}
                        onPress={() =>
                          handleDecideLeave(leave.id, false, staffName)
                        }
                      />
                      <Button
                        title="Approve"
                        variant="primary"
                        size="sm"
                        icon="check"
                        disabled={busy || decidingId === leave.id}
                        style={{ flex: 1.3 }}
                        onPress={() =>
                          handleDecideLeave(leave.id, true, staffName)
                        }
                      />
                    </View>
                  )}

                  {/* Option B: My Requests & Draft Leave -> Resume Draft */}
                  {isDraft && (
                    <View style={styles.draftActionRow}>
                      <Button
                        title="Resume & Edit Draft"
                        variant="secondary"
                        size="sm"
                        icon="edit"
                        onPress={() => {
                          setEditingLeave({
                            data: {
                              type: leave.type as any,
                              start: leave.start,
                              end: leave.end,
                              reason: leave.reason,
                            },
                            id: leave.id,
                            isDraft: true,
                          });
                          setSheetVisible(true);
                        }}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* REQUEST TIME-OFF SHEET (LEGACY / FAST EDIT) */}
      <RequestLeaveSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingLeave(null);
        }}
        initialData={editingLeave?.data}
        initialId={editingLeave?.id}
        isDraft={editingLeave?.isDraft}
        onSubmit={handleSaveLeave}
        busy={busy}
      />

      {/* LEAVE FILTER BOTTOMSHEET */}
      <LeaveFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onReset={() => {
          setStatusFilter("all");
          setTypeFilter("all");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  requestNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  requestNewBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
  },
  tabBtnActive: {
    backgroundColor: colors.navy,
  },
  tabBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.slate600,
  },
  tabBtnTextActive: {
    color: colors.white,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  tabBadgeActive: {
    backgroundColor: colors.orange,
  },
  tabBadgeInactive: {
    backgroundColor: colors.slate200,
  },
  tabBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  tabBadgeTextActive: {
    color: colors.white,
  },
  tabBadgeTextInactive: {
    color: colors.slate700,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 48,
    gap: spacing.md,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  summaryCol: {
    alignItems: "center",
    gap: 2,
  },
  summaryVal: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.navy,
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  approvalsHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm + 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  approvalsHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  approvalsHeroTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  approvalsHeroSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate600,
    marginTop: 2,
    lineHeight: 15,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    flexWrap: "wrap",
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterPillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate600,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  emptyCard: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  cardsList: {
    gap: spacing.md,
  },
  leaveCard: {
    padding: spacing.md,
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  staffHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  staffNameText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  staffRoleText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  personalTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  leaveTypeTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  dateDurationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.sm,
    gap: 6,
  },
  dateRangeText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
    flex: 1,
  },
  durationTag: {
    backgroundColor: colors.white,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationTagText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.navy,
  },
  reasonWrap: {
    backgroundColor: "#fcfdfe",
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  reasonText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate700,
    lineHeight: 18,
  },
  rejectedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff5f5",
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  rejectedNoticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.danger,
    lineHeight: 15,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fffbeb",
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  offlineNoticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate700,
  },
  adminActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm + 2,
    marginTop: 2,
  },
  draftActionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    alignItems: "flex-end",
  },
  searchFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.slate900,
    paddingVertical: 0,
  },
  filterIconBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterIconBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterActiveBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  filterSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterSummaryText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate600,
  },
  clearFilterLink: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
});

