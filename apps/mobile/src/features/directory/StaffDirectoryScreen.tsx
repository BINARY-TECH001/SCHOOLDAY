import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { TopBar } from "../../components/TopBar";
import { Avatar, Badge, Button, EmptyState } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useSchool } from "../../providers/AppProvider";
import { Staff } from "../../domain/model";
import { StaffFilterTab, StaffWithComputedStatus } from "../staff/types";
import { computeStaffStatus } from "../staff/utils/staffStatus";

export function StaffDirectoryScreen() {
  const { data, context, school } = useSchool();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<StaffFilterTab>("all");

  const isProprietorOrAdmin =
    context.role === "owner" || context.role === "admin" || context.role === "hr";

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute status for all staff
  const staffWithStatus = useMemo<StaffWithComputedStatus[]>(() => {
    return data.staff.map((s) => ({
      staff: s,
      computed: computeStaffStatus(s, data.attendance, data.leaves, todayStr),
    }));
  }, [data.staff, data.attendance, data.leaves, todayStr]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let present = 0;
    let notIn = 0;
    let leave = 0;
    let pending = 0;

    staffWithStatus.forEach(({ computed }) => {
      if (computed.presence === "present") present++;
      if (computed.presence === "not_in") notIn++;
      if (computed.presence === "on_leave") leave++;
      if (computed.pendingLeavesCount > 0 || computed.hasMissedClockOut) pending++;
    });

    return {
      all: staffWithStatus.length,
      present,
      notIn,
      leave,
      pending,
    };
  }, [staffWithStatus]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return staffWithStatus.filter(({ staff, computed }) => {
      // 1. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = staff.name.toLowerCase().includes(q);
        const matchesId = staff.id.toLowerCase().includes(q);
        const matchesTitle = staff.title.toLowerCase().includes(q);
        const matchesClass = staff.assignedClass?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesId && !matchesTitle && !matchesClass) {
          return false;
        }
      }

      // 2. Tab filter
      if (activeFilter === "present") return computed.presence === "present";
      if (activeFilter === "not_in") return computed.presence === "not_in";
      if (activeFilter === "leave") return computed.presence === "on_leave";
      if (activeFilter === "pending") {
        return computed.pendingLeavesCount > 0 || computed.hasMissedClockOut;
      }

      return true;
    });
  }, [staffWithStatus, search, activeFilter]);

  const renderStaffRow = ({ item }: { item: StaffWithComputedStatus }) => {
    const { staff, computed } = item;
    const assignedClass = staff.assignedClass || (staff.assignedClasses && staff.assignedClasses[0]);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${staff.name}'s profile`}
        onPress={() =>
          router.push({
            pathname: "/staff-detail",
            params: { id: staff.id },
          })
        }
        style={({ pressed }) => [
          styles.staffRow,
          pressed && styles.staffRowPressed,
        ]}
      >
        <Avatar
          uri={staff.avatar}
          name={staff.name}
          size={44}
          role={staff.role}
        />

        <View style={styles.staffDetails}>
          <View style={styles.nameHeaderRow}>
            <Text style={styles.staffName} numberOfLines={1}>
              {staff.name}
            </Text>
            <Text style={styles.staffIdBadge}>{staff.id}</Text>
          </View>

          <Text style={styles.staffTitle} numberOfLines={1}>
            {staff.title || staff.role}
            {assignedClass ? ` · ${assignedClass}` : ""}
          </Text>

          {/* Operational Presence & Pending Pills */}
          <View style={styles.statusPillsRow}>
            {computed.presence === "present" && (
              <Badge
                tone="success"
                dot
                text={computed.timeIn ? `In at ${computed.timeIn}` : "Present"}
                size="sm"
              />
            )}
            {computed.presence === "clocked_out" && (
              <Badge
                tone="neutral"
                text={computed.timeOut ? `Clocked Out ${computed.timeOut}` : "Clocked Out"}
                size="sm"
              />
            )}
            {computed.presence === "on_leave" && (
              <Badge
                tone="purple"
                text={`On Leave · ${computed.leaveType || "Approved"}`}
                size="sm"
              />
            )}
            {computed.presence === "not_in" && (
              <Badge
                tone="neutral"
                text="Not Clocked In"
                size="sm"
              />
            )}

            {computed.pendingLeavesCount > 0 && (
              <Badge
                tone="warning"
                icon="document"
                text={`${computed.pendingLeavesCount} Leave Pending`}
                size="sm"
              />
            )}
          </View>
        </View>

        <Icon name="arrow" size={16} color={colors.muted} />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="Staff Operations & Directory"
        subtitle={`${school.name} · ${counts.all} Members`}
        back={() => (router.canGoBack() ? router.back() : router.replace("/home" as any))}
        rightAction={
          isProprietorOrAdmin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Invite new staff"
              onPress={() => router.push("/invite-staff" as any)}
              style={({ pressed }) => [
                styles.addStaffBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Icon name="add" size={16} color="#ffffff" />
              <Text style={styles.addStaffBtnText}>Invite</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, title, or class..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setSearch("")}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs Strip */}
      <View style={styles.filterStrip}>
        <Pressable
          style={[styles.filterChip, activeFilter === "all" && styles.filterChipActive]}
          onPress={() => setActiveFilter("all")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "all" && styles.filterChipTextActive,
            ]}
          >
            All Staff ({counts.all})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === "present" && styles.filterChipActive]}
          onPress={() => setActiveFilter("present")}
        >
          <View style={styles.liveDot} />
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "present" && styles.filterChipTextActive,
            ]}
          >
            Present ({counts.present})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === "not_in" && styles.filterChipActive]}
          onPress={() => setActiveFilter("not_in")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "not_in" && styles.filterChipTextActive,
            ]}
          >
            Not Clocked In ({counts.notIn})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === "leave" && styles.filterChipActive]}
          onPress={() => setActiveFilter("leave")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "leave" && styles.filterChipTextActive,
            ]}
          >
            On Leave ({counts.leave})
          </Text>
        </Pressable>

        {counts.pending > 0 && (
          <Pressable
            style={[
              styles.filterChip,
              activeFilter === "pending" && styles.filterChipActive,
              styles.filterChipWarning,
            ]}
            onPress={() => setActiveFilter("pending")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "pending" && styles.filterChipTextActive,
                { color: activeFilter === "pending" ? "#ffffff" : colors.orange },
              ]}
            >
              Pending Review ({counts.pending})
            </Text>
          </Pressable>
        )}
      </View>

      {/* Staff FlatList */}
      <FlatList
        data={filteredRoster}
        keyExtractor={(item) => item.staff.id}
        renderItem={renderStaffRow}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No Faculty Records Found"
              subtitle={
                search.trim() || activeFilter !== "all"
                  ? "No staff members match the selected filter or search query."
                  : "No staff members registered in this school yet."
              }
              actionLabel={
                search.trim() || activeFilter !== "all" ? "Reset Filters" : undefined
              }
              onAction={
                search.trim() || activeFilter !== "all"
                  ? () => {
                      setSearch("");
                      setActiveFilter("all");
                    }
                  : undefined
              }
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  filterStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 6,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipWarning: {
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
  },
  filterChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slate700,
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  staffRowPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  staffDetails: {
    flex: 1,
    gap: 3,
  },
  nameHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  staffName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  staffIdBadge: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  staffTitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  statusPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  addStaffBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
  },
  addStaffBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
});
