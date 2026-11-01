import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  colors,
  fonts,
  radii,
  shadows,
  spacing,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { DigitalIdSheet } from "../components/DigitalIdSheet";
import { useSchool } from "../providers/AppProvider";
import { Student, StudentAttendance, money, balance, total } from "../domain/model";
import { isTeacherAuthorizedForStudent } from "./teacher/utils/teacherClass";

type StudentTab = "academics" | "attendance" | "guardian" | "fees";
type SessionType = "morning" | "afternoon";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function StudentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { data, context, school, services, refresh } = useSchool();
  const params = useLocalSearchParams<{ id?: string; classId?: string }>();
  const studentId = params.id;

  const [activeTab, setActiveTab] = useState<StudentTab>("academics");
  const [digitalIdVisible, setDigitalIdVisible] = useState(false);

  // Quick mark attendance state
  const todayDateObj = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => todayDateObj.toISOString().slice(0, 10), [todayDateObj]);
  const [quickMarkSession, setQuickMarkSession] = useState<SessionType>(() => {
    return new Date().getHours() < 12 ? "morning" : "afternoon";
  });
  const [isMarkingLoading, setIsMarkingLoading] = useState(false);

  // Attendance calendar navigation state
  const [calYear, setCalYear] = useState(() => todayDateObj.getFullYear());
  const [calMonth, setCalMonth] = useState(() => todayDateObj.getMonth());
  const [selectedTerm, setSelectedTerm] = useState<string>("All Terms");
  const [inspectDayStr, setInspectDayStr] = useState<string | null>(null);

  // Fee payment & receipt state
  const [paySheetVisible, setPaySheetVisible] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payTargetInvoiceId, setPayTargetInvoiceId] = useState<string | null>(null);
  const [payCategory, setPayCategory] = useState("Tuition & School Levies");
  const [payMethod, setPayMethod] = useState<"card" | "transfer" | "ussd">("transfer");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // 1. Strict student lookup without fallback
  const student = useMemo(() => {
    return studentId ? data.students.find((s) => s.id === studentId) : undefined;
  }, [studentId, data.students]);

  // Authorization check
  const isAuthorized = useMemo(() => {
    if (!student) return false;
    return isTeacherAuthorizedForStudent(
      student,
      context.role,
      context.userId,
      data.classes || [],
      data.staff || []
    );
  }, [student, context.role, context.userId, data.classes, data.staff]);

  const canMarkAttendance =
    context.role === "owner" ||
    context.role === "admin" ||
    context.role === "teacher";

  // Class lookup
  const studentClass = useMemo(() => {
    if (!student) return undefined;
    return data.classes?.find(
      (c) =>
        c.name === student.className ||
        c.id === params.classId ||
        c.code === student.className
    );
  }, [data.classes, student, params.classId]);

  // Attendance records for this student
  const studentAttendanceRecords = useMemo(() => {
    if (!student) return [];
    return (data.studentAttendance || []).filter(
      (a) => a.studentId === student.id
    );
  }, [data.studentAttendance, student]);

  // Today's attendance records for this student
  const todayStudentRecords = useMemo(() => {
    return studentAttendanceRecords.filter((a) => a.date === todayStr);
  }, [studentAttendanceRecords, todayStr]);

  const todayMorningRecord = todayStudentRecords.find(
    (a) => a.session === "morning" || a.session === "full_day"
  );
  const todayAfternoonRecord = todayStudentRecords.find(
    (a) => a.session === "afternoon"
  );

  const isTodayQuickMarked =
    quickMarkSession === "morning"
      ? !!todayMorningRecord
      : !!todayAfternoonRecord;

  // Calendar days computation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      isWeekend: boolean;
      morning?: StudentAttendance;
      afternoon?: StudentAttendance;
    }[] = [];

    // Empty lead slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: "", isWeekend: false });
    }

    // Month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const monthPadded = String(calMonth + 1).padStart(2, "0");
      const dayPadded = String(d).padStart(2, "0");
      const dateStr = `${calYear}-${monthPadded}-${dayPadded}`;
      const dayOfWeek = new Date(calYear, calMonth, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayRecords = studentAttendanceRecords.filter((a) => {
        if (a.date !== dateStr) return false;
        if (selectedTerm !== "All Terms" && a.term && a.term !== selectedTerm) {
          return false;
        }
        return true;
      });

      const morning = dayRecords.find((a) => a.session === "morning" || a.session === "full_day");
      const afternoon = dayRecords.find((a) => a.session === "afternoon");

      days.push({
        day: d,
        dateStr,
        isWeekend,
        morning,
        afternoon,
      });
    }

    return days;
  }, [calYear, calMonth, studentAttendanceRecords, selectedTerm]);

  // Monthly stats
  const monthlyMetrics = useMemo(() => {
    const monthPadded = String(calMonth + 1).padStart(2, "0");
    const monthPrefix = `${calYear}-${monthPadded}`;

    const monthRecords = studentAttendanceRecords.filter((a) => {
      if (!a.date.startsWith(monthPrefix)) return false;
      if (selectedTerm !== "All Terms" && a.term && a.term !== selectedTerm) return false;
      return true;
    });

    const presentCount = monthRecords.filter((a) => a.status === "present").length;
    const lateCount = monthRecords.filter((a) => a.status === "late").length;
    const absentCount = monthRecords.filter((a) => a.status === "absent").length;
    const totalMarked = monthRecords.length;

    const rate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 100;

    return {
      presentCount,
      lateCount,
      absentCount,
      rate,
      totalMarked,
    };
  }, [studentAttendanceRecords, calYear, calMonth, selectedTerm]);

  // Invoices & Payments (Finance Real Data)
  const isFinanceViewer =
    context.role === "owner" ||
    context.role === "admin" ||
    context.role === "finance" ||
    context.role === "parent" ||
    context.role === "student" ||
    context.role === "teacher";

  const studentInvoices = useMemo(() => {
    if (!student) return [];
    return data.invoices.filter((i) => i.studentId === student.id);
  }, [data.invoices, student]);

  const studentInvoiceIds = useMemo(() => {
    return new Set(studentInvoices.map((i) => i.id));
  }, [studentInvoices]);

  const studentPayments = useMemo(() => {
    if (!student) return [];
    return data.payments.filter(
      (p) =>
        p.invoiceIds?.some((id) => studentInvoiceIds.has(id)) ||
        p.userId === student.id ||
        (p as any).studentId === student.id
    );
  }, [data.payments, student, studentInvoiceIds]);

  const totalBilled = useMemo(() => {
    return studentInvoices.reduce((acc, inv) => acc + total(inv), 0);
  }, [studentInvoices]);

  const totalPaid = useMemo(() => {
    return studentPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [studentPayments]);

  const totalOutstanding = Math.max(0, totalBilled - totalPaid);

  // Group payments by date and class for segmented receipt cards
  const segmentedPayments = useMemo(() => {
    const list = [...studentPayments].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [studentPayments]);

  const openPaymentSheet = (initialNaira?: number, targetInvId?: string | null, category?: string) => {
    setPayTargetInvoiceId(targetInvId || null);
    setPayCategory(category || "Tuition & School Levies");
    setPayAmountInput(initialNaira && initialNaira > 0 ? String(initialNaira) : "");
    setPaySheetVisible(true);
  };

  const handleProcessPayment = async () => {
    if (!student || !context) return;
    const cleanAmount = parseFloat(payAmountInput.replace(/[^0-9.]/g, ""));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      toast.error("Please enter a valid amount greater than ₦0");
      return;
    }
    setIsProcessingPayment(true);
    try {
      await services.recordDirectPayment(context, {
        studentId: student.id,
        amount: Math.round(cleanAmount * 100),
        method: payMethod,
        category: payCategory,
        invoiceId: payTargetInvoiceId || undefined,
      });
      await refresh();
      toast.success(
        `Payment of ₦${cleanAmount.toLocaleString("en-NG")} recorded successfully! Receipt generated.`
      );
      setPaySheetVisible(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to process payment.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Actions
  const handleMarkToday = async (status: "present" | "late" | "absent") => {
    if (!student || !context) return;
    setIsMarkingLoading(true);
    try {
      await services.markStudentAttendance(context, {
        studentId: student.id,
        classId: studentClass?.id || student.className,
        className: student.className,
        date: todayStr,
        session: quickMarkSession,
        status,
      });
      await refresh();
      toast.success(
        `Marked ${student.name} as ${status.toUpperCase()} for ${quickMarkSession} session.`
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark attendance.");
    } finally {
      setIsMarkingLoading(false);
    }
  };

  const handleMarkInspectedDay = async (session: SessionType, status: "present" | "late" | "absent") => {
    if (!student || !context || !inspectDayStr) return;
    if (inspectDayStr > todayStr) {
      toast.error("Cannot record attendance for future dates.");
      return;
    }
    setIsMarkingLoading(true);
    try {
      await services.markStudentAttendance(context, {
        studentId: student.id,
        classId: studentClass?.id || student.className,
        className: student.className,
        date: inspectDayStr,
        session,
        status,
      });
      await refresh();
      toast.success(`Updated attendance for ${inspectDayStr} (${session}) to ${status.toUpperCase()}.`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update attendance.");
    } finally {
      setIsMarkingLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleCallGuardian = () => {
    if (!student) return;
    const phone = student.guardianPhone || "+2348000000000";
    Alert.alert(
      "Contact Guardian",
      `Call the official registered guardian for ${student.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Place Call",
          onPress: () => Linking.openURL(`tel:${phone}`).catch(() => {}),
        },
      ]
    );
  };

  const handleMessageGuardian = () => {
    if (!student) return;
    router.push({
      pathname: "/chat-detail" as any,
      params: {
        id: `direct-guardian-${student.id}`,
        title: `${student.name} · Parent Consultation`,
        type: "direct",
      },
    });
  };

  // Not found guard
  if (!student) {
    return (
      <View style={styles.root}>
        <TopBar
          title="Pupil Profile"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/classes"))}
        />
        <View style={styles.emptyCenter}>
          <Empty
            title="Pupil Record Not Found"
            detail={`No student matching ID "${studentId || "unknown"}" was found in ${school.name}.`}
            actionText="Return to Classrooms"
            onAction={() => (router.canGoBack() ? router.back() : router.replace("/classes"))}
            icon="people"
          />
        </View>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.root}>
        <TopBar
          title="Pupil Profile"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/classes"))}
        />
        <View style={styles.emptyCenter}>
          <Empty
            title="Access Restricted"
            detail="You are not authorized to view this pupil's profile. Only assigned teachers, school administration, and linked guardians can inspect pupil records."
            actionText="Return to Classroom"
            onAction={() => (router.canGoBack() ? router.back() : router.replace("/classes"))}
            icon="lock"
          />
        </View>
      </View>
    );
  }

  const tabs: { key: StudentTab; label: string; icon: any }[] = [
    { key: "academics", label: "Academics", icon: "book" },
    { key: "attendance", label: "Attendance Calendar", icon: "clock" },
    { key: "guardian", label: "Guardian Contact", icon: "people" },
    ...(isFinanceViewer ? [{ key: "fees" as StudentTab, label: "Tuition & Receipts", icon: "wallet" }] : []),
  ];

  // Inspected Day Records
  const inspectedDayRecords = inspectDayStr
    ? studentAttendanceRecords.filter((a) => a.date === inspectDayStr)
    : [];
  const inspectMorning = inspectedDayRecords.find((a) => a.session === "morning" || a.session === "full_day");
  const inspectAfternoon = inspectedDayRecords.find((a) => a.session === "afternoon");

  return (
    <View style={styles.root}>
      {/* 1. Single-Row Inline TopBar */}
      <TopBar
        title="Pupil Profile"
        subtitle={`${student.name} · ${student.className}`}
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={() => setDigitalIdVisible(true)}
            style={styles.qrPassBtn}
            hitSlop={8}
          >
            <Icon name="scan" size={15} color={colors.navy} />
            <Text style={styles.qrPassText}>Digital ID</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Pupil Identity Hero Card */}
        <Card style={[styles.heroCard, shadows.sm]}>
          <View style={styles.heroRow}>
            <Avatar name={student.name} size={52} role="student" />

            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.studentNameText} numberOfLines={1}>{student.name}</Text>
                <Badge text="Active Pupil" tone="success" dot />
              </View>

              <Text style={styles.studentSubText}>
                {student.className} · {student.gender ? `${student.gender} · ` : ""}ID: {student.id}
              </Text>

              <Text style={styles.schoolMottoText}>
                {school.name}
              </Text>
            </View>
          </View>

          {/* Quick Communication Actions */}
          <View style={styles.commActionsRow}>
            <Pressable onPress={handleCallGuardian} style={styles.commBtn}>
              <Icon name="call" size={14} color={colors.navy} />
              <Text style={styles.commBtnText}>Call</Text>
            </Pressable>

            <Pressable onPress={handleMessageGuardian} style={styles.commBtn}>
              <Icon name="sms" size={14} color={colors.navy} />
              <Text style={styles.commBtnText}>Message</Text>
            </Pressable>

            <Pressable onPress={() => setDigitalIdVisible(true)} style={styles.commBtn}>
              <Icon name="verify" size={14} color={colors.navy} />
              <Text style={styles.commBtnText}>Pass</Text>
            </Pressable>
          </View>
        </Card>

        {/* 3. Quick Mark Attendance Card for Proprietor / Teacher */}
        {canMarkAttendance && (
          <Card style={[styles.quickMarkCard, shadows.sm]}>
            <View style={styles.quickMarkHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.quickMarkTitle}>Daily Attendance</Text>
                  {isTodayQuickMarked ? (
                    <Badge
                      text={`${quickMarkSession.toUpperCase()} MARKED`}
                      tone="success"
                      dot
                    />
                  ) : (
                    <Badge text="UNMARKED TODAY" tone="warning" dot />
                  )}
                </View>
                <Text style={styles.quickMarkSub}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })} · Roster Direct Mark
                </Text>
              </View>

              {/* Session Switcher */}
              <View style={styles.sessionPillsWrap}>
                <Pressable
                  style={[
                    styles.sessionPill,
                    quickMarkSession === "morning" && styles.sessionPillActive,
                  ]}
                  onPress={() => setQuickMarkSession("morning")}
                >
                  <Icon
                    name="flash"
                    size={11}
                    color={quickMarkSession === "morning" ? colors.white : colors.slate500}
                  />
                  <Text
                    style={[
                      styles.sessionPillText,
                      quickMarkSession === "morning" && styles.sessionPillTextActive,
                    ]}
                  >
                    Morning
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.sessionPill,
                    quickMarkSession === "afternoon" && styles.sessionPillActive,
                  ]}
                  onPress={() => setQuickMarkSession("afternoon")}
                >
                  <Icon
                    name="clock"
                    size={11}
                    color={quickMarkSession === "afternoon" ? colors.white : colors.slate500}
                  />
                  <Text
                    style={[
                      styles.sessionPillText,
                      quickMarkSession === "afternoon" && styles.sessionPillTextActive,
                    ]}
                  >
                    Afternoon
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Quick Status Mark Buttons */}
            <View style={styles.markActionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isMarkingLoading}
                style={[
                  styles.markBtn,
                  styles.markBtnPresent,
                  ((quickMarkSession === "morning" && todayMorningRecord?.status === "present") ||
                    (quickMarkSession === "afternoon" && todayAfternoonRecord?.status === "present")) &&
                    styles.markBtnActiveBorder,
                ]}
                onPress={() => handleMarkToday("present")}
              >
                <Icon name="check" size={14} color="#ffffff" />
                <Text style={styles.markBtnText}>Present</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isMarkingLoading}
                style={[
                  styles.markBtn,
                  styles.markBtnLate,
                  ((quickMarkSession === "morning" && todayMorningRecord?.status === "late") ||
                    (quickMarkSession === "afternoon" && todayAfternoonRecord?.status === "late")) &&
                    styles.markBtnActiveBorder,
                ]}
                onPress={() => handleMarkToday("late")}
              >
                <Icon name="clock" size={14} color="#ffffff" />
                <Text style={styles.markBtnText}>Late</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isMarkingLoading}
                style={[
                  styles.markBtn,
                  styles.markBtnAbsent,
                  ((quickMarkSession === "morning" && todayMorningRecord?.status === "absent") ||
                    (quickMarkSession === "afternoon" && todayAfternoonRecord?.status === "absent")) &&
                    styles.markBtnActiveBorder,
                ]}
                onPress={() => handleMarkToday("absent")}
              >
                <Icon name="close" size={14} color="#ffffff" />
                <Text style={styles.markBtnText}>Absent</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* 4. Section Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollWrap}
          contentContainerStyle={{ gap: 8 }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
              >
                <Icon
                  name={tab.icon}
                  size={14}
                  color={isActive ? "#ffffff" : colors.navy}
                  filled={isActive}
                />
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* TAB 1: ACADEMICS & CURRICULUM */}
        {activeTab === "academics" && (
          <View style={{ gap: 10 }}>
            <Card style={[styles.sectionCard, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>Curriculum Assessments</Text>
              <Text style={styles.cardHeaderSub}>
                Evaluation records for {student.className}
              </Text>

              <View style={styles.subjectList}>
                {[
                  { subject: "Mathematics", grade: "A", score: "88%" },
                  { subject: "English Language", grade: "A", score: "85%" },
                  { subject: "Basic Science & Tech", grade: "B+", score: "78%" },
                  { subject: "Social & Civic Studies", grade: "A+", score: "92%" },
                ].map((item, idx) => (
                  <View key={idx} style={styles.subjectRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectName}>{item.subject}</Text>
                      <Text style={styles.subjectSub}>Term Continuous Assessment</Text>
                    </View>
                    <Badge text={item.grade} tone="brand" />
                    <Text style={styles.subjectScore}>{item.score}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* TAB 2: INTERACTIVE ATTENDANCE CALENDAR & TERM FILTER */}
        {activeTab === "attendance" && (
          <View style={{ gap: 10 }}>
            {/* Term Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {[
                "All Terms",
                "First Term · 2026/27",
                "Second Term · 2026/27",
                "Third Term · 2026/27",
              ].map((term) => (
                <Pressable
                  key={term}
                  onPress={() => setSelectedTerm(term)}
                  style={[
                    styles.termFilterBtn,
                    selectedTerm === term && styles.termFilterBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.termFilterText,
                      selectedTerm === term && styles.termFilterTextActive,
                    ]}
                  >
                    {term}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Attendance Metrics Strip */}
            <Card style={[styles.attMetricsCard, shadows.sm]}>
              <View style={styles.attMetricItem}>
                <Text style={styles.attMetricVal}>{monthlyMetrics.rate}%</Text>
                <Text style={styles.attMetricLabel}>ATTENDANCE</Text>
              </View>
              <View style={styles.attMetricDivider} />
              <View style={styles.attMetricItem}>
                <Text style={[styles.attMetricVal, { color: colors.greenDark }]}>
                  {monthlyMetrics.presentCount}
                </Text>
                <Text style={styles.attMetricLabel}>PRESENT</Text>
              </View>
              <View style={styles.attMetricDivider} />
              <View style={styles.attMetricItem}>
                <Text style={[styles.attMetricVal, { color: colors.orange }]}>
                  {monthlyMetrics.lateCount}
                </Text>
                <Text style={styles.attMetricLabel}>LATE</Text>
              </View>
              <View style={styles.attMetricDivider} />
              <View style={styles.attMetricItem}>
                <Text style={[styles.attMetricVal, { color: colors.danger }]}>
                  {monthlyMetrics.absentCount}
                </Text>
                <Text style={styles.attMetricLabel}>ABSENT</Text>
              </View>
            </Card>

            {/* Calendar Card */}
            <Card style={[styles.calendarCard, shadows.sm]}>
              {/* Month Navigator Header */}
              <View style={styles.calNavHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={handlePrevMonth}
                  style={styles.calArrowBtn}
                >
                  <Icon name="back" size={16} color={colors.navy} />
                </Pressable>

                <View style={{ alignItems: "center" }}>
                  <Text style={styles.calMonthTitle}>
                    {MONTH_NAMES[calMonth]} {calYear}
                  </Text>
                  {(calMonth !== todayDateObj.getMonth() || calYear !== todayDateObj.getFullYear()) && (
                    <Pressable
                      onPress={() => {
                        setCalMonth(todayDateObj.getMonth());
                        setCalYear(todayDateObj.getFullYear());
                      }}
                    >
                      <Text style={styles.returnTodayText}>Return to Today</Text>
                    </Pressable>
                  )}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  onPress={handleNextMonth}
                  style={styles.calArrowBtn}
                >
                  <Icon name="arrow" size={16} color={colors.navy} />
                </Pressable>
              </View>

              {/* Weekday Names Header */}
              <View style={styles.calWeekdaysRow}>
                {WEEKDAY_NAMES.map((w) => (
                  <Text key={w} style={styles.calWeekdayText}>
                    {w}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.calGrid}>
                {calendarDays.map((item, idx) => {
                  if (item.day === 0) {
                    return <View key={`empty-${idx}`} style={styles.calEmptyCell} />;
                  }

                  const isToday = item.dateStr === todayStr;
                  const hasMorning = !!item.morning;
                  const hasAfternoon = !!item.afternoon;

                  return (
                    <View key={item.dateStr} style={styles.calCell}>
                      <Pressable
                        onPress={() => setInspectDayStr(item.dateStr)}
                        style={[
                          styles.calCellInner,
                          isToday && styles.calCellToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calDayNum,
                            isToday && styles.calDayNumToday,
                            item.isWeekend && styles.calDayNumWeekend,
                          ]}
                        >
                          {item.day}
                        </Text>

                        {/* Session Marker Dots */}
                        <View style={styles.dotsRow}>
                          {hasMorning && (
                            <View
                              style={[
                                styles.calDot,
                                item.morning?.status === "present"
                                  ? styles.dotPresent
                                  : item.morning?.status === "late"
                                  ? styles.dotLate
                                  : styles.dotAbsent,
                              ]}
                            />
                          )}
                          {hasAfternoon && (
                            <View
                              style={[
                                styles.calDot,
                                item.afternoon?.status === "present"
                                  ? styles.dotPresent
                                  : item.afternoon?.status === "late"
                                  ? styles.dotLate
                                  : styles.dotAbsent,
                              ]}
                            />
                          )}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              {/* Calendar Legend */}
              <View style={styles.calLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.calDot, styles.dotPresent]} />
                  <Text style={styles.legendLabel}>Present (AM/PM)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.calDot, styles.dotLate]} />
                  <Text style={styles.legendLabel}>Late</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.calDot, styles.dotAbsent]} />
                  <Text style={styles.legendLabel}>Absent</Text>
                </View>
              </View>
            </Card>

            {/* Recent Attendance Feed */}
            <Card style={[styles.sectionCard, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>Verified Attendance Log</Text>
              <Text style={styles.cardHeaderSub}>
                Recent roll call entries recorded by faculty
              </Text>

              {studentAttendanceRecords.length === 0 ? (
                <View style={{ paddingVertical: spacing.md, alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.medium, color: colors.muted, fontSize: 13 }}>
                    No attendance records logged for this pupil yet.
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 6 }}>
                  {studentAttendanceRecords.slice(0, 10).map((rec) => (
                    <View key={rec.id} style={styles.attLogRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.attLogDate}>{rec.date}</Text>
                        <Text style={styles.attLogMeta}>
                          {rec.session.toUpperCase()} SESSION · Marked by Faculty
                        </Text>
                      </View>
                      <Badge
                        text={rec.status.toUpperCase()}
                        tone={
                          rec.status === "present"
                            ? "success"
                            : rec.status === "late"
                            ? "warning"
                            : "danger"
                        }
                      />
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        )}

        {/* TAB 3: GUARDIAN CONTACT DETAILS */}
        {activeTab === "guardian" && (
          <View style={{ gap: 10 }}>
            <Card style={[styles.sectionCard, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>Authorized Guardian</Text>
              <Text style={styles.cardHeaderSub}>
                Primary emergency & academic contact details
              </Text>

              <View style={styles.guardianInfoBox}>
                <View style={styles.guardianRow}>
                  <Text style={styles.guardianLabel}>GUARDIAN ID</Text>
                  <Text style={styles.guardianVal}>{student.guardianId}</Text>
                </View>

                {student.guardianPhone && (
                  <View style={styles.guardianRow}>
                    <Text style={styles.guardianLabel}>EMERGENCY TELEPHONE</Text>
                    <Text style={styles.guardianVal}>{student.guardianPhone}</Text>
                  </View>
                )}

                {student.guardianEmail && (
                  <View style={styles.guardianRow}>
                    <Text style={styles.guardianLabel}>EMAIL ADDRESS</Text>
                    <Text style={styles.guardianVal}>{student.guardianEmail}</Text>
                  </View>
                )}
              </View>

              <View style={styles.guardianActionWrap}>
                <Button
                  title="Call Registered Guardian"
                  onPress={handleCallGuardian}
                  style={{ height: 42 }}
                />
              </View>
            </Card>
          </View>
        )}

        {/* TAB 4: TUITION FEES & SEGMENTED PAYMENTS HISTORY */}
        {activeTab === "fees" && isFinanceViewer && (
          <View style={{ gap: 10 }}>
            {/* Financial Overview Card */}
            <Card style={[styles.sectionCard, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>Tuition & Dues Summary</Text>
              <Text style={styles.cardHeaderSub}>
                Financial standing for {student.name} ({student.className})
              </Text>

              <View style={styles.feeStatsStrip}>
                <View style={styles.feeStatBox}>
                  <Text style={styles.feeStatVal}>{money(totalBilled)}</Text>
                  <Text style={styles.feeStatLabel}>TOTAL BILLED</Text>
                </View>
                <View style={styles.feeStatDivider} />
                <View style={styles.feeStatBox}>
                  <Text style={[styles.feeStatVal, { color: colors.greenDark }]}>
                    {money(totalPaid)}
                  </Text>
                  <Text style={styles.feeStatLabel}>TOTAL PAID</Text>
                </View>
                <View style={styles.feeStatDivider} />
                <View style={styles.feeStatBox}>
                  <Text
                    style={[
                      styles.feeStatVal,
                      { color: totalOutstanding > 0 ? colors.orange : colors.greenDark },
                    ]}
                  >
                    {money(totalOutstanding)}
                  </Text>
                  <Text style={styles.feeStatLabel}>OUTSTANDING</Text>
                </View>
              </View>

              {/* Payment Action CTAs */}
              <View style={styles.payBtnRow}>
                <Pressable
                  style={[styles.payActionBtn, styles.payActionBtnPrimary]}
                  onPress={() => openPaymentSheet(totalOutstanding > 0 ? totalOutstanding / 100 : 10000)}
                >
                  <Icon name="card" size={15} color="#ffffff" />
                  <Text style={styles.payActionBtnPrimaryText}>
                    {totalOutstanding > 0 ? "Pay Full Balance" : "Advance Payment"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.payActionBtn, styles.payActionBtnSecondary]}
                  onPress={() => openPaymentSheet(totalOutstanding > 0 ? Math.round(totalOutstanding / 200) : 5000)}
                >
                  <Icon name="wallet" size={15} color={colors.navy} />
                  <Text style={styles.payActionBtnSecondaryText}>Part Payment</Text>
                </Pressable>
              </View>
            </Card>

            {/* Invoices Breakdown */}
            {studentInvoices.length > 0 && (
              <Card style={[styles.sectionCard, shadows.sm]}>
                <Text style={styles.cardHeaderTitle}>Invoices & Fee Schedule</Text>
                <Text style={styles.cardHeaderSub}>
                  Itemized dues and fee components
                </Text>

                {studentInvoices.map((inv) => (
                  <View key={inv.id} style={styles.invContainer}>
                    <View style={styles.invHeaderRow}>
                      <View>
                        <Text style={styles.invIdText}>Invoice #{inv.id}</Text>
                        <Text style={styles.invDueText}>Due: {inv.due}</Text>
                      </View>
                      <Badge
                        text={balance(inv) === 0 ? "Settled" : "Balance Due"}
                        tone={balance(inv) === 0 ? "success" : "warning"}
                      />
                    </View>

                    <View style={styles.invoiceItemList}>
                      {inv.items.map((item, idx) => (
                        <View key={idx} style={styles.invoiceItemRow}>
                          <Text style={styles.invoiceItemLabel}>{item.label}</Text>
                          <Text style={styles.invoiceItemAmount}>{money(item.amount)}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Invoice Footer with Pay / Part Pay Action */}
                    <View style={styles.invFooterRow}>
                      <Text style={styles.invBalanceText}>
                        Balance:{" "}
                        <Text
                          style={{
                            fontFamily: fonts.bold,
                            color: balance(inv) > 0 ? colors.orange : colors.greenDark,
                          }}
                        >
                          {money(balance(inv))}
                        </Text>
                      </Text>

                      {balance(inv) > 0 && (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <Pressable
                            style={styles.invPayPartBtn}
                            onPress={() =>
                              openPaymentSheet(
                                Math.round(balance(inv) / 200),
                                inv.id,
                                inv.items[0]?.label
                              )
                            }
                          >
                            <Text style={styles.invPayPartText}>Part Pay</Text>
                          </Pressable>
                          <Pressable
                            style={styles.invPayBtn}
                            onPress={() =>
                              openPaymentSheet(
                                balance(inv) / 100,
                                inv.id,
                                inv.items[0]?.label
                              )
                            }
                          >
                            <Text style={styles.invPayText}>Pay Dues</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Segmented Payment History (Real Data) */}
            <Card style={[styles.sectionCard, shadows.sm]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={styles.cardHeaderTitle}>Payment History & Receipts</Text>
                  <Text style={styles.cardHeaderSub}>
                    Segmented by class arm and payment date
                  </Text>
                </View>
                <Badge text={`${segmentedPayments.length} Receipts`} tone="brand" />
              </View>

              {segmentedPayments.length === 0 ? (
                <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
                  <Icon name="receipt" size={32} color={colors.slate400} />
                  <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 8, fontSize: 13 }}>
                    No payment receipts recorded for this pupil yet.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: spacing.md, marginTop: 8 }}>
                  {segmentedPayments.map((p) => {
                    const dateObj = new Date(p.createdAt);
                    const formattedDate = dateObj.toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const formattedTime = dateObj.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <Pressable
                        key={p.id}
                        style={styles.receiptCard}
                        onPress={() =>
                          router.push({
                            pathname: "/receipt" as any,
                            params: { id: p.id },
                          })
                        }
                      >
                        {/* Segment Header */}
                        <View style={styles.receiptSegmentHeader}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Icon name="school" size={13} color={colors.navy} />
                            <Text style={styles.receiptClassSegment}>
                              {student.className}
                            </Text>
                          </View>
                          <Text style={styles.receiptDateSegment}>
                            {formattedDate} · {formattedTime}
                          </Text>
                        </View>

                        {/* Receipt Content */}
                        <View style={styles.receiptBody}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={styles.receiptId}>Receipt #{p.id}</Text>
                              <Icon name="chevron" size={12} color={colors.muted} />
                            </View>
                            <Text style={styles.receiptMethod}>
                              Method: {p.method.toUpperCase()} · Key: {p.key}
                            </Text>
                            {p.note && (
                              <Text style={styles.receiptNote}>Note: {p.note}</Text>
                            )}
                            <Text style={styles.receiptViewLink}>Tap to view official receipt →</Text>
                          </View>

                          <View style={{ alignItems: "flex-end", gap: 4 }}>
                            <Text style={styles.receiptAmount}>{money(p.amount)}</Text>
                            <Badge text="VERIFIED" tone="success" dot />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Inspect Day Attendance BottomSheet */}
      {inspectDayStr && (
        <Modal
          visible={!!inspectDayStr}
          transparent
          animationType="slide"
          onRequestClose={() => setInspectDayStr(null)}
        >
          <View style={styles.sheetBackdrop}>
            <Pressable style={styles.sheetScrim} onPress={() => setInspectDayStr(null)} />
            <View
              style={[
                styles.inspectSheetContainer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Attendance Details</Text>
                  <Text style={styles.sheetSub}>
                    {inspectDayStr} {inspectDayStr === todayStr ? "· Today" : ""} · {student.name}
                  </Text>
                </View>
                <Pressable
                  style={styles.sheetCloseBtn}
                  onPress={() => setInspectDayStr(null)}
                >
                  <Icon name="close" size={18} color={colors.navy} />
                </Pressable>
              </View>

              {/* Status details for Morning & Afternoon */}
              <View style={{ gap: 12, paddingVertical: spacing.md }}>
                {/* Morning Session */}
                <View style={styles.sessionStatusRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionStatusTitle}>Morning Roll Call</Text>
                    <Text style={styles.sessionStatusSub}>
                      {inspectMorning
                        ? `Recorded at ${new Date(inspectMorning.markedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                        : "Not recorded yet"}
                    </Text>
                  </View>
                  <Badge
                    text={inspectMorning ? inspectMorning.status.toUpperCase() : "UNMARKED"}
                    tone={
                      inspectMorning?.status === "present"
                        ? "success"
                        : inspectMorning?.status === "late"
                        ? "warning"
                        : inspectMorning?.status === "absent"
                        ? "danger"
                        : "neutral"
                    }
                  />
                </View>

                {/* Afternoon Session */}
                <View style={styles.sessionStatusRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionStatusTitle}>Afternoon Roll Call</Text>
                    <Text style={styles.sessionStatusSub}>
                      {inspectAfternoon
                        ? `Recorded at ${new Date(inspectAfternoon.markedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                        : "Not recorded yet"}
                    </Text>
                  </View>
                  <Badge
                    text={inspectAfternoon ? inspectAfternoon.status.toUpperCase() : "UNMARKED"}
                    tone={
                      inspectAfternoon?.status === "present"
                        ? "success"
                        : inspectAfternoon?.status === "late"
                        ? "warning"
                        : inspectAfternoon?.status === "absent"
                        ? "danger"
                        : "neutral"
                    }
                  />
                </View>

                {/* Future Date Restriction or Quick Mark */}
                {canMarkAttendance && (
                  inspectDayStr > todayStr ? (
                    <View style={styles.futureDateNotice}>
                      <Icon name="clock" size={14} color={colors.muted} />
                      <Text style={styles.futureDateNoticeText}>
                        Future date · Attendance cannot be recorded ahead of time.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sheetActionsWrap}>
                      <Text style={styles.sheetActionLabel}>Quick Mark for this Date:</Text>

                      {/* Morning Session Buttons */}
                      <View style={styles.sessionActionRow}>
                        <Text style={styles.sessionActionLabel}>Morning:</Text>
                        <View style={styles.sessionActionButtons}>
                          <Pressable
                            disabled={isMarkingLoading}
                            style={[
                              styles.sessionQuickBtn,
                              styles.sessionQuickBtnPresent,
                              inspectMorning?.status === "present" && styles.sessionQuickBtnSelected,
                            ]}
                            onPress={() => handleMarkInspectedDay("morning", "present")}
                          >
                            <Text style={styles.sessionQuickBtnText}>Present</Text>
                          </Pressable>

                          <Pressable
                            disabled={isMarkingLoading}
                            style={[
                              styles.sessionQuickBtn,
                              styles.sessionQuickBtnLate,
                              inspectMorning?.status === "late" && styles.sessionQuickBtnSelected,
                            ]}
                            onPress={() => handleMarkInspectedDay("morning", "late")}
                          >
                            <Text style={styles.sessionQuickBtnText}>Late</Text>
                          </Pressable>

                          <Pressable
                            disabled={isMarkingLoading}
                            style={[
                              styles.sessionQuickBtn,
                              styles.sessionQuickBtnAbsent,
                              inspectMorning?.status === "absent" && styles.sessionQuickBtnSelected,
                            ]}
                            onPress={() => handleMarkInspectedDay("morning", "absent")}
                          >
                            <Text style={styles.sessionQuickBtnText}>Absent</Text>
                          </Pressable>
                        </View>
                      </View>

                      {/* Afternoon Session Buttons */}
                      <View style={styles.sessionActionRow}>
                        <Text style={styles.sessionActionLabel}>Afternoon:</Text>
                        <View style={styles.sessionActionButtons}>
                          <Pressable
                            disabled={isMarkingLoading}
                            style={[
                              styles.sessionQuickBtn,
                              styles.sessionQuickBtnPresent,
                              inspectAfternoon?.status === "present" && styles.sessionQuickBtnSelected,
                            ]}
                            onPress={() => handleMarkInspectedDay("afternoon", "present")}
                          >
                            <Text style={styles.sessionQuickBtnText}>Present</Text>
                          </Pressable>

                          <Pressable
                            disabled={isMarkingLoading}
                            style={[
                              styles.sessionQuickBtn,
                              styles.sessionQuickBtnLate,
                              inspectAfternoon?.status === "late" && styles.sessionQuickBtnSelected,
                            ]}
                            onPress={() => handleMarkInspectedDay("afternoon", "late")}
                          >
                            <Text style={styles.sessionQuickBtnText}>Late</Text>
                          </Pressable>

                          <Pressable
                            disabled={isMarkingLoading}
                            style={[
                              styles.sessionQuickBtn,
                              styles.sessionQuickBtnAbsent,
                              inspectAfternoon?.status === "absent" && styles.sessionQuickBtnSelected,
                            ]}
                            onPress={() => handleMarkInspectedDay("afternoon", "absent")}
                          >
                            <Text style={styles.sessionQuickBtnText}>Absent</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  )
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Fee Payment & Part Payment BottomSheet */}
      {paySheetVisible && (
        <Modal
          visible={paySheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPaySheetVisible(false)}
        >
          <View style={styles.sheetBackdrop}>
            <Pressable style={styles.sheetScrim} onPress={() => setPaySheetVisible(false)} />
            <View
              style={[
                styles.paySheetContainer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Pay School Fees</Text>
                  <Text style={styles.sheetSub}>
                    {student.name} · {student.className}
                  </Text>
                </View>
                <Pressable
                  style={styles.sheetCloseBtn}
                  onPress={() => setPaySheetVisible(false)}
                >
                  <Icon name="close" size={18} color={colors.navy} />
                </Pressable>
              </View>

              <ScrollView
                style={{ maxHeight: 440 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: spacing.md, gap: 14 }}
              >
                {/* Financial Context Banner */}
                <View style={styles.payContextBox}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.payContextLabel}>
                      {payTargetInvoiceId ? `TARGET INVOICE #${payTargetInvoiceId}` : "TOTAL OUTSTANDING DUES"}
                    </Text>
                    <Text style={styles.payContextVal}>
                      {payTargetInvoiceId
                        ? money(balance(studentInvoices.find((i) => i.id === payTargetInvoiceId) || ({ paid: 0, items: [] } as any)))
                        : money(totalOutstanding)}
                    </Text>
                  </View>
                  <Badge
                    text={totalOutstanding === 0 ? "Advance Credit" : "Outstanding"}
                    tone={totalOutstanding === 0 ? "brand" : "warning"}
                  />
                </View>

                {/* Amount Input */}
                <View style={{ gap: 6 }}>
                  <Text style={styles.inputGroupLabel}>Payment Amount (₦)</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.amountCurrencyPrefix}>₦</Text>
                    <TextInput
                      style={styles.amountTextInput}
                      value={payAmountInput}
                      onChangeText={setPayAmountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Quick Preset Part-Payment Chips */}
                <View style={{ gap: 6 }}>
                  <Text style={styles.inputGroupLabel}>Quick Presets / Part Payments</Text>
                  <View style={styles.presetChipsRow}>
                    {totalOutstanding > 0 && (
                      <>
                        <Pressable
                          style={[
                            styles.presetChip,
                            payAmountInput === String(Math.round((totalOutstanding * 0.25) / 100)) && styles.presetChipActive,
                          ]}
                          onPress={() => setPayAmountInput(String(Math.round((totalOutstanding * 0.25) / 100)))}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              payAmountInput === String(Math.round((totalOutstanding * 0.25) / 100)) && styles.presetChipTextActive,
                            ]}
                          >
                            25% Part (₦{Math.round((totalOutstanding * 0.25) / 100).toLocaleString()})
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.presetChip,
                            payAmountInput === String(Math.round((totalOutstanding * 0.5) / 100)) && styles.presetChipActive,
                          ]}
                          onPress={() => setPayAmountInput(String(Math.round((totalOutstanding * 0.5) / 100)))}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              payAmountInput === String(Math.round((totalOutstanding * 0.5) / 100)) && styles.presetChipTextActive,
                            ]}
                          >
                            50% Half (₦{Math.round((totalOutstanding * 0.5) / 100).toLocaleString()})
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.presetChip,
                            payAmountInput === String(Math.round(totalOutstanding / 100)) && styles.presetChipActive,
                          ]}
                          onPress={() => setPayAmountInput(String(Math.round(totalOutstanding / 100)))}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              payAmountInput === String(Math.round(totalOutstanding / 100)) && styles.presetChipTextActive,
                            ]}
                          >
                            Full Balance (₦{Math.round(totalOutstanding / 100).toLocaleString()})
                          </Text>
                        </Pressable>
                      </>
                    )}
                    {[5000, 10000, 25000].map((presetVal) => (
                      <Pressable
                        key={presetVal}
                        style={[
                          styles.presetChip,
                          payAmountInput === String(presetVal) && styles.presetChipActive,
                        ]}
                        onPress={() => setPayAmountInput(String(presetVal))}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            payAmountInput === String(presetVal) && styles.presetChipTextActive,
                          ]}
                        >
                          ₦{presetVal.toLocaleString()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Payment Channel Selector */}
                <View style={{ gap: 6 }}>
                  <Text style={styles.inputGroupLabel}>Payment Channel</Text>
                  <View style={styles.methodSelectorRow}>
                    {(
                      [
                        { key: "transfer", label: "Bank Transfer", icon: "wallet" },
                        { key: "card", label: "Debit Card", icon: "card" },
                        { key: "ussd", label: "USSD / Bank", icon: "call" },
                      ] as const
                    ).map((m) => (
                      <Pressable
                        key={m.key}
                        style={[
                          styles.methodOptionBtn,
                          payMethod === m.key && styles.methodOptionBtnActive,
                        ]}
                        onPress={() => setPayMethod(m.key)}
                      >
                        <Icon
                          name={m.icon as any}
                          size={15}
                          color={payMethod === m.key ? colors.navy : colors.muted}
                        />
                        <Text
                          style={[
                            styles.methodOptionText,
                            payMethod === m.key && styles.methodOptionTextActive,
                          ]}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Fee Narration / Category */}
                <View style={{ gap: 6 }}>
                  <Text style={styles.inputGroupLabel}>Fee Category / Narration</Text>
                  <TextInput
                    style={styles.categoryTextInput}
                    value={payCategory}
                    onChangeText={setPayCategory}
                    placeholder="e.g. 2nd Term Tuition, PTA Levy"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </ScrollView>

              {/* Submit CTA */}
              <View style={styles.paySubmitRow}>
                <Button
                  title={
                    isProcessingPayment
                      ? "Recording Payment..."
                      : `Confirm & Pay ₦${Number(payAmountInput || 0).toLocaleString("en-NG")}`
                  }
                  onPress={handleProcessPayment}
                  disabled={isProcessingPayment || !payAmountInput || Number(payAmountInput) <= 0}
                  style={{ flex: 1, height: 46 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Digital ID Pass Sheet */}
      <DigitalIdSheet
        visible={digitalIdVisible}
        onClose={() => setDigitalIdVisible(false)}
        targetStudent={student}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  emptyCenter: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  qrPassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrPassText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  heroCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  studentNameText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  studentSubText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  schoolMottoText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  commActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  commBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  quickMarkCard: {
    padding: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: spacing.sm,
  },
  quickMarkHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickMarkTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  quickMarkSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  sessionPillsWrap: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sessionPillActive: {
    backgroundColor: colors.navy,
  },
  sessionPillText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.slate600,
  },
  sessionPillTextActive: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  markActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 2,
  },
  markBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  markBtnPresent: {
    backgroundColor: colors.greenDark,
  },
  markBtnLate: {
    backgroundColor: colors.orange,
  },
  markBtnAbsent: {
    backgroundColor: colors.danger,
  },
  markBtnActiveBorder: {
    borderWidth: 2,
    borderColor: colors.navy,
  },
  markBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  tabScrollWrap: {
    flexGrow: 0,
    marginVertical: 4,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  tabPillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  tabPillTextActive: {
    color: "#ffffff",
  },
  sectionCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  cardHeaderSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  termFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  termFilterBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  termFilterText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.slate600,
  },
  termFilterTextActive: {
    color: "#ffffff",
  },
  attMetricsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  attMetricItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  attMetricVal: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  attMetricLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  attMetricDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  calendarCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  calNavHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  calArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  calMonthTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  returnTodayText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.orange,
    marginTop: 2,
  },
  calWeekdaysRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  calWeekdayText: {
    width: "14.285%",
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  calEmptyCell: {
    width: "14.285%",
    height: 48,
    marginVertical: 1,
  },
  calCell: {
    width: "14.285%",
    height: 48,
    padding: 2,
    marginVertical: 1,
  },
  calCellInner: {
    flex: 1,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: colors.border,
  },
  calCellToday: {
    borderColor: colors.orange,
    borderWidth: 1.5,
    backgroundColor: colors.orangeLight,
  },
  calDayNum: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  calDayNumToday: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  calDayNumWeekend: {
    color: colors.muted,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotPresent: {
    backgroundColor: colors.greenDark,
  },
  dotLate: {
    backgroundColor: colors.orange,
  },
  dotAbsent: {
    backgroundColor: colors.danger,
  },
  calLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  attLogRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attLogDate: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  attLogMeta: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  feeStatsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: 4,
  },
  feeStatBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  feeStatVal: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  feeStatLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  feeStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  invContainer: {
    marginTop: 6,
    padding: spacing.sm + 2,
    borderRadius: radii.sm,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: colors.border,
  },
  invHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  invIdText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  invDueText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  invoiceItemList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  invoiceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  invoiceItemLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.navy,
  },
  invoiceItemAmount: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  receiptCard: {
    backgroundColor: "#f8fafc",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  receiptSegmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  receiptClassSegment: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  receiptDateSegment: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.slate600,
  },
  receiptBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  receiptId: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  receiptMethod: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  receiptNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    fontStyle: "italic",
  },
  receiptViewLink: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.navy,
    marginTop: 2,
  },
  receiptAmount: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.greenDark,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  inspectSheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    ...shadows.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  sheetSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionStatusTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  sessionStatusSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  futureDateNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  futureDateNoticeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  sheetActionsWrap: {
    gap: 8,
    marginTop: 4,
  },
  sheetActionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  sessionActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sessionActionButtons: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  sessionQuickBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionQuickBtnPresent: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  sessionQuickBtnLate: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  sessionQuickBtnAbsent: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  sessionQuickBtnSelected: {
    borderWidth: 2,
    borderColor: colors.navy,
  },
  sessionQuickBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  subjectList: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subjectName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  subjectSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  subjectScore: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  guardianInfoBox: {
    backgroundColor: "#f8fafc",
    padding: spacing.md,
    borderRadius: radii.md,
    gap: 8,
    marginTop: 6,
  },
  guardianRow: {
    gap: 2,
  },
  guardianLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  guardianVal: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  guardianActionWrap: {
    marginTop: 6,
  },
  payBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
  },
  payActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  payActionBtnPrimary: {
    backgroundColor: colors.navy,
  },
  payActionBtnPrimaryText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  payActionBtnSecondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payActionBtnSecondaryText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  invFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 6,
  },
  invBalanceText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  invPayPartBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  invPayPartText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  invPayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: colors.navy,
  },
  invPayText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  paySheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    ...shadows.lg,
  },
  payContextBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payContextLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  payContextVal: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  inputGroupLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderRadius: radii.md,
    backgroundColor: "#ffffff",
    paddingHorizontal: spacing.md,
    height: 48,
  },
  amountCurrencyPrefix: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    height: "100%",
  },
  presetChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  presetChipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.navy,
  },
  presetChipTextActive: {
    fontFamily: fonts.bold,
    color: "#ffffff",
  },
  methodSelectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodOptionBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: colors.navy,
    borderWidth: 1.5,
  },
  methodOptionText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  methodOptionTextActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  categoryTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: "#ffffff",
    paddingHorizontal: spacing.md,
    height: 42,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  paySubmitRow: {
    marginTop: 6,
  },
});
