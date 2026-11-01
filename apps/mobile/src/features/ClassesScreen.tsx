import React, { useState, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  ModalSheet,
  Txt,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { FilterBottomSheet, FilterGroup } from "../components/FilterBottomSheet";
import { SchoolClass, Student, money } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { getTeacherAssignedClasses } from "./teacher/utils/teacherClass";

export function ClassesScreen() {
  const { data, context, services, act, busy } = useSchool();
  const [search, setSearch] = useState("");
  const [filterModal, setFilterModal] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("all");
  const [activeClass, setActiveClass] = useState<SchoolClass | null>(null);

  // Announce modal state
  const [announceModal, setAnnounceModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");

  const isOwner = context.role === "owner" || context.role === "admin";
  const classrooms = useMemo(() => {
    if (isOwner) return data.classes || [];
    return getTeacherAssignedClasses(data.classes || [], data.staff || [], context.userId);
  }, [isOwner, data.classes, data.staff, context.userId]);

  // Level filter groups
  const filterGroups: FilterGroup[] = [
    {
      id: "level",
      title: "Grade Level / Section",
      options: [
        { key: "all", label: "All Grade Levels" },
        { key: "primary", label: "Primary School" },
        { key: "jss", label: "Junior Secondary (JSS)" },
        { key: "sss", label: "Senior Secondary (SSS)" },
        { key: "nursery", label: "Nursery / Kindergarten" },
      ],
    },
  ];

  const handleSelectFilter = (groupId: string, val: string) => {
    if (groupId === "level") setSelectedLevelFilter(val);
  };

  const handleResetFilters = () => {
    setSelectedLevelFilter("all");
  };

  const isFiltered = selectedLevelFilter !== "all";

  // Filter classrooms
  const filteredClasses = useMemo(() => {
    return classrooms.filter((cls) => {
      const matchSearch =
        search.trim() === "" ||
        (cls.name + cls.code).toLowerCase().includes(search.toLowerCase());

      let matchLevel = true;
      if (selectedLevelFilter === "primary") {
        matchLevel = cls.name.toLowerCase().includes("primary") || cls.code.startsWith("PR");
      } else if (selectedLevelFilter === "jss") {
        matchLevel = cls.name.toLowerCase().includes("jss") || cls.code.startsWith("JSS");
      } else if (selectedLevelFilter === "sss") {
        matchLevel = cls.name.toLowerCase().includes("sss") || cls.code.startsWith("SSS");
      } else if (selectedLevelFilter === "nursery") {
        matchLevel = cls.name.toLowerCase().includes("nursery") || cls.code.startsWith("NUR");
      }

      return matchSearch && matchLevel;
    });
  }, [classrooms, search, selectedLevelFilter]);

  // Aggregate metrics
  const totalStudents = classrooms.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const avgFee = classrooms.length > 0
    ? Math.round(classrooms.reduce((sum, c) => sum + (c.termFee || 0), 0) / classrooms.length)
    : 15000000;

  // Students in selected active class
  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    const nameLower = activeClass.name.toLowerCase();
    const codeLower = activeClass.code.toLowerCase();
    return data.students.filter(
      (s) =>
        s.className.toLowerCase().includes(nameLower) ||
        s.className.toLowerCase().includes(codeLower) ||
        s.className.toLowerCase().includes(nameLower.split(" ")[0] || ""),
    );
  }, [data.students, activeClass]);

  const handleExportCSV = async () => {
    if (!activeClass || classStudents.length === 0) {
      Alert.alert("Empty Roster", "There are no students enrolled in this classroom to export.");
      return;
    }
    const header = "Student ID,Student Name,Class,Guardian ID\n";
    const rows = classStudents
      .map((s) => `${s.id},${s.name},${activeClass.name},${s.guardianId}`)
      .join("\n");
    const csvContent = header + rows;

    try {
      await Share.share({
        title: `${activeClass.name} Student Roster.csv`,
        message: csvContent,
      });
    } catch {
      // Ignore
    }
  };

  const handlePostClassAnnouncement = async () => {
    if (!announceTitle.trim() || !announceBody.trim() || !activeClass) return;
    await act(
      () =>
        services.postNotice(context, {
          title: `[${activeClass.name}] ${announceTitle.trim()}`,
          body: announceBody.trim(),
          target: "home",
        }),
      `Circular posted to ${activeClass.name} classroom bulletin!`,
    );
    setAnnounceTitle("");
    setAnnounceBody("");
    setAnnounceModal(false);
  };

  return (
    <View style={styles.root}>
      {/* Reusable Clean TopBar Touching Status Bar */}
      <TopBar
        title={isOwner ? "Classrooms & Arms" : "Assigned Classes"}
        onBack={() => router.back()}
        rightAction={
          isOwner ? (
            <Pressable
              onPress={() => router.push("/create-class" as any)}
              style={styles.addClassTopBtn}
              hitSlop={8}
            >
              <Icon name="add" size={16} color="#ffffff" filled />
              <Text style={styles.addClassTopBtnText}>New Class</Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Overview Row */}
        <View style={styles.metricsRow}>
          <Card style={[styles.metricCard, shadows.sm]}>
            <Text style={styles.metricLabel}>ACTIVE CLASSES</Text>
            <Text style={styles.metricValue}>{classrooms.length}</Text>
            <Text style={styles.metricSub}>Grade levels & arms</Text>
          </Card>

          <Card style={[styles.metricCard, shadows.sm]}>
            <Text style={styles.metricLabel}>TOTAL ENROLLED</Text>
            <Text style={[styles.metricValue, { color: colors.orange }]}>
              {totalStudents}
            </Text>
            <Text style={styles.metricSub}>Active pupils</Text>
          </Card>

          <Card style={[styles.metricCard, shadows.sm]}>
            <Text style={styles.metricLabel}>AVERAGE DUES</Text>
            <Text style={[styles.metricValue, { color: colors.greenDark }]}>
              {money(avgFee)}
            </Text>
            <Text style={styles.metricSub}>Per term bill</Text>
          </Card>
        </View>

        {/* Search Bar + Filter Button */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, shadows.sm]}>
            <Icon name="search" size={18} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search classrooms or code (e.g. PR1-G)…"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Icon name="close" size={16} color={colors.muted} filled />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setFilterModal(true)}
            style={[
              styles.filterBtn,
              isFiltered && styles.filterBtnActive,
              shadows.sm,
            ]}
            hitSlop={8}
          >
            <Icon
              name="filter"
              size={18}
              color={isFiltered ? colors.orange : colors.ink}
              filled={isFiltered}
            />
            {isFiltered && <View style={styles.filterDot} />}
          </Pressable>
        </View>

        {/* Classroom Cards List */}
        <View style={styles.classesList}>
          {filteredClasses.length === 0 ? (
            <Empty
              title={
                !isOwner && classrooms.length === 0
                  ? "No Classroom Assigned"
                  : "No classrooms found"
              }
              detail={
                !isOwner && classrooms.length === 0
                  ? "You are not currently assigned to any classroom for this term. Please speak with the school administrator to configure your assigned classes."
                  : "Adjust your search criteria or filter options."
              }
              icon="school"
            />
          ) : (
            filteredClasses.map((cls) => {
              const assignedTeacher = data.staff.find(
                (s) => s.userId === cls.teacherUserId,
              );
              const studentCount = cls.studentCount || 0;
              const capacity = 35;
              const percentCapacity = Math.min(
                Math.round((studentCount / capacity) * 100),
                100,
              );

              return (
                <Pressable
                  key={cls.id}
                  onPress={() =>
                    router.push({
                      pathname: "/class-detail",
                      params: { id: cls.id },
                    } as any)
                  }
                  style={[styles.classCard, shadows.sm]}
                >
                  {/* Card Header: Class name, Code, Level */}
                  <View style={styles.classCardHeader}>
                    <View style={styles.classIconTile}>
                      <Icon name="school" size={22} color={colors.indigo} />
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={styles.classCardName}>{cls.name}</Text>
                        <Badge text={cls.code} tone="purple" />
                      </View>
                      <Text style={styles.classCardTerm}>
                        {isOwner
                          ? `Tuition & Dues: ${money(cls.termFee || 15000000)} / term`
                          : `${studentCount} Pupils Enrolled`}
                      </Text>
                    </View>
                  </View>

                  {/* Teacher & Capacity Overview */}
                  <View style={styles.classCardBody}>
                    {/* Assigned Teacher Row */}
                    <View style={styles.teacherRow}>
                      <Avatar
                        name={assignedTeacher?.name || "Teacher"}
                        size={32}
                        role="teacher"
                      />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={styles.teacherLabel}>LEAD CLASS TEACHER</Text>
                        <Text style={styles.teacherName}>
                          {assignedTeacher?.name || "Pending Teacher Assignment"}
                        </Text>
                      </View>
                    </View>

                    {/* Capacity Progress Bar */}
                    <View style={styles.capacityBox}>
                      <View style={styles.capacityHeaderRow}>
                        <Text style={styles.capacityLabel}>ENROLLMENT CAPACITY</Text>
                        <Text style={styles.capacityVal}>
                          {studentCount} / {capacity} Students ({percentCapacity}%)
                        </Text>
                      </View>
                      <View style={styles.capacityTrack}>
                        <View
                          style={[
                            styles.capacityFill,
                            {
                              width: `${percentCapacity}%`,
                              backgroundColor:
                                percentCapacity > 85 ? colors.orange : colors.indigo,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Card Footer Actions */}
                  <View style={styles.classCardFooter}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon name="people" size={14} color={colors.muted} />
                      <Text style={styles.cardFooterSub}>Tap to view students & manage</Text>
                    </View>

                    <View style={styles.managePill}>
                      <Text style={styles.managePillText}>Manage Class</Text>
                      <Icon name="chevron" size={12} color={colors.indigo} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={filterModal}
        onClose={() => setFilterModal(false)}
        title="Filter Classrooms by Grade"
        groups={filterGroups}
        selectedFilters={{
          level: selectedLevelFilter,
        }}
        onSelectFilter={handleSelectFilter}
        onReset={handleResetFilters}
      />

      {/* Classroom Details & Management Modal Sheet */}
      {activeClass && (
        <ModalSheet
          visible={!!activeClass}
          onClose={() => setActiveClass(null)}
          title={activeClass.name}
          subtitle={`Class Code: ${activeClass.code} · Tuition & Dues: ${money(activeClass.termFee || 15000000)}`}
        >
          <View style={{ gap: 14 }}>
            {/* Quick Action Toolbar */}
            <View style={styles.classActionBar}>
              <Pressable
                onPress={() => setAnnounceModal(true)}
                style={styles.actionToolBtn}
              >
                <Icon name="notification" size={16} color={colors.orange} />
                <Text style={styles.actionToolText}>Announce</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setActiveClass(null);
                  router.push("/(workspace)/messages" as any);
                }}
                style={styles.actionToolBtn}
              >
                <Icon name="sms" size={16} color={colors.indigo} />
                <Text style={styles.actionToolText}>Chat Group</Text>
              </Pressable>

              <Pressable
                onPress={handleExportCSV}
                style={styles.actionToolBtn}
              >
                <Icon name="document" size={16} color={colors.greenDark} />
                <Text style={styles.actionToolText}>Export CSV</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setActiveClass(null);
                  router.push("/directory");
                }}
                style={styles.actionToolBtn}
              >
                <Icon name="userAdd" size={16} color={colors.navy} />
                <Text style={styles.actionToolText}>Staff</Text>
              </Pressable>
            </View>

            {/* Student Roster Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.rosterSectionTitle}>
                Enrolled Students ({classStudents.length > 0 ? classStudents.length : 3})
              </Text>
              <Badge text="ACTIVE ROSTER" tone="purple" />
            </View>

            {/* Students List */}
            <ScrollView
              style={{ maxHeight: 280 }}
              contentContainerStyle={{ gap: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {(classStudents.length > 0 ? classStudents : data.students.slice(0, 3)).map((st) => (
                <View key={st.id} style={styles.studentRow}>
                  <Avatar name={st.name} size={36} role="student" />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={styles.studentName}>{st.name}</Text>
                    <Text style={styles.studentMeta}>REF: {st.id} · Guardian: {st.guardianId}</Text>
                  </View>
                  <Badge text="ACTIVE" tone="success" dot />
                </View>
              ))}
            </ScrollView>

            <Button
              title="Close Management View"
              variant="outline"
              size="md"
              onPress={() => setActiveClass(null)}
            />
          </View>
        </ModalSheet>
      )}

      {/* Modal: Class Announcement */}
      <ModalSheet
        visible={announceModal}
        onClose={() => setAnnounceModal(false)}
        title={`Broadcast to ${activeClass?.name}`}
        subtitle="Send an official circular or notice directly to parents and students of this class."
      >
        <Field
          label="Announcement Title *"
          placeholder="e.g. Science Project Submission Reminder"
          value={announceTitle}
          onChangeText={setAnnounceTitle}
          icon="notification"
        />

        <Field
          label="Circular Body *"
          placeholder="Type the message for all pupils and guardians…"
          value={announceBody}
          onChangeText={setAnnounceBody}
        />

        <Button
          title="Dispatch Announcement"
          size="lg"
          variant="primary"
          icon="send"
          disabled={!announceTitle.trim() || !announceBody.trim() || busy}
          loading={busy}
          onPress={handlePostClassAnnouncement}
        />
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  addClassTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addClassTopBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  metricValue: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  metricSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.faint,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
    height: "100%",
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBtnActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  filterDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  classesList: {
    gap: 14,
  },
  classCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  classCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  classIconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.indigoLight,
    alignItems: "center",
    justifyContent: "center",
  },
  classCardName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  classCardTerm: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  classCardBody: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teacherLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  teacherName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  capacityBox: {
    gap: 6,
  },
  capacityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  capacityLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  capacityVal: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  capacityTrack: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  capacityFill: {
    height: "100%",
    borderRadius: 3,
  },
  classCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 10,
  },
  cardFooterSub: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.faint,
  },
  managePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  managePillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.indigo,
  },
  classActionBar: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  actionToolBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionToolText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  rosterSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 10,
  },
  studentName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  studentMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
