import { useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, TextInput, ScrollView } from "react-native";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Row,
  Screen,
  Txt,
  ListItem,
  Section,
  SegmentedControl,
  ModalSheet,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { FilterBottomSheet, FilterGroup } from "../components/FilterBottomSheet";
import { balance, can, money, Role, roles, Staff } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { roleLabels } from "./Entry";

export function Finance() {
  const { data, context, services, act, busy } = useSchool();
  const [view, setView] = useState<"transfers" | "reminders">("transfers");

  const totalOutstanding = data.invoices.reduce((sum, i) => sum + balance(i), 0);
  const pendingPayments = data.payments.filter((p) => p.state === "awaiting confirmation");

  return (
    <Screen
      title="Financial Administration"
      subtitle="Reconciliations, bank transfers and tuition follow-up."
      back={() => router.back()}
    >
      {/* Metric Cards Row */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>OUTSTANDING TUITION</Text>
          <Text style={styles.metricAmount}>{money(totalOutstanding)}</Text>
          <Text style={styles.metricSub}>
            {data.invoices.filter((i) => balance(i) > 0).length} open student invoices
          </Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>PENDING TRANSFERS</Text>
          <Text style={[styles.metricAmount, { color: colors.orange }]}>
            {pendingPayments.length}
          </Text>
          <Text style={styles.metricSub}>Awaiting bursar review</Text>
        </Card>
      </View>

      {/* Quick Navigation Cards */}
      <Card>
        <ListItem
          title="Student Fee Rosters"
          subtitle="View and configure individual class invoices"
          icon="people"
          onPress={() => router.push("/fees")}
        />
        <ListItem
          title="Official Payment Receipts"
          subtitle="Authenticated transactions with QR code"
          icon="receipt"
          onPress={() => router.push("/receipts")}
        />
      </Card>

      <SegmentedControl
        options={[
          { key: "transfers", label: "Bank Transfer Submissions", count: pendingPayments.length },
          { key: "reminders", label: "Payment Reminders" },
        ]}
        selected={view}
        onSelect={setView}
      />

      {view === "transfers" ? (
        <View style={{ gap: 12 }}>
          {pendingPayments.length === 0 ? (
            <Empty
              title="No pending transfers"
              detail="Direct bank transfer submissions from parents will appear here for verification."
              icon="verify"
            />
          ) : (
            pendingPayments.map((p) => (
              <Card key={p.id} style={styles.transferCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ gap: 2 }}>
                    <Text style={styles.transferId}>{p.id}</Text>
                    <Text style={styles.transferDate}>{new Date(p.createdAt).toLocaleString("en-NG")}</Text>
                  </View>
                  <Badge text="AWAITING CONFIRMATION" tone="warning" dot />
                </View>

                <View style={styles.transferAmountBox}>
                  <Text style={styles.transferAmountVal}>{money(p.amount)}</Text>
                  <Text style={styles.transferMethodTag}>Direct Bank Transfer</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Button
                    title="Confirm & Settle"
                    variant="primary"
                    size="md"
                    disabled={busy}
                    loading={busy}
                    icon="check"
                    style={{ flex: 1 }}
                    onPress={() =>
                      void act(
                        () => services.confirmTransfer(context, p.id, true),
                        "Transfer settled. Student fee balance updated.",
                      )
                    }
                  />
                  <Button
                    title="Decline"
                    variant="danger"
                    size="md"
                    disabled={busy}
                    style={{ flex: 1 }}
                    onPress={() =>
                      void act(
                        () => services.confirmTransfer(context, p.id, false),
                        "Transfer declined. Fee balance remains outstanding.",
                      )
                    }
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      ) : (
        /* Reminders Tab */
        <View style={{ gap: 12 }}>
          <Section title="Tuition Follow-Up Notice Generator" subtitle="Send reminders directly to guardians" />
          {data.invoices
            .filter((i) => balance(i) > 0)
            .map((i) => {
              const student = data.students.find((s) => s.id === i.studentId);
              return (
                <Card key={i.id} style={styles.reminderCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.reminderStudentName}>{student?.name || "Student"}</Text>
                      <Text style={styles.reminderClass}>{student?.className} · ID: {student?.id}</Text>
                    </View>
                    <Text style={styles.reminderAmount}>{money(balance(i))}</Text>
                  </View>
                  <Button
                    title="Dispatch Fee Reminder to Guardian"
                    variant="outline"
                    size="sm"
                    icon="notification"
                    disabled={busy}
                    onPress={() =>
                      void act(
                        () => services.remind(context, i.id),
                        `Reminder dispatched to guardian of ${student?.name}.`,
                      )
                    }
                  />
                </Card>
              );
            })}
        </View>
      )}
    </Screen>
  );
}

export function Approvals() {
  const { data, context, services, act, busy } = useSchool();
  const pendingLeaves = data.leaves.filter((l) => l.status === "Submitted");

  return (
    <Screen
      title="Executive Approvals"
      subtitle="Review pending staff leave requests & operational decisions."
      back={() => router.back()}
    >
      {pendingLeaves.length === 0 ? (
        <Empty
          title="All approvals up to date"
          detail="New staff leave submissions will appear here for management decision."
          icon="verify"
        />
      ) : (
        pendingLeaves.map((l) => {
          const staffMember = data.staff.find((s) => s.userId === l.userId);
          return (
            <Card key={l.id} style={styles.approvalCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.approvalStaffName}>{staffMember?.name || l.userId}</Text>
                  <Text style={styles.approvalStaffTitle}>{staffMember?.title || "Staff Member"}</Text>
                </View>
                <Badge text={l.status.toUpperCase()} tone="warning" dot />
              </View>

              <View style={styles.approvalMetaBox}>
                <View style={styles.approvalMetaRow}>
                  <Text style={styles.approvalMetaLabel}>Leave Type</Text>
                  <Text style={styles.approvalMetaVal}>{l.type} Leave</Text>
                </View>
                <View style={styles.approvalMetaRow}>
                  <Text style={styles.approvalMetaLabel}>Duration</Text>
                  <Text style={styles.approvalMetaVal}>
                    {l.start} → {l.end}
                  </Text>
                </View>
                <View style={{ gap: 2, marginTop: 4 }}>
                  <Text style={styles.approvalMetaLabel}>Reason</Text>
                  <Text style={styles.approvalReasonText}>{l.reason}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  title="Approve Leave"
                  variant="primary"
                  size="md"
                  icon="check"
                  disabled={busy}
                  style={{ flex: 1 }}
                  onPress={() =>
                    void act(
                      () => services.decideLeave(context, l.id, true),
                      "Staff leave approved and synced to school calendar.",
                    )
                  }
                />
                <Button
                  title="Decline"
                  variant="danger"
                  size="md"
                  disabled={busy}
                  style={{ flex: 1 }}
                  onPress={() =>
                    void act(
                      () => services.decideLeave(context, l.id, false),
                      "Leave request declined.",
                    )
                  }
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

export function Directory() {
  const { data, context, services, act, busy } = useSchool();
  const [search, setSearch] = useState("");
  const [filterModal, setFilterModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [manageStaff, setManageStaff] = useState<Staff | null>(null);

  // Filter State
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Invite Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("teacher");
  const [inviteTitle, setInviteTitle] = useState("Senior Class Teacher");
  const [inviteClasses, setInviteClasses] = useState<string[]>(["Primary 1 Gold"]);

  // Manage Form State
  const [editRole, setEditRole] = useState<Role>("teacher");
  const [editTitle, setEditTitle] = useState("");
  const [editClasses, setEditClasses] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<"active" | "invited" | "suspended">("active");

  const isOwner = context.role === "owner" || context.role === "admin";

  // Available classes in the school
  const allClassNames =
    data.classes && data.classes.length > 0
      ? data.classes.map((c) => c.name)
      : ["Primary 1 Gold", "Primary 2 Emerald", "Primary 4 Diamond", "JSS 1 Silver", "SSS 1 Topaz"];

  // Filter staff roster
  const staff = data.staff.filter((s) => {
    const matchesSearch =
      search.trim() === "" ||
      (s.name + s.id + s.title + s.email).toLowerCase().includes(search.toLowerCase());

    const staffRole = s.role || "teacher";
    const matchesRole =
      selectedRoleFilter === "all" || staffRole === selectedRoleFilter;

    const matchesStatus =
      selectedStatusFilter === "all" || (s.status || "active") === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const isFiltered = selectedRoleFilter !== "all" || selectedStatusFilter !== "all";

  const filterGroups: FilterGroup[] = [
    {
      id: "role",
      title: "Faculty Role & Department",
      options: [
        { key: "all", label: "All Roles" },
        { key: "teacher", label: "Class Teachers" },
        { key: "finance", label: "Bursary & Finance" },
        { key: "admin", label: "Administration" },
        { key: "hr", label: "Human Resources" },
        { key: "staff", label: "General Support" },
      ],
    },
    {
      id: "status",
      title: "Credential Status",
      options: [
        { key: "all", label: "All Statuses" },
        { key: "active", label: "Active" },
        { key: "invited", label: "Invited (Pending)" },
        { key: "suspended", label: "Suspended" },
      ],
    },
  ];

  const handleSelectFilter = (groupId: string, val: string) => {
    if (groupId === "role") setSelectedRoleFilter(val);
    if (groupId === "status") setSelectedStatusFilter(val);
  };

  const handleResetFilters = () => {
    setSelectedRoleFilter("all");
    setSelectedStatusFilter("all");
  };

  const toggleInviteClass = (clsName: string) => {
    setInviteClasses((prev) =>
      prev.includes(clsName)
        ? prev.filter((c) => c !== clsName)
        : [...prev, clsName],
    );
  };

  const toggleEditClass = (clsName: string) => {
    setEditClasses((prev) =>
      prev.includes(clsName)
        ? prev.filter((c) => c !== clsName)
        : [...prev, clsName],
    );
  };

  const openManageStaff = (s: Staff) => {
    if (!isOwner) return;
    setManageStaff(s);
    setEditRole((s.role || "teacher") as Role);
    setEditTitle(s.title);
    setEditStatus((s.status as any) || "active");
    const assigned = s.assignedClasses && s.assignedClasses.length > 0
      ? s.assignedClasses
      : s.assignedClass
        ? [s.assignedClass]
        : [];
    setEditClasses(assigned);
  };

  const handleSaveStaffManage = async () => {
    if (!manageStaff) return;
    await act(
      () =>
        services.updateStaff(context, manageStaff.id, {
          role: editRole,
          title: editTitle.trim() || roleLabels[editRole],
          assignedClasses: editClasses,
          assignedClass: editClasses[0] || undefined,
          status: editStatus,
        }),
      `Updated credentials and classroom allocations for ${manageStaff.name}!`,
    );
    setManageStaff(null);
  };

  const handleInviteStaff = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      alert("Please provide staff name and email address.");
      return;
    }

    await act(
      () =>
        services.inviteStaff(context, {
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          phone: invitePhone.trim() || "08012345678",
          role: inviteRole,
          title: inviteTitle.trim() || roleLabels[inviteRole],
          assignedClasses: inviteRole === "teacher" ? inviteClasses : undefined,
          assignedClass: inviteRole === "teacher" ? inviteClasses[0] : undefined,
        }),
      `Invited ${inviteName.trim()} with role ${roleLabels[inviteRole]}. Credentials dispatched!`,
    );

    setInviteName("");
    setInviteEmail("");
    setInviteClasses(["Primary 1 Gold"]);
    setInviteModal(false);
  };

  return (
    <View style={styles.directoryRoot}>
      {/* Reusable Clean TopBar Touching Status Bar */}
      <TopBar
        title="Faculty & Staff"
        onBack={() => router.back()}
        rightAction={
          isOwner ? (
            <Pressable
              onPress={() => router.push("/invite-staff" as any)}
              style={styles.topBarInviteBtn}
              hitSlop={8}
            >
              <Icon name="userAdd" size={16} color="#ffffff" filled />
              <Text style={styles.topBarInviteBtnText}>Invite</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Search Bar + Filter Button Row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, shadows.sm]}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search faculty by name, title or ID…"
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

        {/* Filter Button beside Search */}
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

      {/* Faculty Cards Roster */}
      <ScrollView
        contentContainerStyle={styles.staffScroll}
        showsVerticalScrollIndicator={false}
      >
        {staff.length === 0 ? (
          <Empty
            title="No staff members found"
            detail="Try adjusting your search or filters to see faculty members."
            icon="people"
          />
        ) : (
          staff.map((s) => {
            const classesList =
              s.assignedClasses && s.assignedClasses.length > 0
                ? s.assignedClasses
                : s.assignedClass
                  ? [s.assignedClass]
                  : [];

            const membership = data.memberships.find((m) => m.userId === s.userId);

            const staffRole: Role = (s.role || "teacher") as Role;

            return (
              <Pressable
                key={s.id}
                onPress={() =>
                  router.push({
                    pathname: "/staff-detail",
                    params: { id: s.id },
                  } as any)
                }
                style={[styles.staffCard, shadows.sm]}
              >
                {/* Header Row: Avatar, Name, Title, Role Pill */}
                <View style={styles.staffCardHeader}>
                  <View style={styles.staffAvatarWrap}>
                    <Avatar
                      uri={membership?.avatar}
                      name={s.name}
                      size={48}
                      role={staffRole}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Badge
                        text={roleLabels[staffRole] || staffRole.toUpperCase()}
                        tone={
                          staffRole === "teacher"
                            ? "purple"
                            : staffRole === "finance"
                              ? "warning"
                              : staffRole === "admin"
                                ? "dark"
                                : "neutral"
                        }
                      />
                    </View>

                    {/* Faculty Rank Badge */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={styles.rankBadge}>
                        <Icon name="verify" size={11} color={colors.orange} filled />
                        <Text style={styles.rankBadgeText}>{s.rank || "Staff Fellow"}</Text>
                      </View>
                    </View>

                    <Text style={styles.staffTitleText} numberOfLines={1}>
                      {s.title} · {s.email}
                    </Text>
                  </View>
                </View>

                {/* Assigned Classes Multi-Pills */}
                <View style={styles.assignedClassesContainer}>
                  <Text style={styles.assignedClassesLabel}>CLASSES:</Text>
                  <View style={styles.classesChipsRow}>
                    {classesList.length > 0 ? (
                      classesList.map((clsName, idx) => (
                        <View key={idx} style={styles.classChip}>
                          <Icon name="school" size={11} color={colors.indigoText} />
                          <Text style={styles.classChipText}>{clsName}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noClassesText}>
                        {staffRole === "teacher"
                          ? "No classrooms assigned"
                          : "Non-teaching administrative staff"}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Footer Row: Staff ID, Status, Manage Action */}
                <View style={styles.staffCardFooter}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.staffIdBadge}>REF: {s.id}</Text>
                    <Badge
                      text={(s.status || "active").toUpperCase()}
                      tone={
                        s.status === "suspended"
                          ? "danger"
                          : s.status === "invited"
                            ? "warning"
                            : "success"
                      }
                      dot
                    />
                  </View>

                  {isOwner && (
                    <View style={styles.managePill}>
                      <Text style={styles.managePillText}>Manage</Text>
                      <Icon name="chevron" size={13} color={colors.indigo} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={filterModal}
        onClose={() => setFilterModal(false)}
        title="Filter Faculty Staff"
        groups={filterGroups}
        selectedFilters={{
          role: selectedRoleFilter,
          status: selectedStatusFilter,
        }}
        onSelectFilter={handleSelectFilter}
        onReset={handleResetFilters}
      />

      {/* Modal: Invite Staff Member with Multi-Class Selection */}
      <ModalSheet
        visible={inviteModal}
        onClose={() => setInviteModal(false)}
        title="Invite Staff Member"
        subtitle="Proprietor tool: Delegate roles and allocate classrooms."
      >
        <Field
          label="Full Name *"
          placeholder="e.g. Babatunde Fashola"
          value={inviteName}
          onChangeText={setInviteName}
          icon="profile"
        />

        <Field
          label="Email Address *"
          placeholder="e.g. bfashola@school.edu.ng"
          email
          value={inviteEmail}
          onChangeText={setInviteEmail}
          icon="document"
        />

        <Field
          label="Phone Number"
          placeholder="e.g. 08034567890"
          value={invitePhone}
          onChangeText={setInvitePhone}
        />

        <Field
          label="Job Title"
          placeholder="e.g. Senior Mathematics Teacher"
          value={inviteTitle}
          onChangeText={setInviteTitle}
        />

        {/* Role Picker */}
        <View style={{ gap: 8 }}>
          <Txt tone="label">Assigned Role & System Permissions</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["teacher", "finance", "hr", "admin", "staff"] as Role[]).map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setInviteRole(r);
                  setInviteTitle(roleLabels[r]);
                }}
                style={[
                  styles.rolePickChip,
                  inviteRole === r && styles.rolePickChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.rolePickChipText,
                    inviteRole === r && styles.rolePickChipTextActive,
                  ]}
                >
                  {roleLabels[r]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Multi-Select Classrooms Selector */}
        {inviteRole === "teacher" && (
          <View style={{ gap: 8 }}>
            <Txt tone="label">Assigned Classrooms (Staff can belong to multiple classes)</Txt>
            <View style={styles.multiClassGrid}>
              {allClassNames.map((cls) => {
                const isSelected = inviteClasses.includes(cls);
                return (
                  <Pressable
                    key={cls}
                    onPress={() => toggleInviteClass(cls)}
                    style={[
                      styles.classSelectChip,
                      isSelected && styles.classSelectChipActive,
                    ]}
                  >
                    <Icon
                      name={isSelected ? "check" : "school"}
                      size={14}
                      color={isSelected ? "#ffffff" : colors.indigoText}
                      filled={isSelected}
                    />
                    <Text
                      style={[
                        styles.classSelectChipText,
                        isSelected && styles.classSelectChipTextActive,
                      ]}
                    >
                      {cls}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Button
          title="Dispatch Staff Invitation"
          size="lg"
          variant="primary"
          icon="userAdd"
          disabled={busy}
          loading={busy}
          onPress={handleInviteStaff}
        />
      </ModalSheet>

      {/* Modal: Proprietor Manage Staff Member */}
      {manageStaff && (
        <ModalSheet
          visible={!!manageStaff}
          onClose={() => setManageStaff(null)}
          title={`Manage ${manageStaff.name}`}
          subtitle="Update roles, classroom allocations, or faculty status."
        >
          <Field
            label="Job Title"
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="e.g. Head of Science"
          />

          {/* Role Picker */}
          <View style={{ gap: 8 }}>
            <Txt tone="label">System Role</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["teacher", "finance", "hr", "admin", "staff"] as Role[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setEditRole(r)}
                  style={[
                    styles.rolePickChip,
                    editRole === r && styles.rolePickChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rolePickChipText,
                      editRole === r && styles.rolePickChipTextActive,
                    ]}
                  >
                    {roleLabels[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Multi-Class Assignment */}
          <View style={{ gap: 8 }}>
            <Txt tone="label">Assigned Classrooms</Txt>
            <View style={styles.multiClassGrid}>
              {allClassNames.map((cls) => {
                const isSelected = editClasses.includes(cls);
                return (
                  <Pressable
                    key={cls}
                    onPress={() => toggleEditClass(cls)}
                    style={[
                      styles.classSelectChip,
                      isSelected && styles.classSelectChipActive,
                    ]}
                  >
                    <Icon
                      name={isSelected ? "check" : "school"}
                      size={14}
                      color={isSelected ? "#ffffff" : colors.indigoText}
                      filled={isSelected}
                    />
                    <Text
                      style={[
                        styles.classSelectChipText,
                        isSelected && styles.classSelectChipTextActive,
                      ]}
                    >
                      {cls}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Status Picker */}
          <View style={{ gap: 8 }}>
            <Txt tone="label">Status</Txt>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["active", "invited", "suspended"] as const).map((st) => (
                <Pressable
                  key={st}
                  onPress={() => setEditStatus(st)}
                  style={[
                    styles.rolePickChip,
                    editStatus === st && styles.rolePickChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rolePickChipText,
                      editStatus === st && styles.rolePickChipTextActive,
                    ]}
                  >
                    {st.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Button
            title="Save Staff Updates"
            size="lg"
            variant="primary"
            icon="check"
            disabled={busy}
            loading={busy}
            onPress={handleSaveStaffManage}
          />
        </ModalSheet>
      )}
    </View>
  );
}

export function Payroll() {
  const { data, context, services, act, busy } = useSchool();
  const [payrollMode, setPayrollMode] = useState<"automatic" | "manual">("automatic");
  const [editModal, setEditModal] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);

  // Manual Adjustment State
  const [editBasic, setEditBasic] = useState("");
  const [editAllowances, setEditAllowances] = useState("");
  const [editDeductions, setEditDeductions] = useState("");

  const isOwner = context.role === "owner" || context.role === "admin";

  const totalPayrollCost = data.payroll.reduce(
    (sum, p) => sum + p.basic + p.allowances - p.deductions,
    0,
  );

  const handleOpenEdit = (p: typeof data.payroll[0]) => {
    setSelectedPayrollId(p.id);
    setEditBasic(String(p.basic / 100));
    setEditAllowances(String(p.allowances / 100));
    setEditDeductions(String(p.deductions / 100));
    setEditModal(true);
  };

  const handleSaveManualEdit = async () => {
    if (!selectedPayrollId) return;
    await act(
      () =>
        services.updatePayroll(context, selectedPayrollId, {
          basic: Math.round((Number(editBasic) || 0) * 100),
          allowances: Math.round((Number(editAllowances) || 0) * 100),
          deductions: Math.round((Number(editDeductions) || 0) * 100),
          status: "Draft",
        }),
      "Payroll adjustments saved.",
    );
    setEditModal(false);
  };

  const handleRunAutoDisburse = async () => {
    await act(
      () => services.processAutomaticPayroll(context),
      `Disbursed monthly salaries for ${data.payroll.length} staff members!`,
    );
  };

  return (
    <Screen
      title="Automated & Manual Payroll"
      subtitle="October 2026 Salary Administration · Scoped to Authorized Leadership."
      back={() => router.back()}
    >
      {/* Total Payroll Cost Card */}
      <Card variant="dark" style={styles.payrollHeroCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.payrollHeroLabel}>MONTHLY SALARY DISBURSEMENT</Text>
          <Badge text={payrollMode.toUpperCase() + " PROCESSING"} tone="dark" />
        </View>

        <View style={{ gap: 4 }}>
          <Text style={styles.payrollHeroAmount}>{money(totalPayrollCost)}</Text>
          <Text style={styles.payrollHeroSub}>
            {data.payroll.length} enrolled staff members across academic & administrative departments
          </Text>
        </View>

        {isOwner && (
          <Button
            title="Process & Disburse Automatic Payroll"
            variant="primary"
            size="lg"
            icon="wallet"
            disabled={busy}
            loading={busy}
            onPress={handleRunAutoDisburse}
          />
        )}
      </Card>

      {isOwner && (
        <SegmentedControl
          options={[
            { key: "automatic", label: "Automatic Payroll Mode" },
            { key: "manual", label: "Manual Adjustment Mode" },
          ]}
          selected={payrollMode}
          onSelect={setPayrollMode}
        />
      )}

      {/* Staff Payslip List */}
      <Section
        title="Staff Salary Structures"
        subtitle={
          payrollMode === "automatic"
            ? "Rule-based salary schedules with auto-deductions"
            : "Tap any staff member to manually adjust allowances or bonuses"
        }
      />

      <View style={{ gap: 12 }}>
        {data.payroll.map((p) => {
          const staffMember = data.staff.find((s) => s.userId === p.userId);
          const netPay = p.basic + p.allowances - p.deductions;
          return (
            <Card key={p.id} style={styles.payslipCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.payslipStaffName}>{staffMember?.name || p.userId}</Text>
                  <Text style={styles.payslipStaffTitle}>{staffMember?.title || "Staff Member"}</Text>
                </View>
                <Badge
                  text={p.status === "Paid" ? "DISBURSED" : "DRAFT PAYSLIP"}
                  tone={p.status === "Paid" ? "success" : "warning"}
                  dot
                />
              </View>

              <View style={styles.payslipBreakdownBox}>
                <View style={styles.payslipRow}>
                  <Text style={styles.payslipLabel}>Basic Salary</Text>
                  <Text style={styles.payslipVal}>{money(p.basic)}</Text>
                </View>
                <View style={styles.payslipRow}>
                  <Text style={styles.payslipLabel}>Allowances & Bonuses</Text>
                  <Text style={[styles.payslipVal, { color: colors.green }]}>+{money(p.allowances)}</Text>
                </View>
                <View style={styles.payslipRow}>
                  <Text style={styles.payslipLabel}>Tax & Pension Deductions</Text>
                  <Text style={[styles.payslipVal, { color: colors.red }]}>-{money(p.deductions)}</Text>
                </View>
              </View>

              <View style={styles.payslipNetRow}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.payslipNetLabel}>NET SALARY PAYOUT</Text>
                  <Text style={styles.payslipNetAmount}>{money(netPay)}</Text>
                </View>
                {isOwner && payrollMode === "manual" && (
                  <Button
                    title="Edit Salary"
                    size="sm"
                    variant="outline"
                    icon="edit"
                    onPress={() => handleOpenEdit(p)}
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>

      {/* Modal: Edit Staff Salary */}
      <ModalSheet
        visible={editModal}
        onClose={() => setEditModal(false)}
        title="Manual Salary Adjustments"
        subtitle="Update basic pay, allowances or deductions."
      >
        <Field
          label="Basic Salary (₦) *"
          placeholder="180000"
          numeric
          value={editBasic}
          onChangeText={setEditBasic}
          icon="wallet"
        />

        <Field
          label="Allowances / Bonuses (₦)"
          placeholder="25000"
          numeric
          value={editAllowances}
          onChangeText={setEditAllowances}
        />

        <Field
          label="Deductions / Loans (₦)"
          placeholder="15000"
          numeric
          value={editDeductions}
          onChangeText={setEditDeductions}
        />

        <Button
          title="Save Salary Adjustment"
          size="lg"
          variant="primary"
          onPress={handleSaveManualEdit}
        />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    gap: 6,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  metricAmount: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
  },
  metricSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  transferCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    gap: 14,
  },
  transferId: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  transferDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  transferAmountBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    borderRadius: 14,
    gap: 2,
  },
  transferAmountVal: {
    fontFamily: fonts.extra,
    fontSize: 22,
    color: colors.navy,
  },
  transferMethodTag: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  reminderCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    gap: 12,
  },
  reminderStudentName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  reminderClass: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  reminderAmount: {
    fontFamily: fonts.extra,
    fontSize: 16,
    color: colors.orange,
  },
  approvalCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#ffffff",
    gap: 14,
  },
  approvalStaffName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  approvalStaffTitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  approvalMetaBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: 14,
    borderRadius: 14,
    gap: 6,
  },
  approvalMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  approvalMetaLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  approvalMetaVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  approvalReasonText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.inkSecondary,
    lineHeight: 18,
  },
  rolePickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolePickChipActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  rolePickChipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  rolePickChipTextActive: {
    color: "#ffffff",
  },
  payrollHeroCard: {
    padding: 22,
    gap: 16,
    backgroundColor: colors.navyDark,
    borderColor: colors.navyBorder,
  },
  payrollHeroLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: "#94a3b8",
  },
  payrollHeroAmount: {
    fontFamily: fonts.extra,
    fontSize: 34,
    color: "#ffffff",
    letterSpacing: -1,
  },
  payrollHeroSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#cbd5e1",
    lineHeight: 18,
  },
  payslipCard: {
    padding: 18,
    gap: 14,
  },
  payslipStaffName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  payslipStaffTitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  payslipBreakdownBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  payslipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payslipLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  payslipVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  payslipNetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 10,
  },
  payslipNetLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.7,
    color: colors.muted,
  },
  payslipNetAmount: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  // Directory & Staff Governance Styles
  directoryRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBarInviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  topBarInviteBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  staffScroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  staffCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  staffCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  staffAvatarWrap: {
    borderWidth: 2,
    borderColor: colors.surfaceSubtle,
    borderRadius: 26,
  },
  staffName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  staffTitleText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rankBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.orange,
  },
  assignedClassesContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  assignedClassesLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  classesChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  classChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.indigoLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  classChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.indigoText,
  },
  noClassesText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.faint,
    fontStyle: "italic",
  },
  staffCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 10,
  },
  staffIdBadge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.4,
  },
  managePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
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
  multiClassGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  classSelectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  classSelectChipActive: {
    backgroundColor: colors.indigo,
    borderColor: colors.indigo,
  },
  classSelectChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  classSelectChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
});
