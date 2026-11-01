import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  colors,
  fonts,
  money,
  shadows,
} from "../../components/ui";
import { Icon } from "../../components/Icon";
import { TopBar } from "../../components/TopBar";
import { balance, invoiceStatus, total, Invoice, Student } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";

interface DefaulterRecord {
  student: Student;
  invoices: Invoice[];
  totalInvoicedKobo: number;
  totalPaidKobo: number;
  totalBalanceKobo: number;
  daysOverdue: number;
  isOverdue: boolean;
  statusText: string;
  guardianName: string;
  guardianPhone: string;
  lastReminderNotice?: {
    id: string;
    title: string;
    at: string;
  };
}

import { DefaulterAutomationModal } from "./components/DefaulterAutomationModal";

export function DefaultersScreen() {
  const { data, context, services, act, busy, school } = useSchool();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "overdue" | "unpaid" | "partial"
  >("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [automationOpen, setAutomationOpen] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  // Aggregate defaulters from invoices and students
  const defaulters: DefaulterRecord[] = useMemo(() => {
    const studentMap = new Map<string, Student>();
    for (const s of data.students) {
      studentMap.set(s.id, s);
    }

    // Group unpaid invoices by studentId
    const invoicesByStudent = new Map<string, Invoice[]>();
    for (const inv of data.invoices) {
      if (balance(inv) > 0) {
        const list = invoicesByStudent.get(inv.studentId) || [];
        list.push(inv);
        invoicesByStudent.set(inv.studentId, list);
      }
    }

    const records: DefaulterRecord[] = [];

    invoicesByStudent.forEach((invoices, studentId) => {
      const student = studentMap.get(studentId);
      if (!student) return;

      const totalInvoicedKobo = invoices.reduce((sum, i) => sum + total(i), 0);
      const totalPaidKobo = invoices.reduce((sum, i) => sum + i.paid, 0);
      const totalBalanceKobo = invoices.reduce((sum, i) => sum + balance(i), 0);

      // Find max days overdue across invoices
      let maxDaysOverdue = 0;
      let hasOverdue = false;

      for (const inv of invoices) {
        if (inv.due < todayIso) {
          hasOverdue = true;
          const dueTime = new Date(inv.due).getTime();
          const days = Math.max(0, Math.floor((nowMs - dueTime) / (1000 * 3600 * 24)));
          if (days > maxDaysOverdue) {
            maxDaysOverdue = days;
          }
        }
      }

      // Find last notice sent for this student
      const notices = (data.notices || [])
        .filter((n) => n.target === "fees" && n.recordId === student.id)
        .sort((a, b) => b.at.localeCompare(a.at));
      const lastReminderNotice = notices[0];

      let statusText = "Pending Due";
      if (hasOverdue) {
        statusText = `Overdue (${maxDaysOverdue}d)`;
      } else if (totalPaidKobo > 0) {
        statusText = "Partially Paid";
      } else {
        statusText = "Unpaid";
      }

      const parentMembership = data.memberships.find(
        (m) => m.userId === student.guardianId,
      );
      const guardianName = parentMembership?.name || "Verified Guardian";

      records.push({
        student,
        invoices,
        totalInvoicedKobo,
        totalPaidKobo,
        totalBalanceKobo,
        daysOverdue: maxDaysOverdue,
        isOverdue: hasOverdue,
        statusText,
        guardianName,
        guardianPhone: student.guardianPhone || "08012345678",
        lastReminderNotice,
      });
    });

    // Default sort: highest balance first
    records.sort((a, b) => b.totalBalanceKobo - a.totalBalanceKobo);
    return records;
  }, [data.students, data.invoices, data.notices, data.memberships, todayIso, nowMs]);

  // Available classes for filtering
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    for (const d of defaulters) {
      if (d.student.className) {
        set.add(d.student.className);
      }
    }
    return Array.from(set).sort();
  }, [defaulters]);

  // Filtered defaulters
  const filteredDefaulters = useMemo(() => {
    return defaulters.filter((d) => {
      // Search
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = d.student.name.toLowerCase().includes(q);
        const matchesClass = d.student.className?.toLowerCase().includes(q);
        const matchesId = d.student.id.toLowerCase().includes(q);
        const matchesGuardian = d.guardianName.toLowerCase().includes(q);
        const matchesPhone = d.guardianPhone.toLowerCase().includes(q);
        if (!matchesName && !matchesClass && !matchesId && !matchesGuardian && !matchesPhone) {
          return false;
        }
      }

      // Severity filter
      if (severityFilter === "overdue" && !d.isOverdue) return false;
      if (severityFilter === "unpaid" && d.totalPaidKobo > 0) return false;
      if (severityFilter === "partial" && (d.totalPaidKobo === 0 || d.totalBalanceKobo === 0))
        return false;

      // Class filter
      if (selectedClass !== "all" && d.student.className !== selectedClass) return false;

      return true;
    });
  }, [defaulters, search, severityFilter, selectedClass]);

  // Overall KPIs
  const totalDebtKobo = defaulters.reduce((sum, d) => sum + d.totalBalanceKobo, 0);
  const totalRemindersSent = (data.notices || []).filter((n) => n.target === "fees").length;

  // Single reminder action
  const handleSendReminder = async (record: DefaulterRecord) => {
    const primaryInvoice = record.invoices[0];
    if (!primaryInvoice) return;

    setSendingInvoiceId(primaryInvoice.id);
    try {
      await act(
        () => services.remind(context, primaryInvoice.id),
        `Reminder dispatched to ${record.guardianName} (${record.student.name})`,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch reminder notice.");
    } finally {
      setSendingInvoiceId(null);
    }
  };

  // Call guardian action
  const handleCallGuardian = (phone: string, studentName: string) => {
    if (!phone) {
      Alert.alert("Contact Missing", `No phone number on record for ${studentName}'s guardian.`);
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Cannot Place Call", `Unable to open phone dialer for ${phone}.`);
    });
  };

  // SMS guardian action
  const handleSmsGuardian = (record: DefaulterRecord) => {
    const phone = record.guardianPhone.replace(/[^0-9+]/g, "");
    const msg = `Dear ${record.guardianName}, this is an official fee reminder from ${school.name}. Outstanding tuition balance for ${record.student.name} (${record.student.className}) is ${money(record.totalBalanceKobo)}. Kindly settle immediately.`;
    const url = `sms:${phone}?body=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Cannot Open SMS", "Unable to open default messaging app.");
    });
  };

  // Bulk broadcast reminders
  const handleBroadcastReminders = () => {
    const targetDefaulters = filteredDefaulters.filter((d) => d.invoices.length > 0);
    if (targetDefaulters.length === 0) {
      Alert.alert("No Defaulters", "There are no defaulters matching the current filter.");
      return;
    }

    Alert.alert(
      "Broadcast Fee Reminders",
      `Are you sure you want to dispatch official reminders to ${targetDefaulters.length} pupil guardians with outstanding balances totaling ${money(
        targetDefaulters.reduce((sum, d) => sum + d.totalBalanceKobo, 0),
      )}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Send (${targetDefaulters.length})`,
          style: "destructive",
          onPress: async () => {
            let sentCount = 0;
            await act(async () => {
              for (const def of targetDefaulters) {
                const inv = def.invoices[0];
                if (inv) {
                  try {
                    await services.remind(context, inv.id);
                    sentCount++;
                  } catch (e) {
                    // Continue with next invoice
                  }
                }
              }
            }, `Dispatched ${sentCount} fee reminders successfully.`);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <TopBar
        title="Fee Defaulters & Reminders"
        subtitle="Tuition Tracking & Debt Recovery"
        back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
        rightAction={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Automate Reminders"
              onPress={() => setAutomationOpen(true)}
              style={({ pressed }) => [
                styles.broadcastTopBtn,
                { backgroundColor: colors.navy },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Icon name="clock" size={15} color={colors.white} />
              <Text style={styles.broadcastTopBtnText}>Automate</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Broadcast Reminders"
              onPress={handleBroadcastReminders}
              style={({ pressed }) => [
                styles.broadcastTopBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Icon name="sms" size={15} color={colors.white} />
              <Text style={styles.broadcastTopBtnText}>Broadcast</Text>
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* KPI Summary Cards Strip */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCardHero}>
            <View style={styles.kpiCardRow}>
              <View style={styles.kpiIconWrapDark}>
                <Icon name="wallet" size={18} color={colors.orange} />
              </View>
              <Badge text="TOTAL UNCOLLECTED" tone="warning" dot />
            </View>
            <Text style={styles.kpiHeroAmount}>{money(totalDebtKobo)}</Text>
            <Text style={styles.kpiHeroSub}>
              Accumulated outstanding fees across all grade levels
            </Text>
          </Card>

          <View style={styles.kpiSubRow}>
            <Card style={styles.kpiCardMini}>
              <View style={styles.kpiMiniHeader}>
                <View style={styles.kpiIconWrapLight}>
                  <Icon name="people" size={16} color={colors.navy} />
                </View>
                <Text style={styles.kpiMiniVal}>{defaulters.length}</Text>
              </View>
              <Text style={styles.kpiMiniLabel}>Indebted Students</Text>
              <Text style={styles.kpiMiniSub}>
                {data.students.length > 0
                  ? `${Math.round((defaulters.length / data.students.length) * 100)}% of total enrollment`
                  : "0%"}
              </Text>
            </Card>

            <Card style={styles.kpiCardMini}>
              <View style={styles.kpiMiniHeader}>
                <View style={styles.kpiIconWrapLight}>
                  <Icon name="verify" size={16} color={colors.green} />
                </View>
                <Text style={styles.kpiMiniVal}>{totalRemindersSent}</Text>
              </View>
              <Text style={styles.kpiMiniLabel}>Reminders Sent</Text>
              <Text style={styles.kpiMiniSub}>Automated SMS & notice triggers</Text>
            </Card>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <Field
            label=""
            placeholder="Search by pupil, guardian, phone or class…"
            value={search}
            onChangeText={setSearch}
            icon="search"
          />
        </View>

        {/* Severity Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipScroll}
        >
          {[
            { key: "all", label: `All Defaulters (${defaulters.length})` },
            {
              key: "overdue",
              label: `Overdue (${defaulters.filter((d) => d.isOverdue).length})`,
            },
            {
              key: "unpaid",
              label: `100% Unpaid (${defaulters.filter((d) => d.totalPaidKobo === 0).length})`,
            },
            {
              key: "partial",
              label: `Partial Paid (${defaulters.filter((d) => d.totalPaidKobo > 0).length})`,
            },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setSeverityFilter(item.key as any)}
              style={[
                styles.filterChip,
                severityFilter === item.key && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  severityFilter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Classroom Filter Chips */}
        {availableClasses.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipScroll}
          >
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
            {availableClasses.map((cls) => (
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

        {/* Defaulter Cards List */}
        {filteredDefaulters.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Icon name="verify" size={32} color={colors.greenDark} filled />
            </View>
            <Text style={styles.emptyTitle}>Zero Outstanding Defaulters</Text>
            <Text style={styles.emptySub}>
              {search || severityFilter !== "all" || selectedClass !== "all"
                ? "No pupils with unpaid invoices match your filter criteria."
                : "All students are up to date on tuition and school fee settlements."}
            </Text>
          </Card>
        ) : (
          filteredDefaulters.map((record) => {
            const percentPaid =
              record.totalInvoicedKobo > 0
                ? Math.round((record.totalPaidKobo / record.totalInvoicedKobo) * 100)
                : 0;

            const isCurrentSending = record.invoices.some(
              (inv) => inv.id === sendingInvoiceId,
            );

            return (
              <Card key={record.student.id} style={styles.defaulterCard}>
                {/* Header Row: Student Identity */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.studentInfoLeft}>
                    <Avatar name={record.student.name} size={44} />
                    <View style={styles.studentTextGroup}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {record.student.name}
                      </Text>
                      <Text style={styles.studentClass}>
                        {record.student.className} · ID: {record.student.id}
                      </Text>
                    </View>
                  </View>

                  <Badge
                    text={record.statusText.toUpperCase()}
                    tone={record.isOverdue ? "danger" : record.totalPaidKobo > 0 ? "warning" : "neutral"}
                    dot={record.isOverdue}
                  />
                </View>

                {/* Financial Progress Bar */}
                <View style={styles.balanceContainer}>
                  <View style={styles.balanceHeaderRow}>
                    <View>
                      <Text style={styles.balanceLabel}>OUTSTANDING BALANCE</Text>
                      <Text style={styles.balanceAmount}>
                        {money(record.totalBalanceKobo)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.balanceLabel}>TOTAL BILLED</Text>
                      <Text style={styles.totalBilledAmount}>
                        {money(record.totalInvoicedKobo)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress track */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.max(0, percentPaid))}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressMetaRow}>
                    <Text style={styles.progressMetaText}>
                      {percentPaid}% cleared · {money(record.totalPaidKobo)} paid
                    </Text>
                    {record.daysOverdue > 0 && (
                      <Text style={styles.overdueMetaText}>
                        {record.daysOverdue} days past due
                      </Text>
                    )}
                  </View>
                </View>

                {/* Guardian Details Row */}
                <View style={styles.guardianRow}>
                  <View style={styles.guardianInfoCol}>
                    <Text style={styles.guardianLabel}>GUARDIAN CONTACT</Text>
                    <Text style={styles.guardianName}>{record.guardianName}</Text>
                    <Text style={styles.guardianPhone}>{record.guardianPhone}</Text>
                  </View>

                  {record.lastReminderNotice && (
                    <View style={styles.reminderNoticeTag}>
                      <Icon name="sms" size={13} color={colors.indigo} />
                      <Text style={styles.reminderNoticeText}>
                        Last notice:{" "}
                        {new Date(record.lastReminderNotice.at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons Row */}
                <View style={styles.cardActionsRow}>
                  <Button
                    title={isCurrentSending ? "Sending…" : "Send Reminder"}
                    icon="sms"
                    variant="primary"
                    size="sm"
                    loading={isCurrentSending}
                    disabled={busy || isCurrentSending}
                    onPress={() => handleSendReminder(record)}
                  />

                  <Button
                    title="Call"
                    icon="call"
                    variant="outline"
                    size="sm"
                    onPress={() =>
                      handleCallGuardian(record.guardianPhone, record.student.name)
                    }
                  />

                  <Button
                    title="SMS"
                    icon="send"
                    variant="outline"
                    size="sm"
                    onPress={() => handleSmsGuardian(record)}
                  />

                  <Button
                    title="Invoices"
                    icon="receipt"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      router.push({
                        pathname: "/fees",
                        params: { child: record.student.id },
                      })
                    }
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Defaulter Automation Modal */}
      <DefaulterAutomationModal
        visible={automationOpen}
        onClose={() => setAutomationOpen(false)}
        defaulters={defaulters}
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
    padding: 16,
    gap: 16,
    paddingBottom: 48,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  broadcastTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  broadcastTopBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  kpiGrid: {
    gap: 10,
  },
  kpiCardHero: {
    backgroundColor: colors.navyDark,
    padding: 18,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.navyBorder,
  },
  kpiCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiIconWrapDark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiHeroAmount: {
    fontFamily: fonts.extra,
    fontSize: 32,
    color: colors.white,
    letterSpacing: -0.5,
  },
  kpiHeroSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#94a3b8",
  },
  kpiSubRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCardMini: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    gap: 4,
    backgroundColor: colors.surface,
  },
  kpiMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiIconWrapLight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiMiniVal: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
  },
  kpiMiniLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
    marginTop: 2,
  },
  kpiMiniSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  searchWrap: {
    marginTop: -4,
  },
  filterChipScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.muted,
  },
  filterChipTextActive: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  classChipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.navy,
  },
  classChipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  classChipTextActive: {
    color: colors.navy,
    fontFamily: fonts.bold,
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 280,
  },
  defaulterCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  studentTextGroup: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  studentClass: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  balanceContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  balanceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  balanceLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  balanceAmount: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.redDark,
  },
  totalBilledAmount: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  progressMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressMetaText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  overdueMetaText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.red,
  },
  guardianRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  guardianInfoCol: {
    gap: 2,
  },
  guardianLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  guardianName: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.navy,
  },
  guardianPhone: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  reminderNoticeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.indigoLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reminderNoticeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.indigo,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
});
