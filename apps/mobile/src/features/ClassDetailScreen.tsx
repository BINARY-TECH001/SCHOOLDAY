import React, { useState, useMemo } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  ModalSheet,
  colors,
  fonts,
  radii,
  shadows,
  spacing,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { SchoolClass, Student, money, total, balance } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import {
  getClassRoster,
  isTeacherAuthorizedForClass,
} from "./teacher/utils/teacherClass";
import { ClassroomRollCallSheet } from "./teacher/components/ClassroomRollCallSheet";
import { DailyStudentRosterAttendanceSheet } from "./attendance/DailyStudentRosterAttendanceSheet";

type ClassTab = "roster" | "attendance" | "lessons" | "announcements" | "finance";

export function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, context, services, act, busy } = useSchool();

  // Find target class strictly by ID or code without fallback
  const schoolClass = useMemo(() => {
    return data.classes?.find((c) => c.id === id || c.code === id);
  }, [data.classes, id]);

  const isOwner = context.role === "owner" || context.role === "admin";

  // Tab State
  const [activeTab, setActiveTab] = useState<ClassTab>("roster");
  const [studentSearch, setStudentSearch] = useState("");
  const [rollCallOpen, setRollCallOpen] = useState(false);
  const [classAttendanceCalendarOpen, setClassAttendanceCalendarOpen] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Announce modal state
  const [announceModal, setAnnounceModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");

  // Not found guard
  if (!schoolClass) {
    return (
      <View style={styles.root}>
        <TopBar
          title="Classroom Workspace"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/classes"))}
        />
        <View style={styles.emptyCenter}>
          <Empty
            title="Classroom Not Found"
            detail={`No classroom matching ID "${id || "unknown"}" exists in this school.`}
            actionText="Return to Classrooms"
            onAction={() => (router.canGoBack() ? router.back() : router.replace("/classes"))}
            icon="school"
          />
        </View>
      </View>
    );
  }

  // Authorization check
  const isAuthorized = isTeacherAuthorizedForClass(
    schoolClass,
    context.role,
    context.userId,
    data.staff
  );

  if (!isAuthorized) {
    return (
      <View style={styles.root}>
        <TopBar
          title={schoolClass.name}
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/classes"))}
        />
        <View style={styles.emptyCenter}>
          <Empty
            title="Access Restricted"
            detail="You are not assigned as the teacher for this classroom. Only authorized teachers and school administrators can access this workspace."
            actionText="View My Classes"
            onAction={() => router.replace("/classes")}
            icon="lock"
          />
        </View>
      </View>
    );
  }

  // Find assigned lead teacher
  const leadTeacher = data.staff.find(
    (s) =>
      s.userId === schoolClass.teacherUserId ||
      s.assignedClasses?.includes(schoolClass.name) ||
      s.assignedClass === schoolClass.name
  );

  // Real class roster
  const classStudents = useMemo(() => {
    return getClassRoster(data.students, schoolClass);
  }, [data.students, schoolClass]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const q = studentSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.guardianPhone && s.guardianPhone.includes(q))
      );
    });
  }, [classStudents, studentSearch]);

  // Lessons mapped to this class
  const classLessons = useMemo(() => {
    const nameLower = schoolClass.name.toLowerCase();
    const codeLower = schoolClass.code.toLowerCase();
    return data.lessons.filter((l) => {
      const lClass = l.className.toLowerCase();
      return lClass === nameLower || lClass === codeLower || lClass.includes(nameLower);
    });
  }, [data.lessons, schoolClass]);

  // Class Announcements
  const classNotices = useMemo(() => {
    return data.notices.filter((n) => {
      const titleLower = n.title.toLowerCase();
      return (
        titleLower.includes(schoolClass.name.toLowerCase()) ||
        titleLower.includes(schoolClass.code.toLowerCase()) ||
        n.target === "home"
      );
    });
  }, [data.notices, schoolClass]);

  // Export CSV Action
  const handleExportCSV = async () => {
    if (classStudents.length === 0) {
      Alert.alert("Empty Roster", "There are no students enrolled in this classroom to export.");
      return;
    }
    const header = "Student ID,Student Name,Class,Guardian ID\n";
    const rows = classStudents
      .map((s) => `${s.id},${s.name},${schoolClass.name},${s.guardianId}`)
      .join("\n");
    const csvContent = header + rows;

    try {
      await Share.share({
        title: `${schoolClass.name} Student Roster.csv`,
        message: csvContent,
      });
    } catch {
      // Ignore
    }
  };

  const handlePostClassAnnouncement = async () => {
    if (!announceTitle.trim() || !announceBody.trim()) {
      Alert.alert("Required Fields", "Please provide a title and body for the announcement.");
      return;
    }
    await act(
      () =>
        services.postNotice(context, {
          title: `[${schoolClass.name}] ${announceTitle.trim()}`,
          body: announceBody.trim(),
          target: "home",
        }),
      `Circular posted to ${schoolClass.name} bulletin!`
    );
    setAnnounceTitle("");
    setAnnounceBody("");
    setAnnounceModal(false);
  };

  // Class Finance & Receipts (Available to assigned Teachers & Administration)
  const classStudentIds = useMemo(() => new Set(classStudents.map((s) => s.id)), [classStudents]);

  const classInvoices = useMemo(() => {
    return data.invoices.filter((i) => classStudentIds.has(i.studentId));
  }, [data.invoices, classStudentIds]);

  const classInvoiceIds = useMemo(() => new Set(classInvoices.map((i) => i.id)), [classInvoices]);

  const classPayments = useMemo(() => {
    return data.payments
      .filter(
        (p) =>
          p.invoiceIds?.some((id) => classInvoiceIds.has(id)) ||
          classStudentIds.has(p.userId) ||
          classStudentIds.has((p as any).studentId)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data.payments, classInvoiceIds, classStudentIds]);

  const totalClassBilled = useMemo(() => {
    return classInvoices.reduce((acc, inv) => acc + total(inv), 0);
  }, [classInvoices]);

  const totalClassCollected = useMemo(() => {
    return classPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [classPayments]);

  const totalClassOutstanding = Math.max(0, totalClassBilled - totalClassCollected);

  const availableTabs: { key: ClassTab; label: string; icon: any }[] = [
    { key: "roster", label: `Pupils (${classStudents.length})`, icon: "people" },
    { key: "attendance", label: "Roll Call", icon: "clock" },
    { key: "lessons", label: `Lessons (${classLessons.length})`, icon: "book" },
    { key: "announcements", label: "Notices", icon: "notification" },
    { key: "finance" as ClassTab, label: `Receipts (${classPayments.length})`, icon: "receipt" },
  ];

  return (
    <View style={styles.root}>
      {/* 1. Single-Row Inline TopBar */}
      <TopBar
        title={schoolClass.name}
        subtitle={`${schoolClass.code} · Classroom Workspace`}
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={() => setAnnounceModal(true)}
            style={styles.announceBtn}
            hitSlop={8}
          >
            <Icon name="notification" size={14} color="#ffffff" filled />
            <Text style={styles.announceBtnText}>Announce</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Focused Class Identity Card */}
        <Card style={[styles.heroCard, shadows.sm]}>
          <View style={styles.heroTop}>
            <View style={styles.classIconTile}>
              <Icon name="school" size={24} color={colors.navy} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.heroClassName}>{schoolClass.name}</Text>
                <Badge text={schoolClass.code} tone="brand" />
              </View>
              <Text style={styles.heroSubText}>
                Lead Teacher: {leadTeacher?.name || "Unassigned"}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Strip */}
          <View style={styles.metricStrip}>
            <View style={styles.metricStripCol}>
              <Text style={styles.metricStripLabel}>ENROLLED</Text>
              <Text style={styles.metricStripVal}>{classStudents.length} Pupils</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricStripCol}>
              <Text style={styles.metricStripLabel}>ACTIVE LESSONS</Text>
              <Text style={styles.metricStripVal}>{classLessons.length} Modules</Text>
            </View>
            {isOwner && (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.metricStripCol}>
                  <Text style={styles.metricStripLabel}>TERM FEE</Text>
                  <Text style={styles.metricStripVal}>{money(schoolClass.termFee || 15000000)}</Text>
                </View>
              </>
            )}
          </View>

          {/* Class Quick Action Buttons */}
          <View style={styles.quickActionRow}>
            <Pressable
              onPress={() => router.push("/(workspace)/messages" as any)}
              style={styles.quickActionBtn}
            >
              <Icon name="sms" size={15} color={colors.navy} />
              <Text style={styles.quickActionBtnText}>Class Group</Text>
            </Pressable>

            <Pressable onPress={handleExportCSV} style={styles.quickActionBtn}>
              <Icon name="document" size={15} color={colors.navy} />
              <Text style={styles.quickActionBtnText}>Export CSV</Text>
            </Pressable>

            {(isOwner || isAuthorized) && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/add-pupil",
                    params: { classId: schoolClass.id },
                  } as any)
                }
                style={styles.quickActionBtn}
              >
                <Icon name="userAdd" size={15} color={colors.orange} />
                <Text style={[styles.quickActionBtnText, { color: colors.orange }]}>+ Pupil</Text>
              </Pressable>
            )}
          </View>
        </Card>

        {/* 3. Workspace Navigation Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollWrap}
          contentContainerStyle={{ gap: 8 }}
        >
          {availableTabs.map((tab) => {
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

        {/* TAB 1: PUPILS ROSTER */}
        {activeTab === "roster" && (
          <View style={{ gap: 10 }}>
            <View style={[styles.searchBox, shadows.sm]}>
              <Icon name="search" size={16} color={colors.muted} />
              <TextInput
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="Search pupil by name or ID…"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>

            {classStudents.length === 0 ? (
              <Card style={[styles.emptyRosterCard, shadows.sm]}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="people" size={24} color={colors.navy} />
                </View>
                <Text style={styles.emptyRosterTitle}>No Students Enrolled</Text>
                <Text style={styles.emptyRosterDetail}>
                  This classroom arm is active, but no pupils have been enrolled into this roster yet.
                </Text>
                {(isOwner || isAuthorized) && (
                  <Button
                    title="Add Pupil to Class"
                    variant="primary"
                    size="sm"
                    icon="add"
                    onPress={() =>
                      router.push({
                        pathname: "/add-pupil",
                        params: { classId: schoolClass.id },
                      } as any)
                    }
                    style={{ alignSelf: "center", marginTop: spacing.md }}
                  />
                )}
              </Card>
            ) : filteredStudents.length === 0 ? (
              <Empty
                title="No matching pupils"
                detail={`No pupils in this class match "${studentSearch}".`}
                icon="search"
              />
            ) : (
              filteredStudents.map((st) => (
                <Pressable
                  key={st.id}
                  onPress={() =>
                    router.push({
                      pathname: "/student-detail",
                      params: { id: st.id, classId: schoolClass.id },
                    } as any)
                  }
                  style={[styles.studentCard, shadows.sm]}
                >
                  <Avatar name={st.name} size={40} role="student" />

                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.studentName}>{st.name}</Text>
                      <Badge text="Enrolled" tone="success" dot />
                    </View>

                    <Text style={styles.studentMeta}>
                      ID: {st.id} · {st.gender ? `${st.gender} · ` : ""}Guardian ID: {st.guardianId}
                    </Text>
                  </View>

                  <Icon name="chevron" size={14} color={colors.muted} />
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* TAB 2: CLASS ATTENDANCE / ROLL CALL */}
        {activeTab === "attendance" && (
          <View style={{ gap: 10 }}>
            <Card style={[styles.rollCard, shadows.sm]}>
              <Text style={styles.rollTitle}>Morning Attendance Overview</Text>
              <Text style={styles.rollSub}>
                Roster roll call for {schoolClass.name}
              </Text>

              <View style={styles.rollStatsRow}>
                <View style={styles.rollStatBox}>
                  <Text style={styles.rollStatVal}>{classStudents.length}</Text>
                  <Text style={styles.rollStatLabel}>TOTAL ROSTER</Text>
                </View>
                <View style={styles.rollStatBox}>
                  <Text style={[styles.rollStatVal, { color: colors.greenDark }]}>
                    {classStudents.length > 0 ? classStudents.length : 0}
                  </Text>
                  <Text style={styles.rollStatLabel}>CONFIRMED</Text>
                </View>
                <View style={styles.rollStatBox}>
                  <Text style={[styles.rollStatVal, { color: colors.orange }]}>0</Text>
                  <Text style={styles.rollStatLabel}>EXCEPTIONS</Text>
                </View>
              </View>

              <Button
                title="Take Classroom Roll Call"
                icon="verify"
                onPress={() => setRollCallOpen(true)}
                style={{ height: 42, marginTop: 8 }}
              />

              <Button
                title="Class Attendance Calendar"
                icon="calendar"
                variant="outline"
                onPress={() => setClassAttendanceCalendarOpen(true)}
                style={{ height: 42, marginTop: 6 }}
              />
            </Card>
          </View>
        )}

        {/* TAB 3: LESSON NOTES & CURRICULUM */}
        {activeTab === "lessons" && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.sectionHeading}>Curriculum Modules</Text>
              <Button
                title="+ New Lesson"
                variant="outline"
                size="sm"
                onPress={() => router.push("/lessons")}
              />
            </View>

            {classLessons.length === 0 ? (
              <Empty
                title="No Lesson Modules Scheduled"
                detail={`No curriculum lesson notes have been created for ${schoolClass.name} yet.`}
                actionText="Create Lesson Plan"
                onAction={() => router.push("/lessons")}
                icon="book"
              />
            ) : (
              classLessons.map((les) => (
                <Card key={les.id} style={[styles.lessonCard, shadows.sm]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.lessonSubject}>{les.subject}</Text>
                    <Badge text={les.status} tone="neutral" />
                  </View>
                  <Text style={styles.lessonTopic}>{les.topic}</Text>
                  <Text style={styles.lessonDate}>Date: {les.date}</Text>
                  <Text style={styles.lessonContent} numberOfLines={2}>
                    {les.objectives}
                  </Text>
                </Card>
              ))
            )}
          </View>
        )}

        {/* TAB 4: CLASS ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.sectionHeading}>Class Notices & Broadcasts</Text>
              <Button
                title="+ Announce"
                variant="outline"
                size="sm"
                onPress={() => setAnnounceModal(true)}
              />
            </View>

            {classNotices.length === 0 ? (
              <Empty
                title="No Class Bulletins"
                detail="There are no active notices or announcements for this classroom."
                icon="notification"
              />
            ) : (
              classNotices.map((n) => (
                <Card key={n.id} style={[styles.noticeCard, shadows.sm]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.noticeTitle}>{n.title}</Text>
                    <Badge text="Circular" tone="brand" />
                  </View>
                  <Text style={styles.noticeBody}>{n.body}</Text>
                  <Text style={styles.noticeTime}>
                    {n.at ? new Date(n.at).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "Recent"}
                  </Text>
                </Card>
              ))
            )}
          </View>
        )}

        {/* TAB 5: CLASSROOM TUITION & PAYMENT RECEIPTS */}
        {activeTab === "finance" && (
          <View style={{ gap: 10 }}>
            {/* Financial Overview Card */}
            <Card style={[styles.financeCard, shadows.sm]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.financeTitle}>{schoolClass.name} Fee Standing</Text>
                  <Text style={styles.financeSub}>
                    Tuition dues and collection status for enrolled pupils
                  </Text>
                </View>
                <Badge
                  text={`${money(schoolClass.termFee || 15000000)} / term`}
                  tone="brand"
                />
              </View>

              <View style={styles.feeStatsStrip}>
                <View style={styles.feeStatBox}>
                  <Text style={styles.feeStatVal}>{money(totalClassBilled)}</Text>
                  <Text style={styles.feeStatLabel}>TOTAL BILLED</Text>
                </View>
                <View style={styles.feeStatDivider} />
                <View style={styles.feeStatBox}>
                  <Text style={[styles.feeStatVal, { color: colors.greenDark }]}>
                    {money(totalClassCollected)}
                  </Text>
                  <Text style={styles.feeStatLabel}>COLLECTED</Text>
                </View>
                <View style={styles.feeStatDivider} />
                <View style={styles.feeStatBox}>
                  <Text
                    style={[
                      styles.feeStatVal,
                      { color: totalClassOutstanding > 0 ? colors.orange : colors.greenDark },
                    ]}
                  >
                    {money(totalClassOutstanding)}
                  </Text>
                  <Text style={styles.feeStatLabel}>OUTSTANDING</Text>
                </View>
              </View>
            </Card>

            {/* Class Payment Receipts List */}
            <Card style={[styles.sectionCard, shadows.sm]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <View>
                  <Text style={styles.cardHeaderTitle}>Class Payment Receipts</Text>
                  <Text style={styles.cardHeaderSub}>
                    Verified transactions for pupils enrolled in {schoolClass.name}
                  </Text>
                </View>
                <Badge text={`${classPayments.length} Receipts`} tone="brand" />
              </View>

              {classPayments.length === 0 ? (
                <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
                  <Icon name="receipt" size={32} color={colors.slate400} />
                  <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 8, fontSize: 13 }}>
                    No payment receipts recorded for this classroom yet.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: spacing.md, marginTop: 6 }}>
                  {classPayments.map((p) => {
                    const student = data.students.find(
                      (s) =>
                        s.id === (p as any).studentId ||
                        s.id === p.userId ||
                        classInvoices.find((inv) => p.invoiceIds?.includes(inv.id))?.studentId === s.id
                    );

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
                            <Avatar name={student?.name || "Pupil"} size={20} role="student" />
                            <Text style={styles.receiptStudentName}>
                              {student?.name || "Enrolled Pupil"}
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

      {/* Broadcast Announcement Modal Sheet */}
      <ModalSheet
        visible={announceModal}
        onClose={() => setAnnounceModal(false)}
        title={`Broadcast to ${schoolClass.name}`}
      >
        <View style={{ gap: 14 }}>
          <Field label="Announcement Title">
            <TextInput
              value={announceTitle}
              onChangeText={setAnnounceTitle}
              placeholder="e.g. Mid-term project submission date"
              placeholderTextColor="#94a3b8"
              style={styles.modalInput}
            />
          </Field>

          <Field label="Circular Body">
            <TextInput
              value={announceBody}
              onChangeText={setAnnounceBody}
              placeholder="Enter announcement text for guardians and students…"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              style={[styles.modalInput, { height: 100, textAlignVertical: "top" }]}
            />
          </Field>

          <Button
            title={busy ? "Posting…" : "Post to Classroom Bulletin"}
            onPress={handlePostClassAnnouncement}
            disabled={busy || !announceTitle.trim() || !announceBody.trim()}
          />
        </View>
      </ModalSheet>

      {/* Classroom Roll Call Sheet */}
      <ClassroomRollCallSheet
        visible={rollCallOpen}
        onClose={() => setRollCallOpen(false)}
        schoolClass={schoolClass}
        students={classStudents}
      />

      {/* Class Attendance Calendar BottomSheet */}
      {classAttendanceCalendarOpen && (
        <DailyStudentRosterAttendanceSheet
          visible={classAttendanceCalendarOpen}
          dateStr={todayStr}
          initialClassId={schoolClass.id}
          onClose={() => setClassAttendanceCalendarOpen(false)}
        />
      )}
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
  announceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  announceBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: "#ffffff",
  },
  heroCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  classIconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  heroClassName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
  heroSubText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  metricStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  metricStripCol: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  metricStripLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  metricStripVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  quickActionBtn: {
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
  quickActionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  emptyRosterCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyRosterTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  emptyRosterDetail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 290,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  studentName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  studentMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  rollCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rollTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  rollSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  rollStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 6,
  },
  rollStatBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: radii.sm,
    alignItems: "center",
    gap: 2,
  },
  rollStatVal: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  rollStatLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  sectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  lessonCard: {
    padding: spacing.md,
    gap: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  lessonSubject: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  lessonTopic: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.orange,
  },
  lessonDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  lessonContent: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  noticeCard: {
    padding: spacing.md,
    gap: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  noticeBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.navy,
    lineHeight: 18,
  },
  noticeTime: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
  },
  financeCard: {
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  financeTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  financeFee: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.navy,
  },
  financeSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
    backgroundColor: "#ffffff",
  },
  feeStatsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feeStatBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  feeStatVal: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  feeStatLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  feeStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  sectionCard: {
    padding: spacing.md,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  cardHeaderSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
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
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  receiptStudentName: {
    fontFamily: fonts.bold,
    fontSize: 12,
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
});
