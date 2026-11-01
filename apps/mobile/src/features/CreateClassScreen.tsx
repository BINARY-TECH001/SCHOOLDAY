import React, { useState, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  Field,
  Txt,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { money, Role } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { roleLabels } from "./Entry";

export interface FeeItem {
  id: string;
  name: string;
  amountKobo: number;
  enabled: boolean;
  required: boolean;
}

export function CreateClassScreen() {
  const { data, context, services, act, busy } = useSchool();
  const params = useLocalSearchParams<{ id?: string }>();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const existingClass = useMemo(() => {
    if (!params.id) return null;
    return (
      data.classes.find((c) => c.id === params.id || c.code === params.id) || null
    );
  }, [params.id, data.classes]);

  const isEditMode = Boolean(existingClass);

  // Step 1: Class Details
  const [className, setClassName] = useState(existingClass?.name || "");
  const [classCode, setClassCode] = useState(existingClass?.code || "");
  const [gradeLevel, setGradeLevel] = useState<"primary" | "jss" | "sss" | "nursery">(
    existingClass?.name.toLowerCase().includes("jss")
      ? "jss"
      : existingClass?.name.toLowerCase().includes("sss")
        ? "sss"
        : existingClass?.name.toLowerCase().includes("nursery")
          ? "nursery"
          : "primary",
  );
  const [classArm, setClassArm] = useState("Diamond");
  const [capacity, setCapacity] = useState(
    existingClass?.studentCount ? String(existingClass.studentCount + 10) : "35",
  );
  const [roomLocation, setRoomLocation] = useState("Academic Block A · Rm 102");

  // Step 2: Staff Assignment
  const [staffSearch, setStaffSearch] = useState("");
  const [leadTeacherId, setLeadTeacherId] = useState<string>(
    existingClass?.teacherUserId || "",
  );
  const [assistantTeacherIds, setAssistantTeacherIds] = useState<string[]>([]);

  // Step 3: Multi-Item Fee Configurator
  const [feeItems, setFeeItems] = useState<FeeItem[]>([
    { id: "fee-tuition", name: "Core Tuition Fee", amountKobo: 12000000, enabled: true, required: true },
    { id: "fee-books", name: "Textbooks & Stationery Materials", amountKobo: 2500000, enabled: true, required: false },
    { id: "fee-uniform", name: "Official School Uniform & Kit", amountKobo: 2000000, enabled: true, required: false },
    { id: "fee-dev", name: "Campus Development & ICT Levy", amountKobo: 1500000, enabled: true, required: false },
    { id: "fee-lab", name: "Science & Computer Lab Maintenance", amountKobo: 1000000, enabled: true, required: false },
    { id: "fee-bus", name: "Optional Transit / Bus Service", amountKobo: 3000000, enabled: false, required: false },
  ]);

  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");

  const teachers = useMemo(() => {
    return data.staff.filter((s) => {
      const matchSearch =
        staffSearch.trim() === "" ||
        (s.name + s.title + s.email).toLowerCase().includes(staffSearch.toLowerCase());
      return matchSearch;
    });
  }, [data.staff, staffSearch]);

  // Grand total fee calculation
  const grandTotalKobo = useMemo(() => {
    return feeItems
      .filter((item) => item.enabled)
      .reduce((sum, item) => sum + item.amountKobo, 0);
  }, [feeItems]);

  const toggleFeeItem = (id: string) => {
    setFeeItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  const updateFeeAmount = (id: string, textNaira: string) => {
    const val = parseInt(textNaira.replace(/[^0-9]/g, ""), 10) || 0;
    setFeeItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, amountKobo: val * 100 } : item,
      ),
    );
  };

  const handleAddCustomFee = () => {
    if (!newFeeName.trim()) return;
    const amountVal = parseInt(newFeeAmount.replace(/[^0-9]/g, ""), 10) || 5000;
    const newItem: FeeItem = {
      id: `fee-custom-${Date.now()}`,
      name: newFeeName.trim(),
      amountKobo: amountVal * 100,
      enabled: true,
      required: false,
    };
    setFeeItems((prev) => [...prev, newItem]);
    setNewFeeName("");
    setNewFeeAmount("");
  };

  const toggleAssistantTeacher = (userId: string) => {
    setAssistantTeacherIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleFinish = async () => {
    if (!className.trim()) {
      alert("Please provide a classroom name.");
      setStep(1);
      return;
    }

    const calculatedCode =
      classCode.trim() ||
      className
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase() + (classArm ? `-${classArm[0]}` : "");

    if (isEditMode && existingClass) {
      await act(
        () =>
          services.updateClass(context, existingClass.id, {
            name: className.trim(),
            code: calculatedCode,
            termFee: grandTotalKobo,
            teacherUserId: leadTeacherId || undefined,
          }),
        `Classroom "${className.trim()}" adjustments saved!`,
      );
    } else {
      await act(
        () =>
          services.createClass(context, {
            name: className.trim(),
            code: calculatedCode,
            termFee: grandTotalKobo,
            teacherUserId: leadTeacherId || undefined,
          }),
        `Classroom "${className.trim()}" created with ${feeItems.filter((f) => f.enabled).length} configured fees!`,
      );
    }

    router.back();
  };

  const leadTeacher = data.staff.find((s) => s.userId === leadTeacherId);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      {/* TopBar with Step Indicator */}
      <TopBar
        title={isEditMode ? "Edit Classroom" : "Create Classroom"}
        subtitle={`Step ${step} of 4 · ${
          step === 1
            ? "Class Info"
            : step === 2
              ? "Assign Staff"
              : step === 3
                ? "Fee Structure"
                : "Review & Establish"
        }`}
        onBack={() => {
          if (step > 1) {
            setStep((s) => (s - 1) as any);
          } else {
            router.back();
          }
        }}
      />

      {/* Visual Step Progress Bar */}
      <View style={styles.stepProgressContainer}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={[
              styles.stepProgressSegment,
              s <= step && styles.stepProgressSegmentActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: CLASSROOM IDENTITY */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Classroom Details</Text>
            <Text style={styles.stepSub}>
              Set up the grade level, arm name, and physical room capacity.
            </Text>

            <Field
              label="Classroom Name *"
              placeholder="e.g. Primary 3 Diamond or JSS 2 Ruby"
              value={className}
              onChangeText={(t) => {
                setClassName(t);
                if (!classCode) {
                  setClassCode(
                    t
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase() + (classArm ? `-${classArm[0]}` : ""),
                  );
                }
              }}
              icon="school"
            />

            <Field
              label="Classroom Code (Optional)"
              placeholder="e.g. PR3-D"
              value={classCode}
              onChangeText={setClassCode}
            />

            {/* Grade Level Category */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Grade Level / Section</Txt>
              <View style={styles.chipsWrap}>
                {[
                  { key: "nursery", label: "Nursery / KG" },
                  { key: "primary", label: "Primary School" },
                  { key: "jss", label: "Junior Secondary (JSS)" },
                  { key: "sss", label: "Senior Secondary (SSS)" },
                ].map((g) => (
                  <Pressable
                    key={g.key}
                    onPress={() => setGradeLevel(g.key as any)}
                    style={[
                      styles.choiceChip,
                      gradeLevel === g.key && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        gradeLevel === g.key && styles.choiceChipTextActive,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Arm Selector */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Section Arm</Txt>
              <View style={styles.chipsWrap}>
                {["Gold", "Diamond", "Emerald", "Ruby", "Silver", "Topaz", "Oak"].map((arm) => (
                  <Pressable
                    key={arm}
                    onPress={() => setClassArm(arm)}
                    style={[
                      styles.choiceChip,
                      classArm === arm && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        classArm === arm && styles.choiceChipTextActive,
                      ]}
                    >
                      {arm}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Student Capacity"
                  placeholder="35"
                  value={capacity}
                  onChangeText={setCapacity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Room / Hall"
                  placeholder="Block A · Rm 102"
                  value={roomLocation}
                  onChangeText={setRoomLocation}
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: STAFF & TEACHER ASSIGNMENT */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Assign Faculty Staff</Text>
            <Text style={styles.stepSub}>
              Select the lead class teacher and assistant/subject teachers. All staff are listed below.
            </Text>

            {/* Staff Search */}
            <View style={[styles.searchBox, shadows.sm]}>
              <Icon name="search" size={18} color={colors.muted} />
              <TextInput
                value={staffSearch}
                onChangeText={setStaffSearch}
                placeholder="Search staff by name or subject…"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>

            {/* Staff Cards List */}
            <View style={{ gap: 10 }}>
              {teachers.map((s) => {
                const isLead = leadTeacherId === s.userId;
                const isAssistant = assistantTeacherIds.includes(s.userId);

                return (
                  <View
                    key={s.id}
                    style={[
                      styles.staffSelectCard,
                      (isLead || isAssistant) && styles.staffSelectCardSelected,
                      shadows.sm,
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <Avatar name={s.name} size={44} role={s.role || "teacher"} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.staffCardName}>{s.name}</Text>
                        <Text style={styles.staffCardTitle}>{s.title}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Badge
                            text={roleLabels[s.role || "teacher"]}
                            tone="purple"
                          />
                          <Text style={styles.staffClassesCount}>
                            {s.assignedClasses?.length || (s.assignedClass ? 1 : 0)} active classes
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Selection Controls */}
                    <View style={{ gap: 6 }}>
                      <Pressable
                        onPress={() => setLeadTeacherId(isLead ? "" : s.userId)}
                        style={[
                          styles.rolePillBtn,
                          isLead && styles.rolePillBtnActiveLead,
                        ]}
                      >
                        <Icon
                          name={isLead ? "check" : "school"}
                          size={12}
                          color={isLead ? "#ffffff" : colors.indigoText}
                          filled={isLead}
                        />
                        <Text
                          style={[
                            styles.rolePillBtnText,
                            isLead && styles.rolePillBtnTextActive,
                          ]}
                        >
                          {isLead ? "Lead Teacher" : "Make Lead"}
                        </Text>
                      </Pressable>

                      {!isLead && (
                        <Pressable
                          onPress={() => toggleAssistantTeacher(s.userId)}
                          style={[
                            styles.rolePillBtn,
                            isAssistant && styles.rolePillBtnActiveAssistant,
                          ]}
                        >
                          <Icon
                            name={isAssistant ? "check" : "userAdd"}
                            size={12}
                            color={isAssistant ? "#ffffff" : colors.muted}
                            filled={isAssistant}
                          />
                          <Text
                            style={[
                              styles.rolePillBtnText,
                              isAssistant && styles.rolePillBtnTextActive,
                            ]}
                          >
                            {isAssistant ? "Subject Teacher" : "+ Add Subject"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: MULTI-ITEM FEE CONFIGURATION */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Term Fee Line Items</Text>
            <Text style={styles.stepSub}>
              Configure tuition, books, uniform, development and custom dues. All items sum up into the term bill.
            </Text>

            {/* Live Grand Total Banner */}
            <Card style={[styles.grandTotalCard, shadows.sm]}>
              <View style={{ gap: 2 }}>
                <Text style={styles.grandTotalLabel}>TOTAL TUITION & DUES / TERM</Text>
                <Text style={styles.grandTotalAmount}>{money(grandTotalKobo)}</Text>
                <Text style={styles.grandTotalSub}>
                  {feeItems.filter((f) => f.enabled).length} active fee items configured
                </Text>
              </View>
              <View style={styles.grandTotalIconBox}>
                <Icon name="wallet" size={24} color="#ffffff" filled />
              </View>
            </Card>

            {/* Fee Items List */}
            <View style={{ gap: 10 }}>
              {feeItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.feeItemRow,
                    item.enabled ? styles.feeItemRowActive : styles.feeItemRowDisabled,
                    shadows.sm,
                  ]}
                >
                  <Switch
                    value={item.enabled}
                    onValueChange={() => toggleFeeItem(item.id)}
                    trackColor={{ false: "#e2e8f0", true: colors.indigo }}
                  />

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[
                        styles.feeItemName,
                        !item.enabled && styles.feeItemNameDisabled,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.feeItemAmountText}>
                      {money(item.amountKobo)}
                    </Text>
                  </View>

                  {item.enabled && (
                    <View style={styles.feeAmountInputWrap}>
                      <Text style={styles.nairaPrefix}>₦</Text>
                      <TextInput
                        value={String(item.amountKobo / 100)}
                        onChangeText={(t) => updateFeeAmount(item.id, t)}
                        keyboardType="numeric"
                        style={styles.feeAmountInput}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Add Custom Fee Item Box */}
            <Card style={styles.customFeeBox}>
              <Text style={styles.customFeeBoxTitle}>+ Add Custom Dues / Levy</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  value={newFeeName}
                  onChangeText={setNewFeeName}
                  placeholder="e.g. Science Lab Excursion"
                  placeholderTextColor="#94a3b8"
                  style={styles.customFeeInput}
                />
                <TextInput
                  value={newFeeAmount}
                  onChangeText={setNewFeeAmount}
                  placeholder="₦ Amount"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  style={[styles.customFeeInput, { width: 90 }]}
                />
                <Button
                  title="Add"
                  size="sm"
                  variant="primary"
                  disabled={!newFeeName.trim()}
                  onPress={handleAddCustomFee}
                />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Sticky Fixed Bottom Navigation Bar */}
      <View style={styles.fixedBottomBar}>
        {step > 1 && (
          <Button
            title="Back"
            variant="secondary"
            size="lg"
            style={{ flex: 1 }}
            onPress={() => setStep((s) => (s - 1) as any)}
          />
        )}
        <Button
          title={
            step === 4
              ? isEditMode
                ? "Save Classroom Adjustments"
                : "Establish Classroom"
              : step === 1
                ? "Next: Assign Faculty"
                : step === 2
                  ? "Next: Fee Structure"
                  : "Review Classroom"
          }
          variant="primary"
          size="lg"
          icon={step === 4 ? "check" : undefined}
          style={{ flex: step > 1 ? 2 : 1 }}
          loading={busy}
          disabled={busy || (step === 1 && !className.trim())}
          onPress={() => {
            if (step < 4) {
              setStep((s) => (s + 1) as any);
            } else {
              handleFinish();
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stepProgressContainer: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  stepProgressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  stepProgressSegmentActive: {
    backgroundColor: colors.orange,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 16,
  },
  stepTitle: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  stepSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginTop: -8,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  choiceChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  choiceChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  choiceChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  searchBox: {
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
  staffSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  staffSelectCardSelected: {
    borderColor: colors.indigo,
    backgroundColor: "#fbfcfe",
  },
  staffCardName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  staffCardTitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  staffClassesCount: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.faint,
  },
  rolePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rolePillBtnActiveLead: {
    backgroundColor: colors.indigo,
    borderColor: colors.indigo,
  },
  rolePillBtnActiveAssistant: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  rolePillBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  rolePillBtnTextActive: {
    color: "#ffffff",
  },
  grandTotalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 18,
  },
  grandTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.9,
    color: "#94a3b8",
  },
  grandTotalAmount: {
    fontFamily: fonts.extra,
    fontSize: 26,
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  grandTotalSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#cbd5e1",
  },
  grandTotalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  feeItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  feeItemRowActive: {
    borderColor: colors.borderLight,
  },
  feeItemRowDisabled: {
    opacity: 0.6,
    backgroundColor: colors.surfaceSubtle,
  },
  feeItemName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  feeItemNameDisabled: {
    color: colors.muted,
  },
  feeItemAmountText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  feeAmountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
  },
  nairaPrefix: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
    marginRight: 2,
  },
  feeAmountInput: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
    minWidth: 60,
    textAlign: "right",
  },
  customFeeBox: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  customFeeBoxTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  customFeeInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    color: colors.ink,
  },
  reviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 14,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingBottom: 12,
  },
  reviewClassName: {
    fontFamily: fonts.extra,
    fontSize: 20,
    color: colors.navy,
  },
  reviewCode: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  reviewRow: {
    gap: 2,
  },
  reviewLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  reviewVal: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  reviewFeeBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  reviewFeeHeader: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  reviewFeeItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewFeeItemName: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.navy,
  },
  reviewFeeItemAmount: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  reviewFeeTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 8,
    marginTop: 4,
  },
  reviewFeeTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.7,
    color: colors.muted,
  },
  reviewFeeTotalVal: {
    fontFamily: fonts.extra,
    fontSize: 16,
    color: colors.navy,
  },
  fixedBottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
});
