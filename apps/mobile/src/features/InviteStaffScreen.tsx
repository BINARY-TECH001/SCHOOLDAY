import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
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
import { money, PersonTitle, personTitles, Role } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
import { roleLabels } from "./Entry";

export function InviteStaffScreen() {
  const { data, context, services, act, busy, school } = useSchool();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Personal Info
  const [titlePrefix, setTitlePrefix] = useState<PersonTitle>("Mr.");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [address, setAddress] = useState("Lagos Campus Quarters");

  const staffFullName = [
    titlePrefix,
    firstName.trim(),
    middleName.trim(),
    lastName.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  // Step 2: Role & Seniority Rank
  const [role, setRole] = useState<Role>("teacher");
  const [title, setTitle] = useState("Class Teacher & Subject Educator");
  const [rank, setRank] = useState("Senior Educator · Level 4");
  const [customRank, setCustomRank] = useState("");

  // Step 3: Class Allocations & Salary Setup
  const [selectedClasses, setSelectedClasses] = useState<string[]>([
    data.classes[0]?.name || "Primary 1 Gold",
  ]);
  const [basicSalaryNaira, setBasicSalaryNaira] = useState("180000");
  const [allowanceNaira, setAllowanceNaira] = useState("25000");
  const [deductionNaira, setDeductionNaira] = useState("15000");

  const toggleClass = (clsName: string) => {
    setSelectedClasses((prev) =>
      prev.includes(clsName)
        ? prev.filter((c) => c !== clsName)
        : [...prev, clsName],
    );
  };

  const netPayKobo =
    (parseInt(basicSalaryNaira.replace(/[^0-9]/g, ""), 10) || 0) * 100 +
    (parseInt(allowanceNaira.replace(/[^0-9]/g, ""), 10) || 0) * 100 -
    (parseInt(deductionNaira.replace(/[^0-9]/g, ""), 10) || 0) * 100;

  const handleFinishInvite = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Please provide the staff member's first name, last name, and email.");
      return;
    }

    const effectiveRank = customRank.trim() || rank;

    await act(
      () =>
        services.inviteStaff(context, {
          titlePrefix,
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim(),
          name: staffFullName,
          email: email.trim(),
          role,
          title: title.trim() || roleLabels[role],
          rank: effectiveRank,
          assignedClasses: selectedClasses,
          assignedClass: selectedClasses[0] || undefined,
          phone: phone.trim() || "08034567890",
        }),
      `Official invitation dispatched to ${staffFullName} (${email.trim()})!`,
    );

    router.back();
  };

  const stepTitles = [
    "Personal & Contact Info",
    "Role & Faculty Rank",
    "Classes & Remuneration",
    "Review & Dispatch Invitation",
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <TopBar
        title="Invite Faculty Staff"
        subtitle={`Step ${step} of 4 · ${stepTitles[step - 1]}`}
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
        {/* STEP 1: PERSONAL & CONTACT DOSSIER */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Faculty Personal Details</Text>
            <Text style={styles.stepSub}>
              Enter legal identity, title, and contact information for staff accreditation.
            </Text>

            {/* Institutional Title Selector */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Professional Title Prefix</Txt>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {personTitles.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTitlePrefix(t)}
                    style={[
                      styles.choiceChip,
                      titlePrefix === t && styles.choiceChipActive,
                      { paddingHorizontal: 14, paddingVertical: 8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        titlePrefix === t && styles.choiceChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* First Name & Middle Name */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="First Name *"
                  placeholder="e.g. Olumide"
                  value={firstName}
                  onChangeText={setFirstName}
                  icon="profile"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Middle Name"
                  placeholder="e.g. Segun"
                  value={middleName}
                  onChangeText={setMiddleName}
                />
              </View>
            </View>

            <Field
              label="Surname / Last Name *"
              placeholder="e.g. Adeleke"
              value={lastName}
              onChangeText={setLastName}
              icon="profile"
            />

            <Field
              label="Official Institutional Email *"
              placeholder="e.g. o.adeleke@cedargrove.edu.ng"
              value={email}
              onChangeText={setEmail}
              icon="sms"
            />

            <Field
              label="Phone Number"
              placeholder="e.g. 08034567890"
              value={phone}
              onChangeText={setPhone}
              icon="call"
              numeric
            />

            {/* Gender Selector */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Gender</Txt>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["Male", "Female"] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.choiceChip,
                      gender === g && styles.choiceChipActive,
                      { flex: 1, alignItems: "center" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        gender === g && styles.choiceChipTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Field
              label="Residential / Campus Address"
              placeholder="e.g. 14 University Crescent, Ikeja"
              value={address}
              onChangeText={setAddress}
              icon="location"
            />
          </View>
        )}

        {/* STEP 2: ROLE & FACULTY RANK */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Role & Seniority Designation</Text>
            <Text style={styles.stepSub}>
              Assign institutional permissions, job title, and faculty ranking.
            </Text>

            {/* System Role Selector */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Assigned Institutional Role *</Txt>
              <View style={styles.chipsWrap}>
                {(["teacher", "finance", "hr", "admin", "staff"] as Role[]).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRole(r);
                      setTitle(roleLabels[r]);
                    }}
                    style={[
                      styles.choiceChip,
                      role === r && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        role === r && styles.choiceChipTextActive,
                      ]}
                    >
                      {roleLabels[r]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Field
              label="Job Title Designation *"
              placeholder="e.g. Senior Class Educator & HOD Science"
              value={title}
              onChangeText={setTitle}
              icon="profile"
            />

            {/* Faculty Rank Selector */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Faculty Seniority Rank</Txt>
              <View style={styles.chipsWrap}>
                {[
                  "Senior Educator · Level 4",
                  "Principal Instructor",
                  "Head of Department (HOD)",
                  "Class Lead Educator",
                  "Junior Faculty",
                  "Intern / Assistant",
                ].map((rk) => (
                  <Pressable
                    key={rk}
                    onPress={() => {
                      setRank(rk);
                      setCustomRank("");
                    }}
                    style={[
                      styles.choiceChip,
                      rank === rk && !customRank && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        rank === rk && !customRank && styles.choiceChipTextActive,
                      ]}
                    >
                      {rk}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Field
                label="Or Custom Rank Designation"
                placeholder="e.g. Chief Laboratory Technician"
                value={customRank}
                onChangeText={setCustomRank}
                icon="verify"
              />
            </View>
          </View>
        )}

        {/* STEP 3: CLASSROOM ALLOCATIONS & SALARY */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Classrooms & Monthly Salary</Text>
            <Text style={styles.stepSub}>
              Assign teaching classrooms and configure monthly payroll structure.
            </Text>

            {/* Classroom Multi-Select */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Classroom Allocations</Txt>
              <View style={styles.multiClassGrid}>
                {data.classes.map((cls) => {
                  const isSelected = selectedClasses.includes(cls.name);
                  return (
                    <Pressable
                      key={cls.id}
                      onPress={() => toggleClass(cls.name)}
                      style={[
                        styles.classSelectChip,
                        isSelected && styles.classSelectChipActive,
                      ]}
                    >
                      <Icon
                        name={isSelected ? "check" : "school"}
                        size={14}
                        color={isSelected ? "#ffffff" : colors.indigo}
                        filled={isSelected}
                      />
                      <Text
                        style={[
                          styles.classSelectChipText,
                          isSelected && styles.classSelectChipTextActive,
                        ]}
                      >
                        {cls.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Net Pay Banner */}
            <Card variant="dark" style={styles.netPayCard}>
              <Text style={styles.netPayLabel}>PROJECTED NET MONTHLY SALARY</Text>
              <Text style={styles.netPayAmount}>{money(netPayKobo)}</Text>
              <Text style={styles.netPaySub}>Automated direct treasury payroll schedule</Text>
            </Card>

            <Field
              label="Basic Monthly Salary (₦) *"
              placeholder="180,000"
              value={basicSalaryNaira}
              onChangeText={setBasicSalaryNaira}
              numeric
              icon="wallet"
            />

            <Field
              label="Monthly Allowances & Bonuses (₦)"
              placeholder="25,000"
              value={allowanceNaira}
              onChangeText={setAllowanceNaira}
              numeric
            />

            <Field
              label="Tax & Pension Deductions (₦)"
              placeholder="15,000"
              value={deductionNaira}
              onChangeText={setDeductionNaira}
              numeric
            />
          </View>
        )}

        {/* STEP 4: REVIEW & DISPATCH */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Official Invitation</Text>
            <Text style={styles.stepSub}>
              Confirm details before dispatching the invitation and generating credentials.
            </Text>

            <Card style={[styles.reviewCard, shadows.md]}>
              <View style={styles.reviewHeader}>
                <Avatar name={staffFullName || "Staff"} size={54} role={role} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.reviewName}>{staffFullName}</Text>
                  <Text style={styles.reviewEmail}>{email}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Badge text={roleLabels[role]} tone="purple" />
                    <Badge text={customRank || rank} tone="warning" />
                  </View>
                </View>
              </View>

              <View style={styles.reviewMetaGrid}>
                <View style={styles.reviewMetaRow}>
                  <Text style={styles.reviewMetaKey}>Job Title</Text>
                  <Text style={styles.reviewMetaVal}>{title}</Text>
                </View>
                <View style={styles.reviewMetaRow}>
                  <Text style={styles.reviewMetaKey}>Phone</Text>
                  <Text style={styles.reviewMetaVal}>{phone || "08034567890"}</Text>
                </View>
                <View style={styles.reviewMetaRow}>
                  <Text style={styles.reviewMetaKey}>Assigned Classes</Text>
                  <Text style={styles.reviewMetaVal}>
                    {selectedClasses.length > 0 ? selectedClasses.join(", ") : "General Faculty"}
                  </Text>
                </View>
                <View style={styles.reviewMetaRow}>
                  <Text style={styles.reviewMetaKey}>Monthly Net Pay</Text>
                  <Text style={[styles.reviewMetaVal, { color: colors.greenDark, fontFamily: fonts.extra }]}>
                    {money(netPayKobo)}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={styles.credentialNoticeBox}>
              <Icon name="verify" size={18} color={colors.orange} filled />
              <Text style={styles.credentialNoticeText}>
                An official digital enrollment key and QR clock-in credentials will be dispatched to {email}.
              </Text>
            </View>
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
              ? "Dispatch Official Invitation"
              : step === 1
                ? "Next: Role & Seniority"
                : step === 2
                  ? "Next: Classes & Salary"
                  : "Review Invitation"
          }
          variant="primary"
          size="lg"
          icon={step === 4 ? "send" : undefined}
          style={{ flex: step > 1 ? 2 : 1 }}
          loading={busy}
          disabled={busy || (step === 1 && (!firstName.trim() || !lastName.trim() || !email.trim()))}
          onPress={() => {
            if (step < 4) {
              setStep((s) => (s + 1) as any);
            } else {
              handleFinishInvite();
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
    paddingBottom: 24,
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
  multiClassGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  classSelectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  netPayCard: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  netPayLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: "#94a3b8",
  },
  netPayAmount: {
    fontFamily: fonts.extra,
    fontSize: 26,
    color: "#ffffff",
  },
  netPaySub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#cbd5e1",
  },
  reviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reviewName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  reviewEmail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  reviewMetaGrid: {
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 12,
    gap: 8,
  },
  reviewMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewMetaKey: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  reviewMetaVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  credentialNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.orangeLight,
    borderRadius: 14,
    padding: 12,
  },
  credentialNoticeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.orange,
    flex: 1,
    lineHeight: 16,
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
