import React, { useState, useMemo } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Avatar, Badge, Button, Card, EmptyState, Field, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { balance, money, Student } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";

export interface ParentDossier {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  children: Student[];
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
}

export function ParentsScreen() {
  const { data, refresh } = useSchool();
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "outstanding" | "settled">("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      refresh();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  // Compile all classroom arms
  const classNames = useMemo(() => {
    const set = new Set<string>();
    data.classes.forEach((c) => set.add(c.name));
    data.students.forEach((s) => {
      if (s.className) set.add(s.className);
      s.classes?.forEach((sc) => set.add(sc));
    });
    return Array.from(set).sort();
  }, [data.classes, data.students]);

  // Aggregate Parents Dossiers from Students & Memberships
  const parentsList = useMemo<ParentDossier[]>(() => {
    const parentMap = new Map<string, ParentDossier>();

    // 1. First index students with guardian info
    data.students.forEach((st) => {
      const gId = st.guardianId || (st.guardianPhone ? `gua-${st.guardianPhone.replace(/[^0-9]/g, "").slice(-6)}` : "demo-parent");
      const gName = st.guardianName || (st.lastName ? `${st.lastName} Family Guardian` : `Parent of ${st.name}`);

      if (!parentMap.has(gId)) {
        parentMap.set(gId, {
          id: gId,
          name: gName,
          relationship: st.guardianRelationship || "Guardian / Parent",
          phone: st.guardianPhone || "+234 803 291 8492",
          email: st.guardianEmail || `${gId}@schoolday.ng`,
          children: [],
          totalInvoiced: 0,
          totalPaid: 0,
          totalOutstanding: 0,
        });
      }

      const dossier = parentMap.get(gId)!;
      if (!dossier.children.some((c) => c.id === st.id)) {
        dossier.children.push(st);
      }

      // Compute student's invoices
      const studentInvoices = data.invoices.filter((i) => i.studentId === st.id);
      studentInvoices.forEach((inv) => {
        const invTotal = inv.items.reduce((sum, item) => sum + item.amount, 0);
        dossier.totalInvoiced += invTotal;
        dossier.totalPaid += inv.paid;
        dossier.totalOutstanding += balance(inv);
      });
    });

    // 2. Also incorporate registered parent memberships
    data.memberships
      .filter((m) => m.roles.includes("parent"))
      .forEach((m) => {
        if (!parentMap.has(m.userId)) {
          // Find matching wards by userId or phone
          const wards = data.students.filter((st) => st.guardianId === m.userId);
          let totalInv = 0;
          let totalPd = 0;
          let totalOut = 0;

          wards.forEach((w) => {
            const studentInvoices = data.invoices.filter((i) => i.studentId === w.id);
            studentInvoices.forEach((inv) => {
              totalInv += inv.items.reduce((sum, item) => sum + item.amount, 0);
              totalPd += inv.paid;
              totalOut += balance(inv);
            });
          });

          parentMap.set(m.userId, {
            id: m.userId,
            name: m.name,
            relationship: "Registered Parent",
            phone: "+234 802 345 6789",
            email: `${m.userId}@parent.schoolday.ng`,
            children: wards,
            totalInvoiced: totalInv,
            totalPaid: totalPd,
            totalOutstanding: totalOut,
          });
        }
      });

    return Array.from(parentMap.values());
  }, [data.students, data.invoices, data.memberships]);

  // Filter & Search
  const filteredParents = useMemo(() => {
    return parentsList.filter((p) => {
      // Outstanding status filter
      if (selectedFilter === "outstanding" && p.totalOutstanding <= 0) return false;
      if (selectedFilter === "settled" && p.totalOutstanding > 0) return false;

      // Class filter
      if (selectedClass !== "all") {
        const hasChildInClass = p.children.some(
          (c) =>
            c.className?.toLowerCase() === selectedClass.toLowerCase() ||
            c.classes?.some((cc) => cc.toLowerCase() === selectedClass.toLowerCase()),
        );
        if (!hasChildInClass) return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = p.phone?.toLowerCase().includes(q) || false;
        const matchesEmail = p.email?.toLowerCase().includes(q) || false;
        const matchesChild = p.children.some((c) => c.name.toLowerCase().includes(q));
        return matchesName || matchesPhone || matchesEmail || matchesChild;
      }

      return true;
    });
  }, [parentsList, selectedFilter, selectedClass, search]);

  const totalOutstandingSum = useMemo(() => {
    return parentsList.reduce((sum, p) => sum + p.totalOutstanding, 0);
  }, [parentsList]);

  return (
    <Screen
      title="Parents & Guardians"
      subtitle="Directory of registered guardians & linked pupils"
      back={() => (router.canGoBack() ? router.back() : router.replace("/home" as any))}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Metric Summary Cards */}
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <View style={styles.metricTop}>
              <Icon name="profile" size={16} color={colors.navy} />
              <Badge text="DIRECTORY" tone="purple" />
            </View>
            <Text style={styles.metricVal}>{parentsList.length}</Text>
            <Text style={styles.metricLabel}>Total Guardians</Text>
          </Card>

          <Card style={styles.metricCard}>
            <View style={styles.metricTop}>
              <Icon name="wallet" size={16} color={colors.orange} />
              <Badge text="OUTSTANDING" tone="warning" />
            </View>
            <Text style={[styles.metricVal, { color: colors.orange }]}>
              {money(totalOutstandingSum)}
            </Text>
            <Text style={styles.metricLabel}>Total Due Fees</Text>
          </Card>
        </View>

        {/* Search Bar */}
        <Field
          placeholder="Search by parent name, phone, or child's name…"
          value={search}
          onChangeText={setSearch}
          icon="search"
          clearable
        />

        {/* Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {[
              { id: "all" as const, label: `All Guardians (${parentsList.length})` },
              {
                id: "outstanding" as const,
                label: `With Due Fees (${parentsList.filter((p) => p.totalOutstanding > 0).length})`,
              },
              {
                id: "settled" as const,
                label: `Fully Settled (${parentsList.filter((p) => p.totalOutstanding <= 0).length})`,
              },
            ].map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setSelectedFilter(f.id)}
                style={[
                  styles.filterChip,
                  selectedFilter === f.id && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === f.id && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Class filter horizontal chips */}
          {classNames.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <Pressable
                onPress={() => setSelectedClass("all")}
                style={[
                  styles.classChip,
                  selectedClass === "all" && styles.classChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.classChipText,
                    selectedClass === "all" && styles.classChipTextActive,
                  ]}
                >
                  All Classes
                </Text>
              </Pressable>
              {classNames.map((cls) => (
                <Pressable
                  key={cls}
                  onPress={() => setSelectedClass(cls)}
                  style={[
                    styles.classChip,
                    selectedClass === cls && styles.classChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.classChipText,
                      selectedClass === cls && styles.classChipTextActive,
                    ]}
                  >
                    {cls}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Parents List */}
        {filteredParents.length === 0 ? (
          <EmptyState
            title="No Parents Found"
            subtitle="No guardians match your current search query or filter selection."
            icon="profile"
          />
        ) : (
          <View style={styles.listContainer}>
            {filteredParents.map((parent) => {
              const hasDue = parent.totalOutstanding > 0;

              return (
                <Pressable
                  key={parent.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View dossier for ${parent.name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/parent-detail",
                      params: { id: parent.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.parentCard,
                    shadows.sm,
                    pressed && styles.parentCardPressed,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <Avatar name={parent.name} size={46} role="parent" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.parentName} numberOfLines={1}>
                            {parent.name}
                          </Text>
                          <Badge text="GUARDIAN" tone="purple" />
                        </View>
                        <Text style={styles.parentContact} numberOfLines={1}>
                          {parent.phone} {parent.email ? `· ${parent.email}` : ""}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron" size={16} color={colors.slate400} />
                  </View>

                  {/* Linked Wards / Children */}
                  <View style={styles.childrenSection}>
                    <Text style={styles.childrenTitle}>LINKED WARDS / PUPILS:</Text>
                    <View style={styles.childrenChipsWrap}>
                      {parent.children.length === 0 ? (
                        <Text style={styles.noChildrenText}>No linked pupils recorded</Text>
                      ) : (
                        parent.children.map((child) => (
                          <View key={child.id} style={styles.childChip}>
                            <Icon name="student" size={12} color={colors.navy} />
                            <Text style={styles.childChipName} numberOfLines={1}>
                              {child.name}
                            </Text>
                            <Text style={styles.childChipClass}>({child.className})</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>

                  {/* Financial Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.feeInfoCol}>
                      <Text style={styles.feeLabel}>Tuition Status</Text>
                      <Text
                        style={[
                          styles.feeVal,
                          hasDue ? styles.feeValDue : styles.feeValPaid,
                        ]}
                      >
                        {hasDue
                          ? `${money(parent.totalOutstanding)} Due`
                          : "Fully Cleared · ₦0 Due"}
                      </Text>
                    </View>

                    <View style={styles.quickActionButtons}>
                      {parent.phone && (
                        <Pressable
                          onPress={() => Linking.openURL(`tel:${parent.phone}`)}
                          style={styles.quickIconBtn}
                          accessibilityLabel="Call Parent"
                        >
                          <Icon name="phone" size={15} color={colors.navy} />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/parent-detail",
                            params: { id: parent.id },
                          })
                        }
                        style={styles.viewDossierBtn}
                      >
                        <Text style={styles.viewDossierText}>Manage</Text>
                        <Icon name="forward" size={12} color={colors.orange} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 100,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricVal: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
    marginTop: 4,
  },
  metricLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  filterSection: {
    gap: 8,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  classChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  classChipActive: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orange,
  },
  classChipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate600,
  },
  classChipTextActive: {
    color: colors.orange,
    fontFamily: fonts.bold,
  },
  listContainer: {
    gap: spacing.md,
  },
  parentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  parentCardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  parentName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  parentContact: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  childrenSection: {
    gap: 6,
    backgroundColor: colors.slate100,
    padding: 10,
    borderRadius: radii.md,
  },
  childrenTitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  childrenChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  childChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childChipName: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  childChipClass: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  noChildrenText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  feeInfoCol: {
    gap: 2,
  },
  feeLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  feeVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  feeValDue: {
    color: colors.orange,
  },
  feeValPaid: {
    color: colors.greenDark,
  },
  quickActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickIconBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  viewDossierBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orangeLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
  },
  viewDossierText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
});
