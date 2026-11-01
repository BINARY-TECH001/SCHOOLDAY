import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  ListItem,
  Screen,
  Section,
  Txt,
  colors,
  fonts,
  SegmentedControl,
  ModalSheet,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { balance, can, invoiceStatus, money, total, Student, SchoolClass } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { IdentityCode } from "../components/IdentityCode";

export function Fees() {
  const { child } = useLocalSearchParams<{ child?: string }>();
  const { data, context, services, act, busy, school } = useSchool();
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [activeTab, setActiveTab] = useState<"students" | "classes" | "csv_import">("students");
  const [showIdentity, setShowIdentity] = useState(false);

  // Class Creator Modal State
  const [createClassModal, setCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassFee, setNewClassFee] = useState("180000");

  // Single Student Registration Modal State
  const [createStudentModal, setCreateStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("Primary 1 Gold");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newGuardianPhone, setNewGuardianPhone] = useState("");

  // CSV Import State
  const [csvText, setCsvText] = useState(
    `Name, Class, Guardian, Phone, Fee
Chinedu Obi, Primary 4 Diamond, Ngozi Obi, 08023456789, 180000
Fatima Aliyu, Primary 1 Gold, Usman Aliyu, 08034567890, 150000
Babatunde Adeleke, Primary 2 Emerald, Folake Adeleke, 08045678901, 150000
Kamsi Okonkwo, JSS 1 Sapphire, Emeka Okonkwo, 08056789012, 220000`
  );
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const isParent = context.role === "parent";
  const isOwner = context.role === "owner" || context.role === "admin";
  const isTeacher = context.role === "teacher";

  // Filter students
  const filteredStudents = data.students.filter((s) => {
    const matchesChild = !child || s.id === child;
    const matchesSearch =
      (s.name + s.id + s.className).toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClass === "all" || s.className === filterClass;
    return matchesChild && matchesSearch && matchesClass;
  });

  const selectedChild = child
    ? data.students.find((s) => s.id === child)
    : filteredStudents[0];

  const childInvoices = selectedChild
    ? data.invoices.filter((i) => i.studentId === selectedChild.id)
    : [];

  const childTotalBalance = childInvoices.reduce((sum, i) => sum + balance(i), 0);

  // Handle Class Creation
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    const feeInKobo = Math.round((Number(newClassFee) || 150000) * 100);
    await act(
      () =>
        services.createClass(context, {
          name: newClassName.trim(),
          termFee: feeInKobo,
        }),
      `Class ${newClassName.trim()} created with fee ${money(feeInKobo)}`,
    );
    setNewClassName("");
    setCreateClassModal(false);
  };

  // Handle Single Student Creation
  const handleCreateStudent = async () => {
    if (!newStudentName.trim()) return;
    await act(
      () =>
        services.addStudentsBatch(context, [
          {
            name: newStudentName.trim(),
            className: newStudentClass,
            guardianName: newGuardianName.trim() || "Guardian",
            guardianPhone: newGuardianPhone.trim() || "08012345678",
          },
        ]),
      `Student ${newStudentName.trim()} enrolled in ${newStudentClass}`,
    );
    setNewStudentName("");
    setCreateStudentModal(false);
  };

  // Handle CSV Bulk Import
  const handleCsvImport = async () => {
    const lines = csvText.trim().split("\n").filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      alert("Please provide at least one student row in CSV format.");
      return;
    }

    const studentsToImport: Array<{
      name: string;
      className: string;
      guardianName?: string;
      guardianPhone?: string;
      feeAmount?: number;
    }> = [];

    // Skip header row if present
    const startIndex = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i]!.split(",").map((p) => p.trim());
      if (parts[0] && parts[1]) {
        studentsToImport.push({
          name: parts[0],
          className: parts[1],
          guardianName: parts[2] || "Guardian",
          guardianPhone: parts[3] || "08012345678",
          feeAmount: parts[4] ? Number(parts[4]) * 100 : 15000000,
        });
      }
    }

    if (studentsToImport.length === 0) {
      alert("No valid student rows found. Expected: Name, Class, Guardian, Phone, Fee");
      return;
    }

    await act(async () => {
      const count = await services.addStudentsBatch(context, studentsToImport);
      setImportSummary(`Successfully imported ${count} students with generated term invoices!`);
    }, `Bulk import of ${studentsToImport.length} students complete.`);
  };

  return (
    <Screen
      title={
        child && selectedChild
          ? `${selectedChild.name.split(" ")[0]}’s School Fees`
          : "Classes & Student Fees"
      }
      subtitle={
        child && selectedChild
          ? `${selectedChild.className} · ID: ${selectedChild.id}`
          : "Manage student enrollments, class payments and CSV rosters."
      }
      back={() => router.back()}
    >
      {/* Top Segment Switcher (Hidden when viewing specific child details) */}
      {!child && !isParent && (
        <SegmentedControl
          options={[
            { key: "students", label: "Students & Fees", count: data.students.length },
            { key: "classes", label: "Classes & Rosters", count: data.classes?.length || 5 },
            { key: "csv_import", label: "CSV Bulk Import" },
          ]}
          selected={activeTab}
          onSelect={setActiveTab}
        />
      )}

      {/* VIEW: Child Specific Details (for parent or fee inspection) */}
      {child && selectedChild ? (
        <View style={{ gap: 14 }}>
          {/* Outstanding Balance Banner */}
          <Card variant="dark" style={styles.childHeroCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.childHeroBadge}>OUTSTANDING TUITION & LEVIES</Text>
              <Badge
                text={childTotalBalance === 0 ? "ALL FEES CLEARED" : "PAYMENT DUE"}
                tone={childTotalBalance === 0 ? "success" : "warning"}
                dot
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.childHeroAmount}>{money(childTotalBalance)}</Text>
              <Text style={styles.childHeroSub}>
                {selectedChild.name} · {selectedChild.className} · {school.term}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {childTotalBalance > 0 && (
                <Button
                  title="Pay Balance Now"
                  variant="primary"
                  icon="wallet"
                  onPress={() => router.push({ pathname: "/payment" })}
                />
              )}
              <Button
                title={showIdentity ? "Hide Student ID" : "View Digital ID"}
                variant="outline"
                icon="verify"
                onPress={() => setShowIdentity(!showIdentity)}
              />
            </View>
          </Card>

          {/* Student Digital Identity Card */}
          {showIdentity && (
            <Card style={styles.idCardContainer}>
              <View style={styles.idCardHeader}>
                <View style={styles.idBadgePill}>
                  <Icon name="school" size={14} color="#ffffff" filled />
                  <Text style={styles.idBadgeText}>OFFICIAL STUDENT ID</Text>
                </View>
                <Badge text="VERIFIED ENROLLMENT" tone="success" dot />
              </View>

              <View style={{ alignItems: "center", gap: 8, paddingVertical: 12 }}>
                <IdentityCode reference={`student_${selectedChild.id}`} />
                <Text style={styles.idStudentName}>{selectedChild.name}</Text>
                <Text style={styles.idStudentClass}>{selectedChild.className} · {school.name}</Text>
                <Text style={styles.idStudentNumber}>ID: {selectedChild.id}</Text>
              </View>
            </Card>
          )}

          {/* Breakdown of Invoices */}
          <Section title="Fee Structure Breakdown" subtitle="Termly invoices and itemized levies" />

          {childInvoices.map((inv) => (
            <Card key={inv.id} style={styles.invoiceCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.invoiceId}>{inv.id}</Text>
                  <Text style={styles.invoiceDue}>Due Date: {inv.due}</Text>
                </View>
                <Badge text={invoiceStatus(inv)} />
              </View>

              <View style={styles.invoiceItemsList}>
                {inv.items.map((item, idx) => (
                  <View key={idx} style={styles.invoiceItemRow}>
                    <Text style={styles.invoiceItemLabel}>{item.label}</Text>
                    <Text style={styles.invoiceItemAmount}>{money(item.amount)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.invoiceFooterRow}>
                <View style={{ gap: 2 }}>
                  <Text style={styles.invoiceTotalLabel}>TOTAL INVOICE</Text>
                  <Text style={styles.invoiceTotalAmount}>{money(total(inv))}</Text>
                </View>
                <View style={{ gap: 2, alignItems: "flex-end" }}>
                  <Text style={styles.invoiceTotalLabel}>OUTSTANDING</Text>
                  <Text style={[styles.invoiceTotalAmount, { color: balance(inv) > 0 ? colors.red : colors.green }]}>
                    {money(balance(inv))}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : activeTab === "students" ? (
        /* VIEW: All Students & Fees List */
        <View style={{ gap: 14 }}>
          {/* Search & Actions Bar */}
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Field
                label=""
                placeholder="Search student by name, class or ID…"
                value={search}
                onChangeText={setSearch}
                icon="search"
              />
            </View>
            {isOwner && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  title="Defaulters"
                  variant="outline"
                  icon="sms"
                  size="md"
                  onPress={() => router.push("/defaulters")}
                />
                <Button
                  title="Add Student"
                  variant="primary"
                  icon="add"
                  size="md"
                  onPress={() => setCreateStudentModal(true)}
                />
              </View>
            )}
          </View>

          {/* Class Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {["all", "Primary 1 Gold", "Primary 2 Emerald", "Primary 4 Diamond", "JSS 1 Sapphire", "SSS 1 Titanium"].map(
              (cls) => (
                <Pressable
                  key={cls}
                  onPress={() => setFilterClass(cls)}
                  style={[
                    styles.classFilterChip,
                    filterClass === cls && styles.classFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.classFilterChipText,
                      filterClass === cls && styles.classFilterChipTextActive,
                    ]}
                  >
                    {cls === "all" ? "All Classes" : cls}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>

          {/* Students List */}
          <Card>
            {filteredStudents.length === 0 ? (
              <Empty
                title="No students found"
                detail="Try a different search query or add a new student."
                icon="people"
              />
            ) : (
              filteredStudents.map((s) => {
                const sBalance = data.invoices
                  .filter((i) => i.studentId === s.id)
                  .reduce((sum, i) => sum + balance(i), 0);
                return (
                  <ListItem
                    key={s.id}
                    title={s.name}
                    subtitle={`${s.className} · ID: ${s.id}`}
                    icon="profile"
                    trailing={money(sBalance)}
                    badge={sBalance === 0 ? "Paid" : "Due"}
                    badgeTone={sBalance === 0 ? "success" : "warning"}
                    onPress={() =>
                      router.push({ pathname: "/fees", params: { child: s.id } })
                    }
                  />
                );
              })
            )}
          </Card>
        </View>
      ) : activeTab === "classes" ? (
        /* VIEW: Classes & Rosters Management */
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Section title="Academic Classes" subtitle="Grade levels, student headcount and fees" />
            {isOwner && (
              <Button
                title="Create Class"
                variant="primary"
                size="sm"
                icon="add"
                onPress={() => setCreateClassModal(true)}
              />
            )}
          </View>

          <View style={{ gap: 12 }}>
            {(data.classes || []).map((cls) => {
              const classStudents = data.students.filter((s) => s.className === cls.name);
              const classTotalBilled = data.invoices
                .filter((i) => classStudents.some((s) => s.id === i.studentId))
                .reduce((sum, i) => sum + total(i), 0);
              const classTotalCollected = data.invoices
                .filter((i) => classStudents.some((s) => s.id === i.studentId))
                .reduce((sum, i) => sum + i.paid, 0);

              return (
                <Card key={cls.id} style={styles.classCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={styles.classIconTile}>
                        <Icon name="school" size={20} color={colors.navy} />
                      </View>
                      <View style={{ gap: 2 }}>
                        <Text style={styles.classNameText}>{cls.name}</Text>
                        <Text style={styles.classCodeText}>
                          Code: {cls.code} · Term Fee: {money(cls.termFee)}
                        </Text>
                      </View>
                    </View>
                    <Badge text={`${cls.studentCount || classStudents.length} Students`} tone="info" />
                  </View>

                  <View style={styles.classRevenueRow}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.classRevenueLabel}>TOTAL BILLED</Text>
                      <Text style={styles.classRevenueVal}>{money(classTotalBilled)}</Text>
                    </View>
                    <View style={{ gap: 2, alignItems: "flex-end" }}>
                      <Text style={styles.classRevenueLabel}>COLLECTED</Text>
                      <Text style={[styles.classRevenueVal, { color: colors.green }]}>
                        {money(classTotalCollected)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      ) : (
        /* VIEW: CSV Bulk Importer */
        <Card style={styles.csvCard}>
          <View style={{ gap: 4 }}>
            <Text style={styles.csvTitle}>CSV Student & Class Bulk Importer</Text>
            <Text style={styles.csvSub}>
              Paste CSV data below or edit the sample template. Invoices and fee structures will be automatically generated.
            </Text>
          </View>

          <View style={styles.csvFormatGuide}>
            <Text style={styles.csvFormatGuideTitle}>FORMAT: Name, Class, Guardian, Phone, Term Fee</Text>
          </View>

          <Field
            label="CSV Content"
            placeholder="Paste your CSV text here…"
            value={csvText}
            onChangeText={setCsvText}
            multiline
          />

          {importSummary && (
            <View style={styles.importSuccessBox}>
              <Icon name="verify" size={18} color={colors.greenText} filled />
              <Text style={styles.importSuccessText}>{importSummary}</Text>
            </View>
          )}

          <Button
            title="Parse & Batch Import Students"
            size="lg"
            variant="primary"
            icon="upload"
            disabled={busy}
            loading={busy}
            onPress={handleCsvImport}
          />
        </Card>
      )}

      {/* Modal: Create Class */}
      <ModalSheet
        visible={createClassModal}
        onClose={() => setCreateClassModal(false)}
        title="Create New Academic Class"
        subtitle="Define class grade name and default tuition fee."
      >
        <Field
          label="Class Name *"
          placeholder="e.g. Primary 5 Topaz"
          value={newClassName}
          onChangeText={setNewClassName}
          icon="school"
        />

        <Field
          label="Default Term Fee (₦) *"
          placeholder="180000"
          numeric
          value={newClassFee}
          onChangeText={setNewClassFee}
          icon="wallet"
        />

        <Button
          title="Create Class & Save"
          size="lg"
          variant="primary"
          onPress={handleCreateClass}
        />
      </ModalSheet>

      {/* Modal: Create Single Student */}
      <ModalSheet
        visible={createStudentModal}
        onClose={() => setCreateStudentModal(false)}
        title="Enroll Single Student"
        subtitle="Register student profile, assigned class and guardian contact."
      >
        <Field
          label="Student Full Name *"
          placeholder="e.g. Oluwaseun Adeleke"
          value={newStudentName}
          onChangeText={setNewStudentName}
          icon="profile"
        />

        <Field
          label="Assigned Class *"
          placeholder="e.g. Primary 1 Gold"
          value={newStudentClass}
          onChangeText={setNewStudentClass}
          icon="school"
        />

        <Field
          label="Guardian Full Name"
          placeholder="e.g. Dr. Kolawole Adeleke"
          value={newGuardianName}
          onChangeText={setNewGuardianName}
          icon="people"
        />

        <Field
          label="Guardian Phone"
          placeholder="08023456789"
          value={newGuardianPhone}
          onChangeText={setNewGuardianPhone}
          icon="document"
        />

        <Button
          title="Enroll Student & Generate Invoice"
          size="lg"
          variant="primary"
          onPress={handleCreateStudent}
        />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  childHeroCard: {
    padding: 22,
    gap: 16,
    backgroundColor: colors.navyDark,
    borderColor: colors.navyBorder,
  },
  childHeroBadge: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: "#94a3b8",
  },
  childHeroAmount: {
    fontFamily: fonts.extra,
    fontSize: 34,
    color: "#ffffff",
    letterSpacing: -1,
  },
  childHeroSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#cbd5e1",
  },
  idCardContainer: {
    padding: 20,
    gap: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    borderRadius: 22,
  },
  idCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  idBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.navy,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#ffffff",
  },
  idStudentName: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
  },
  idStudentClass: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.muted,
  },
  idStudentNumber: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 0.5,
  },
  invoiceCard: {
    padding: 18,
    gap: 14,
  },
  invoiceId: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  invoiceDue: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  invoiceItemsList: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  invoiceItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceItemLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  invoiceItemAmount: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  invoiceFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 10,
  },
  invoiceTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.7,
    color: colors.muted,
  },
  invoiceTotalAmount: {
    fontFamily: fonts.extra,
    fontSize: 16,
    color: colors.navy,
  },
  classFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classFilterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  classFilterChipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.muted,
  },
  classFilterChipTextActive: {
    fontFamily: fonts.bold,
    color: "#ffffff",
  },
  classCard: {
    padding: 18,
    gap: 14,
  },
  classIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  classNameText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  classCodeText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  classRevenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: 12,
  },
  classRevenueLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  classRevenueVal: {
    fontFamily: fonts.extra,
    fontSize: 15,
    color: colors.navy,
  },
  csvCard: {
    padding: 20,
    gap: 16,
  },
  csvTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
  csvSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  csvFormatGuide: {
    backgroundColor: colors.orangeLight,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.2)",
  },
  csvFormatGuideTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  importSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.greenLight,
    padding: 12,
    borderRadius: 12,
  },
  importSuccessText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.greenText,
    flex: 1,
  },
});
