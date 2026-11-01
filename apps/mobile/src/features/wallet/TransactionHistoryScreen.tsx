import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, spacing, shadows } from "../../theme/tokens";
import { Badge, Card, EmptyState, Field, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { can, money, Payment } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";
import {
  TransactionFilterSheet,
  TransactionFilterState,
} from "./components/TransactionFilterSheet";

const DEFAULT_FILTERS: TransactionFilterState = {
  flow: "all",
  status: "all",
  method: "all",
  datePreset: "all",
};

export function TransactionHistoryScreen() {
  const { data, context } = useSchool();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TransactionFilterState>(DEFAULT_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentTimestamp] = useState(() => Date.now());

  const currentStaff = data.staff.find((s) => s.userId === context.userId);
  const isOwnerOrAdmin = context.role === "owner" || context.role === "admin";
  const hasUnlimitedFinance =
    isOwnerOrAdmin ||
    can(context.role, "finance") ||
    currentStaff?.permissions?.includes("finance");

  const isTeacherScoped = context.role === "teacher" && !hasUnlimitedFinance;
  const teacherClasses = useMemo(() => {
    return [currentStaff?.assignedClass, ...(currentStaff?.assignedClasses || [])].filter(Boolean) as string[];
  }, [currentStaff]);

  const activeFilterCount =
    (filters.flow !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.method !== "all" ? 1 : 0) +
    (filters.className && filters.className !== "all" ? 1 : 0) +
    (filters.datePreset !== "all" ? 1 : 0);

  const availableClasses = useMemo(() => {
    if (isTeacherScoped && teacherClasses.length > 0) {
      return [...teacherClasses].sort();
    }
    const set = new Set<string>();
    data.classes.forEach((c) => set.add(c.name));
    data.students.forEach((s) => {
      if (s.className) set.add(s.className);
      s.classes?.forEach((sc) => set.add(sc));
    });
    return Array.from(set).sort();
  }, [data.classes, data.students, isTeacherScoped, teacherClasses]);

  const filteredPayments = useMemo(() => {
    return data.payments
      .filter((p) => {
        // Teacher class isolation
        if (isTeacherScoped) {
          if (p.type === "payout") return false; // Teachers cannot inspect school operating disbursements
          const inv = data.invoices.find((i) => p.invoiceIds.includes(i.id));
          const stud = data.students.find((s) => s.id === inv?.studentId);
          if (!stud) return false;
          const studClasses = stud.classes || [stud.className];
          const matchesTeacherClass = studClasses.some((sc) =>
            teacherClasses.some((tc) => tc.toLowerCase() === sc.toLowerCase()),
          );
          if (!matchesTeacherClass) return false;
        }

        // Flow
        if (filters.flow === "inflows" && p.type === "payout") return false;
        if (filters.flow === "outflows" && p.type !== "payout") return false;

        // Status
        if (filters.status !== "all" && p.state !== filters.status) return false;

        // Method
        if (filters.method !== "all" && p.method !== filters.method) return false;

        // Class Filter
        if (filters.className && filters.className !== "all") {
          const inv = data.invoices.find((i) => p.invoiceIds.includes(i.id));
          const stud = data.students.find((s) => s.id === inv?.studentId);
          if (!stud) return false;
          const studClasses = stud.classes || [stud.className];
          if (!studClasses.some((c) => c.toLowerCase() === filters.className!.toLowerCase())) {
            return false;
          }
        }

        // Date Presets
        const pDate = p.createdAt.slice(0, 10);
        const todayStr = new Date(currentTimestamp).toISOString().slice(0, 10);

        if (filters.datePreset === "today" && pDate !== todayStr) return false;

        if (filters.datePreset === "week") {
          const sevenDaysAgo = new Date(currentTimestamp - 7 * 86400000).toISOString().slice(0, 10);
          if (pDate < sevenDaysAgo) return false;
        }

        if (filters.datePreset === "month") {
          const thirtyDaysAgo = new Date(currentTimestamp - 30 * 86400000).toISOString().slice(0, 10);
          if (pDate < thirtyDaysAgo) return false;
        }

        if (filters.datePreset === "custom") {
          if (filters.customStartDate && pDate < filters.customStartDate) return false;
          if (filters.customEndDate && pDate > filters.customEndDate) return false;
        }

        return true;
      })
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        const matchesRef =
          p.id.toLowerCase().includes(q) || p.key.toLowerCase().includes(q);
        const matchesRecipient =
          p.recipientName?.toLowerCase().includes(q) || false;
        const inv = data.invoices.find((i) => p.invoiceIds.includes(i.id));
        const stud = data.students.find((s) => s.id === inv?.studentId);
        const matchesStudent = stud?.name.toLowerCase().includes(q) || false;
        return matchesRef || matchesRecipient || matchesStudent;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [data.payments, data.invoices, data.students, filters, search, currentTimestamp]);

  // Group by date
  const groupedPayments = useMemo(() => {
    const todayStr = new Date(currentTimestamp).toISOString().slice(0, 10);
    const yesterdayStr = new Date(currentTimestamp - 86400000).toISOString().slice(0, 10);

    const today: Payment[] = [];
    const yesterday: Payment[] = [];
    const earlier: Payment[] = [];

    filteredPayments.forEach((p) => {
      const pDate = p.createdAt.slice(0, 10);
      if (pDate === todayStr) today.push(p);
      else if (pDate === yesterdayStr) yesterday.push(p);
      else earlier.push(p);
    });

    return [
      { title: "Today", data: today },
      { title: "Yesterday", data: yesterday },
      { title: "Earlier This Term", data: earlier },
    ].filter((g) => g.data.length > 0);
  }, [filteredPayments, currentTimestamp]);

  return (
    <Screen
      title="Transaction History"
      subtitle="Institutional Ledger & Settlements"
      back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
    >
      <View style={styles.content}>
        {/* Search Bar + Filter Icon Button Beside It */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Field
              placeholder="Search by student, staff, or reference ID…"
              value={search}
              onChangeText={setSearch}
              icon="search"
              clearable
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter transactions"
            onPress={() => setFilterSheetOpen(true)}
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
          >
            <Icon
              name="filter"
              size={18}
              color={activeFilterCount > 0 ? colors.white : colors.navy}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Teacher Class Scope Notice */}
        {isTeacherScoped && (
          <View style={styles.teacherScopeBanner}>
            <Icon name="verify" size={14} color={colors.navy} filled />
            <Text style={styles.teacherScopeText}>
              Class Scope: {teacherClasses.length > 0 ? teacherClasses.join(", ") : "Assigned Classroom"} · Limited Access
            </Text>
          </View>
        )}

        {/* Active Filter Chips Strip */}
        {activeFilterCount > 0 && (
          <View style={styles.activeChipsRow}>
            {filters.flow !== "all" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeChipText}>Flow: {filters.flow}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, flow: "all" }))}>
                  <Icon name="close" size={12} color={colors.navy} />
                </Pressable>
              </View>
            )}

            {filters.status !== "all" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeChipText}>Status: {filters.status}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, status: "all" }))}>
                  <Icon name="close" size={12} color={colors.navy} />
                </Pressable>
              </View>
            )}

            {filters.method !== "all" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeChipText}>Channel: {filters.method}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, method: "all" }))}>
                  <Icon name="close" size={12} color={colors.navy} />
                </Pressable>
              </View>
            )}

            {filters.className && filters.className !== "all" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeChipText}>Class: {filters.className}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, className: "all" }))}>
                  <Icon name="close" size={12} color={colors.navy} />
                </Pressable>
              </View>
            )}

            {filters.datePreset !== "all" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeChipText}>Date: {filters.datePreset}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, datePreset: "all" }))}>
                  <Icon name="close" size={12} color={colors.navy} />
                </Pressable>
              </View>
            )}

            <Pressable onPress={() => setFilters(DEFAULT_FILTERS)} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          </View>
        )}

        {/* Transaction Grouped List */}
        {groupedPayments.length === 0 ? (
          <EmptyState
            title="No Transactions Found"
            subtitle="No financial records match your current search or filter parameters."
            icon="receipt"
          />
        ) : (
          groupedPayments.map((group) => (
            <View key={group.title} style={styles.groupWrap}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Card style={styles.listCard}>
                {group.data.map((p, idx) => {
                  const isPayout = p.type === "payout";
                  const inv = data.invoices.find((i) =>
                    p.invoiceIds.includes(i.id),
                  );
                  const stud = data.students.find((s) => s.id === inv?.studentId);

                  const title =
                    p.recipientName ||
                    (stud
                      ? `${stud.name} (${stud.className})`
                      : "Tuition Settlement");

                  const subtitle = `${
                    isPayout
                      ? "Treasury Disbursement"
                      : p.method === "card"
                      ? "Online Card Payment"
                      : "Direct Bank Wire"
                  } · Ref: ${p.id.slice(0, 10)}`;

                  const isLast = idx === group.data.length - 1;

                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={`View transaction ${title}`}
                      onPress={() =>
                        router.push({
                          pathname: "/transaction-detail",
                          params: { id: p.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.itemRow,
                        pressed && styles.itemRowPressed,
                        !isLast && styles.itemBorderBottom,
                      ]}
                    >
                      <View
                        style={[
                          styles.directionIconBox,
                          isPayout
                            ? styles.directionOutflow
                            : styles.directionInflow,
                        ]}
                      >
                        <Icon
                          name={isPayout ? "logout" : "card"}
                          size={18}
                          color={isPayout ? colors.red : colors.greenDark}
                        />
                      </View>

                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text style={styles.itemSubtitle} numberOfLines={1}>
                          {subtitle}
                        </Text>
                      </View>

                      <View style={styles.itemAmountCol}>
                        <Text
                          style={[
                            styles.amountText,
                            isPayout ? styles.amountOutflow : styles.amountInflow,
                          ]}
                        >
                          {isPayout ? "-" : "+"}
                          {money(p.amount)}
                        </Text>
                        <Badge
                          text={p.state.toUpperCase()}
                          tone={
                            p.state === "settled"
                              ? "success"
                              : p.state === "awaiting confirmation"
                              ? "warning"
                              : "neutral"
                          }
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          ))
        )}
      </View>

      {/* Filter Bottom Sheet */}
      <TransactionFilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        availableClasses={availableClasses}
        onApply={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.white,
  },
  activeChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: -4,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.slate100,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
  },
  activeChipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.navy,
    textTransform: "capitalize",
  },
  clearAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearAllText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  groupWrap: {
    gap: spacing.xs,
  },
  groupTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
  listCard: {
    padding: 0,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: 12,
  },
  itemRowPressed: {
    backgroundColor: colors.slate50,
  },
  itemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  directionIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  directionInflow: {
    backgroundColor: colors.greenLight,
  },
  directionOutflow: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  itemSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  itemAmountCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  amountText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  amountInflow: {
    color: colors.greenDark,
  },
  amountOutflow: {
    color: colors.red,
  },
  teacherScopeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teacherScopeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
});
