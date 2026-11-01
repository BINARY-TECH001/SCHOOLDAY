import React, { useState, useMemo } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { toast } from "sonner-native";
import * as Clipboard from "expo-clipboard";
import { colors, fonts, radii, shadows, spacing } from "../theme/tokens";
import { Avatar, Badge, Button, Card } from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";
import { DatePickerModal } from "../components/pickers/DatePickerModal";
import { FullscreenScannerModal } from "./FullscreenScannerModal";
import {
  formatKoboToNaira,
  validateGuardianAffiliation,
  validatePupilIdentity,
  validatePupilMedical,
} from "./enrollment/utils/enrollmentValidation";

type EnrollmentMethod = "manual" | "csv" | "qr";
type EnrollmentStep = 1 | 2 | 3 | 4 | 5;

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const GENOTYPES = ["AA", "AS", "SS", "AC"];
const GUARDIAN_RELATIONSHIPS = ["Father", "Mother", "Legal Guardian", "Other"] as const;

export function AddPupilScreen() {
  const { data, context, school, services, act, busy } = useSchool();
  const params = useLocalSearchParams<{ classId?: string }>();

  // Method & Step State
  const [method, setMethod] = useState<EnrollmentMethod>("manual");
  const [currentStep, setCurrentStep] = useState<EnrollmentStep>(1);

  // STEP 2: Pupil Identity & Classes
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [dateOfBirth, setDateOfBirth] = useState("2018-05-14");
  const [selectedPrimaryClassId, setSelectedPrimaryClassId] = useState<string>(
    params.classId || data.classes[0]?.id || "",
  );
  const [selectedSecondaryClassId, setSelectedSecondaryClassId] = useState<string>("");
  const [dobPickerOpen, setDobPickerOpen] = useState(false);

  const fullName = useMemo(() => {
    return [firstName.trim(), middleName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");
  }, [firstName, middleName, lastName]);

  // STEP 3: Guardian Affiliation State
  const [guardianMode, setGuardianMode] = useState<"existing" | "new">("new");
  const [selectedGuardianUserId, setSelectedGuardianUserId] = useState<string>("");
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianFullName, setGuardianFullName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState<
    "Father" | "Mother" | "Legal Guardian" | "Other"
  >("Mother");

  // STEP 4: Medical State
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [genotype, setGenotype] = useState("AA");
  const [allergies, setAllergies] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // CSV Import State (Clean template without pre-populated mock data)
  const [csvText, setCsvText] = useState("");

  // QR Scan / Admission Code State
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [scannerModalVisible, setScannerModalVisible] = useState(false);

  // Validation Errors
  const [stepErrors, setStepErrors] = useState<Record<string, string | undefined>>({});

  // Active target classrooms
  const primaryClass = useMemo(() => {
    return data.classes.find((c) => c.id === selectedPrimaryClassId) || data.classes[0];
  }, [selectedPrimaryClassId, data.classes]);

  const secondaryClass = useMemo(() => {
    return data.classes.find((c) => c.id === selectedSecondaryClassId);
  }, [selectedSecondaryClassId, data.classes]);

  // Existing parents
  const existingParents = useMemo(() => {
    const parentMemberships = data.memberships.filter((m) => m.roles?.includes("parent"));
    if (!guardianSearch.trim()) return parentMemberships;
    const q = guardianSearch.toLowerCase();
    return parentMemberships.filter(
      (p) => p.name.toLowerCase().includes(q) || p.userId.toLowerCase().includes(q),
    );
  }, [data.memberships, guardianSearch]);

  const selectedExistingGuardian = useMemo(() => {
    return data.memberships.find((m) => m.userId === selectedGuardianUserId);
  }, [data.memberships, selectedGuardianUserId]);

  const calculatedAge = useMemo(() => {
    if (!dateOfBirth) return "";
    const birth = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age} years old` : "Under 1 year";
  }, [dateOfBirth]);

  // Parsed CSV rows supporting both 7-col template and 5-col roster
  const parsedCsvRows = useMemo(() => {
    if (!csvText.trim()) return [];
    const lines = csvText.trim().split("\n");
    return lines
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length < 2) return null;

        // Skip CSV Header line if present
        const firstCol = parts[0]?.toLowerCase() || "";
        if (
          firstCol === "first name" ||
          firstCol === "fullname" ||
          firstCol === "name" ||
          firstCol === "first_name"
        ) {
          return null;
        }

        if (parts.length >= 6) {
          // 7-column template: First Name, Middle Name, Last Name, Primary Class, Secondary Class, Phone, Fee
          const fName = parts[0] || "";
          const mName = parts.length >= 7 ? parts[1] || "" : "";
          const lName = parts.length >= 7 ? parts[2] || "" : parts[1] || "";
          const pCls = parts.length >= 7 ? parts[3] || "" : parts[2] || "";
          const sCls = parts.length >= 7 ? parts[4] || "" : parts[3] || "";
          const phone = parts.length >= 7 ? parts[5] || "" : parts[4] || "";
          const feeStr = parts.length >= 7 ? parts[6] || "" : parts[5] || "";

          const compName = [fName, mName, lName].filter(Boolean).join(" ");
          return {
            firstName: fName,
            middleName: mName,
            lastName: lName,
            name: compName,
            primaryClass: pCls,
            secondaryClass: sCls,
            phone: phone || "08012345678",
            fee: feeStr ? parseInt(feeStr, 10) * 100 : 15000000,
          };
        }

        // 5-column format: FullName, PrimaryClass, SecondaryClass, Phone, Fee
        const words = (parts[0] || "").split(" ");
        return {
          firstName: words[0] || "",
          middleName: words.length > 2 ? words.slice(1, -1).join(" ") : "",
          lastName: words.length > 1 ? words[words.length - 1] || "" : "",
          name: parts[0] || "",
          primaryClass: parts[1] || "",
          secondaryClass: parts[2] || "",
          phone: parts[3] || "08012345678",
          fee: parts[4] ? parseInt(parts[4], 10) * 100 : 15000000,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.name.length > 0);
  }, [csvText]);

  // Navigation handlers
  const handleSelectMethod = (chosen: EnrollmentMethod) => {
    setMethod(chosen);
    if (chosen === "manual") {
      setCurrentStep(2);
    }
  };

  const handleNextStep = () => {
    setStepErrors({});

    if (currentStep === 2) {
      const result = validatePupilIdentity({
        firstName,
        middleName,
        lastName,
        fullName,
        gender,
        dateOfBirth,
        classId: selectedPrimaryClassId,
        secondaryClassId: selectedSecondaryClassId || undefined,
      });
      if (!result.isValid) {
        setStepErrors(result.errors);
        toast.error("Please fill in required pupil details and valid classrooms.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const result = validateGuardianAffiliation({
        mode: guardianMode,
        existingGuardianUserId: selectedGuardianUserId,
        fullName: guardianFullName,
        phone: guardianPhone,
        email: guardianEmail,
        relationship: guardianRelationship,
      });
      if (!result.isValid) {
        setStepErrors(result.errors);
        toast.error("Please provide valid guardian contact details.");
        return;
      }
      if (!emergencyPhone) {
        setEmergencyPhone(guardianPhone);
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      const result = validatePupilMedical({
        bloodGroup,
        genotype,
        allergies,
        emergencyPhone,
      });
      if (!result.isValid) {
        setStepErrors(result.errors);
        return;
      }
      setCurrentStep(5);
    }
  };

  const handlePrevStep = () => {
    setStepErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as EnrollmentStep);
    } else {
      router.back();
    }
  };

  // Submit Manual Pupil Enrollment
  const handleFinalSubmit = async () => {
    const finalGuardianName =
      guardianMode === "existing"
        ? selectedExistingGuardian?.name || "Registered Parent"
        : guardianFullName.trim();

    const finalGuardianPhone =
      guardianMode === "existing"
        ? "+234 802 000 0000"
        : guardianPhone.trim();

    const termFeeKobo = primaryClass?.termFee || 15000000;

    const classNames = secondaryClass
      ? [primaryClass.name, secondaryClass.name]
      : [primaryClass.name];

    const compositeClassName = classNames.join(" & ");

    await act(
      () =>
        services.addStudentsBatch(context, [
          {
            firstName: firstName.trim(),
            middleName: middleName.trim() || undefined,
            lastName: lastName.trim(),
            name: fullName.trim(),
            className: compositeClassName,
            classes: classNames,
            guardianName: finalGuardianName,
            guardianPhone: finalGuardianPhone,
            guardianEmail: guardianEmail.trim() || undefined,
            feeAmount: termFeeKobo,
          },
        ]),
      `Enrolled ${fullName.trim()} into ${compositeClassName}!`,
    );

    router.back();
  };

  // Submit CSV Bulk Enrollment
  const handleImportCsv = async () => {
    if (parsedCsvRows.length === 0) {
      toast.error("No valid student rows found in CSV text.");
      return;
    }

    const payload = parsedCsvRows.map((r) => {
      const classes = r.secondaryClass
        ? [r.primaryClass, r.secondaryClass]
        : [r.primaryClass];
      return {
        firstName: r.firstName,
        middleName: r.middleName,
        lastName: r.lastName,
        name: r.name,
        className: classes.join(" & "),
        classes,
        guardianPhone: r.phone,
        feeAmount: r.fee,
      };
    });

    await act(
      () => services.addStudentsBatch(context, payload),
      `Successfully enrolled cohort of ${parsedCsvRows.length} pupils!`,
    );

    router.back();
  };

  // Parse QR / Student ID / Digital Admission Pass (accepts ID or plain string or JSON)
  const handleParseQrCode = (overrideCode?: string) => {
    const raw = (overrideCode || qrCodeInput).trim();
    if (!raw) {
      toast.error("Please enter a student ID, admission barcode or code.");
      return;
    }

    // 1. Check if it matches an existing student by ID or Code
    const upper = raw.toUpperCase();
    const matched = data.students.find((s) => {
      const sid = s.id.toUpperCase();
      return (
        upper === sid ||
        upper === `STUDENT_${sid}` ||
        upper === `STU_${sid}` ||
        upper.includes(sid)
      );
    });

    if (matched) {
      if (matched.firstName) {
        setFirstName(matched.firstName);
      } else {
        const words = matched.name.split(" ");
        setFirstName(words[0] || "");
        setLastName(words.slice(1).join(" ") || "");
      }
      if (matched.middleName) setMiddleName(matched.middleName);
      if (matched.lastName) setLastName(matched.lastName);
      if (matched.guardianPhone) setGuardianPhone(matched.guardianPhone);
      if (matched.guardianEmail) setGuardianEmail(matched.guardianEmail);

      if (matched.classes?.[0]) {
        const cl = data.classes.find((c) => c.name === matched.classes?.[0]);
        if (cl) setSelectedPrimaryClassId(cl.id);
      }
      if (matched.classes?.[1]) {
        const sec = data.classes.find((c) => c.name === matched.classes?.[1]);
        if (sec) setSelectedSecondaryClassId(sec.id);
      }
      toast.success(`Matched Student ID: ${matched.name}`);
      setMethod("manual");
      setCurrentStep(5);
      return;
    }

    // 2. Try JSON Parse if payload happens to be JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed.firstName) setFirstName(parsed.firstName);
      if (parsed.middleName) setMiddleName(parsed.middleName);
      if (parsed.lastName) setLastName(parsed.lastName);
      if (parsed.name && !parsed.firstName) {
        const parts = parsed.name.trim().split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      if (parsed.gender) setGender(parsed.gender);
      if (parsed.dob) setDateOfBirth(parsed.dob);
      if (parsed.phone) setGuardianPhone(parsed.phone);
      if (parsed.guardian) setGuardianFullName(parsed.guardian);

      const matchedCls = data.classes.find(
        (c) =>
          c.name.toLowerCase() === (parsed.class || "").toLowerCase() ||
          c.code.toLowerCase() === (parsed.class || "").toLowerCase(),
      );
      if (matchedCls) setSelectedPrimaryClassId(matchedCls.id);

      const matchedSec = data.classes.find(
        (c) =>
          c.name.toLowerCase() === (parsed.secondaryClass || "").toLowerCase() ||
          c.code.toLowerCase() === (parsed.secondaryClass || "").toLowerCase(),
      );
      if (matchedSec) setSelectedSecondaryClassId(matchedSec.id);

      toast.success("Admission code verified & loaded into enrollment!");
      setMethod("manual");
      setCurrentStep(2);
      return;
    } catch {
      // Not JSON - proceed to plain text / ID parsing
    }

    // 3. Comma-separated or whitespace-separated format
    const parts = raw.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      setFirstName(parts[0] || "");
      if (parts.length >= 3) {
        setLastName(parts[1] || "");
        const cls = data.classes.find((c) =>
          c.name.toLowerCase().includes(parts[2]!.toLowerCase()),
        );
        if (cls) setSelectedPrimaryClassId(cls.id);
      } else {
        setLastName(parts[1] || "");
      }
    } else {
      // Single ID or name e.g. "Chinedu Okafor" or "ADM-2026-90"
      const words = raw.split(" ");
      if (words.length > 1) {
        setFirstName(words[0] || "");
        setLastName(words.slice(1).join(" ") || "");
      } else {
        setFirstName(raw);
      }
    }

    toast.success("Loaded admission details from QR/ID!");
    setMethod("manual");
    setCurrentStep(2);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* TopBar with Stepper */}
      <TopBar
        title="Enroll Pupil"
        subtitle={
          currentStep === 1
            ? "Step 1 of 5 · Select Enrollment Mode"
            : currentStep === 2
            ? "Step 2 of 5 · Pupil & Class Arm"
            : currentStep === 3
            ? "Step 3 of 5 · Guardian Affiliation"
            : currentStep === 4
            ? "Step 4 of 5 · Medical & Health"
            : "Step 5 of 5 · Review & Confirm"
        }
        back={handlePrevStep}
      />

      {/* Stepper Progress Bar */}
      {method === "manual" && (
        <View style={styles.stepProgressBar}>
          {[1, 2, 3, 4, 5].map((stepNumber) => {
            const isActive = currentStep === stepNumber;
            const isDone = currentStep > stepNumber;
            return (
              <View key={stepNumber} style={styles.stepProgressItem}>
                <View
                  style={[
                    styles.stepBadgeCircle,
                    isActive && styles.stepBadgeActive,
                    isDone && styles.stepBadgeDone,
                  ]}
                >
                  {isDone ? (
                    <Icon name="check" size={12} color={colors.white} />
                  ) : (
                    <Text
                      style={[
                        styles.stepBadgeText,
                        (isActive || isDone) && styles.stepBadgeTextActive,
                      ]}
                    >
                      {stepNumber}
                    </Text>
                  )}
                </View>
                {stepNumber < 5 && (
                  <View
                    style={[
                      styles.stepLine,
                      currentStep > stepNumber && styles.stepLineDone,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1: METHOD SELECTION */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CHOOSE ENROLLMENT METHOD</Text>
              <Text style={styles.sectionSubtitle}>
                Select how you want to register new pupils into {school.name}
              </Text>
            </View>

            <View style={styles.methodCardsList}>
              {/* Option 1: Manual Single Registration */}
              <Pressable
                style={[
                  styles.methodCard,
                  method === "manual" && styles.methodCardActive,
                ]}
                onPress={() => handleSelectMethod("manual")}
              >
                <View style={[styles.methodIconTile, { backgroundColor: colors.orangeLight }]}>
                  <Icon name="edit" size={24} color={colors.orange} />
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>Manual Individual Form</Text>
                    <Badge text="RECOMMENDED" tone="warning" />
                  </View>
                  <Text style={styles.methodDesc}>
                    Step-by-step registration for single students with primary class, optional
                    secondary class, parent info, and medical records.
                  </Text>
                </View>
                <Icon name="chevron" size={20} color={colors.slate400} />
              </Pressable>

              {/* Option 2: Bulk CSV Import */}
              <Pressable
                style={[
                  styles.methodCard,
                  method === "csv" && styles.methodCardActive,
                ]}
                onPress={() => handleSelectMethod("csv")}
              >
                <View style={[styles.methodIconTile, { backgroundColor: colors.greenLight }]}>
                  <Icon name="document" size={24} color={colors.greenDark} />
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>Bulk CSV / Excel Import</Text>
                    <Badge text="BATCH" tone="success" />
                  </View>
                  <Text style={styles.methodDesc}>
                    Upload or paste an entire class roster to enroll multiple students and
                    generate invoices in a single batch.
                  </Text>
                </View>
                <Icon name="chevron" size={20} color={colors.slate400} />
              </Pressable>

              {/* Option 3: Scan QR / Admission Pass */}
              <Pressable
                style={[
                  styles.methodCard,
                  method === "qr" && styles.methodCardActive,
                ]}
                onPress={() => handleSelectMethod("qr")}
              >
                <View style={[styles.methodIconTile, { backgroundColor: colors.slate100 }]}>
                  <Icon name="camera" size={24} color={colors.navy} />
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>Scan QR / Admission Voucher</Text>
                    <Badge text="INSTANT" tone="neutral" />
                  </View>
                  <Text style={styles.methodDesc}>
                    Scan or paste transfer slip QR codes or entrance exam vouchers to auto-fill
                    pupil data instantly.
                  </Text>
                </View>
                <Icon name="chevron" size={20} color={colors.slate400} />
              </Pressable>
            </View>

            {/* CSV Quick Import View if selected */}
            {method === "csv" && (
              <Card style={styles.csvBox}>
                <View style={styles.csvHeader}>
                  <Text style={styles.csvTitle}>BULK IMPORT ROSTER (CSV)</Text>
                  <Text style={styles.csvFormatHint}>
                    Format: First Name, Middle Name, Last Name, Primary Class, Secondary Class, Phone, Fee
                  </Text>
                </View>

                {/* CSV Template Actions Toolbar */}
                <View style={{ flexDirection: "row", gap: 8, marginVertical: 8, flexWrap: "wrap" }}>
                  <Button
                    title="Copy CSV Template"
                    icon="copy"
                    variant="outline"
                    size="sm"
                    onPress={async () => {
                      const templateHeader = "First Name, Middle Name, Last Name, Primary Class, Secondary Class, Guardian Phone, Term Fee";
                      await Clipboard.setStringAsync(templateHeader);
                      toast.success("CSV Header template copied to clipboard!");
                    }}
                  />
                  <Button
                    title="Insert Template Headers"
                    icon="document"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      const templateHeader = "First Name, Middle Name, Last Name, Primary Class, Secondary Class, Guardian Phone, Term Fee\n";
                      setCsvText(templateHeader);
                      toast.info("CSV template header inserted.");
                    }}
                  />
                </View>

                <TextInput
                  style={styles.csvInput}
                  multiline
                  numberOfLines={5}
                  value={csvText}
                  onChangeText={setCsvText}
                  placeholder={`First Name, Middle Name, Last Name, Primary Class, Secondary Class, Guardian Phone, Term Fee\nChinedu, Emeka, Okafor, Primary 1 Gold, , 08023456789, 150000`}
                />
                <View style={styles.csvPreviewHeader}>
                  <Text style={styles.csvPreviewTitle}>
                    PARSED PUPILS ({parsedCsvRows.length})
                  </Text>
                </View>
                <View style={styles.csvPreviewList}>
                  {parsedCsvRows.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.slate400, fontFamily: fonts.regular, fontStyle: "italic", paddingVertical: 6 }}>
                      No student records yet. Click "Insert Template Headers" or paste rows above.
                    </Text>
                  ) : (
                    parsedCsvRows.map((row, i) => (
                      <View key={i} style={styles.csvPreviewRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.csvRowName}>{row.name}</Text>
                          <Text style={styles.csvRowSub}>
                            {row.primaryClass}
                            {row.secondaryClass ? ` & ${row.secondaryClass}` : ""} • {row.phone}
                          </Text>
                        </View>
                        <Badge text="READY" tone="success" />
                      </View>
                    ))
                  )}
                </View>
                <Button
                  title={`Enroll Cohort (${parsedCsvRows.length} Pupils)`}
                  variant="primary"
                  size="lg"
                  loading={busy}
                  disabled={parsedCsvRows.length === 0}
                  onPress={handleImportCsv}
                />
              </Card>
            )}

            {/* QR Scan Input View if selected */}
            {method === "qr" && (
              <Card style={styles.csvBox}>
                <Text style={styles.csvTitle}>SCAN QR OR ENTER PUPIL / VOUCHER ID</Text>
                <Text style={styles.csvFormatHint}>
                  Scan physical ID card, entrance voucher QR, or type pupil ID directly (no JSON required)
                </Text>

                <View style={{ marginVertical: 10 }}>
                  <Button
                    title="Open Live Camera Scanner"
                    icon="camera"
                    variant="primary"
                    size="md"
                    onPress={() => setScannerModalVisible(true)}
                  />
                </View>

                <TextInput
                  style={styles.csvInput}
                  multiline
                  numberOfLines={2}
                  value={qrCodeInput}
                  onChangeText={setQrCodeInput}
                  placeholder='Enter Pupil ID (e.g. STU-001) or Admission Code or paste QR'
                />
                <Button
                  title="Verify ID & Auto-Fill Form"
                  variant="outline"
                  size="md"
                  onPress={() => handleParseQrCode()}
                />
              </Card>
            )}
          </View>
        )}

        {/* STEP 2: PUPIL IDENTITY & TWO CLASSES */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PUPIL INFORMATION</Text>
              <Text style={styles.sectionSubtitle}>
                Legal pupil identification & classroom assignments
              </Text>
            </View>

            {/* First Name & Middle Name */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  FIRST NAME <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, stepErrors.firstName && styles.inputError]}
                  placeholder="e.g. Chinedu"
                  placeholderTextColor={colors.slate400}
                  value={firstName}
                  onChangeText={(val) => {
                    setFirstName(val);
                    if (stepErrors.firstName) setStepErrors((prev) => ({ ...prev, firstName: undefined }));
                  }}
                />
                {stepErrors.firstName && (
                  <Text style={styles.errorText}>{stepErrors.firstName}</Text>
                )}
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  MIDDLE NAME <Text style={styles.optionalMark}>(OPTIONAL)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Emeka"
                  placeholderTextColor={colors.slate400}
                  value={middleName}
                  onChangeText={setMiddleName}
                />
              </View>
            </View>

            {/* Surname / Last Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                SURNAME / LAST NAME <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, stepErrors.lastName && styles.inputError]}
                placeholder="e.g. Okafor"
                placeholderTextColor={colors.slate400}
                value={lastName}
                onChangeText={(val) => {
                  setLastName(val);
                  if (stepErrors.lastName) setStepErrors((prev) => ({ ...prev, lastName: undefined }));
                }}
              />
              {stepErrors.lastName && (
                <Text style={styles.errorText}>{stepErrors.lastName}</Text>
              )}
            </View>

            {fullName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
                <Icon name="verify" size={14} color={colors.greenDark} filled />
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.slate600 }}>
                  Enrolling: <Text style={{ fontFamily: fonts.bold, color: colors.navy }}>{fullName}</Text>
                </Text>
              </View>
            ) : null}

            {/* Gender Toggle */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>GENDER</Text>
              <View style={styles.genderRow}>
                {(["Male", "Female"] as const).map((g) => (
                  <Pressable
                    key={g}
                    style={[
                      styles.genderOption,
                      gender === g && styles.genderOptionActive,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Icon
                      name="profile"
                      size={18}
                      color={gender === g ? colors.white : colors.navy}
                    />
                    <Text
                      style={[
                        styles.genderOptionText,
                        gender === g && styles.genderOptionTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date of Birth Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                DATE OF BIRTH <Text style={styles.requiredMark}>*</Text>
              </Text>
              <Pressable
                style={styles.pickerTrigger}
                onPress={() => setDobPickerOpen(true)}
              >
                <Icon name="calendar" size={18} color={colors.navy} />
                <Text style={styles.pickerTriggerText}>
                  {dateOfBirth} ({calculatedAge})
                </Text>
              </Pressable>
            </View>

            {/* PRIMARY CLASSROOM (Required) */}
            <View style={styles.fieldGroup}>
              <View style={styles.classLabelRow}>
                <Text style={styles.label}>
                  PRIMARY CLASSROOM <Text style={styles.requiredMark}>*</Text>
                </Text>
                <Badge text="REQUIRED" tone="warning" />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classChipsScroll}>
                {data.classes.map((c) => {
                  const isSelected = selectedPrimaryClassId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.classChip,
                        isSelected && styles.classChipActive,
                      ]}
                      onPress={() => setSelectedPrimaryClassId(c.id)}
                    >
                      <Text
                        style={[
                          styles.classChipText,
                          isSelected && styles.classChipTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                      {isSelected && (
                        <Icon name="check" size={12} color={colors.white} filled />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* SECONDARY CLASSROOM / ELECTIVE (Optional - allows 2 classes) */}
            <View style={styles.fieldGroup}>
              <View style={styles.classLabelRow}>
                <Text style={styles.label}>
                  SECONDARY CLASS / ELECTIVE <Text style={styles.optionalMark}>(OPTIONAL)</Text>
                </Text>
                <Badge text="SECOND CLASSROOM" tone="neutral" />
              </View>
              <Text style={styles.classHelper}>
                Select an additional class, remedial arm, or club for this student.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classChipsScroll}>
                <Pressable
                  style={[
                    styles.classChip,
                    !selectedSecondaryClassId && styles.classChipActive,
                  ]}
                  onPress={() => setSelectedSecondaryClassId("")}
                >
                  <Text
                    style={[
                      styles.classChipText,
                      !selectedSecondaryClassId && styles.classChipTextActive,
                    ]}
                  >
                    None (Single Class)
                  </Text>
                </Pressable>

                {data.classes.map((c) => {
                  if (c.id === selectedPrimaryClassId) return null; // Don't allow same class twice
                  const isSelected = selectedSecondaryClassId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.classChip,
                        isSelected && styles.classChipActiveSecondary,
                      ]}
                      onPress={() => setSelectedSecondaryClassId(c.id)}
                    >
                      <Text
                        style={[
                          styles.classChipText,
                          isSelected && styles.classChipTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                      {isSelected && (
                        <Icon name="check" size={12} color={colors.white} filled />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
              {stepErrors.secondaryClassId && (
                <Text style={styles.errorText}>{stepErrors.secondaryClassId}</Text>
              )}
            </View>

            {/* Selected Classes Banner */}
            <View style={styles.enrolledClassesBanner}>
              <Icon name="school" size={16} color={colors.navy} />
              <View style={{ flex: 1 }}>
                <Text style={styles.enrolledClassesTitle}>ASSIGNED ROSTERS:</Text>
                <Text style={styles.enrolledClassesList}>
                  1. {primaryClass?.name} (Primary)
                  {secondaryClass ? `\n2. ${secondaryClass.name} (Secondary)` : ""}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: GUARDIAN AFFILIATION */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>GUARDIAN AFFILIATION</Text>
              <Text style={styles.sectionSubtitle}>
                Parent contact for billing receipts and automated notices
              </Text>
            </View>

            <View style={styles.modeTabs}>
              <Pressable
                style={[
                  styles.modeTab,
                  guardianMode === "new" && styles.modeTabActive,
                ]}
                onPress={() => setGuardianMode("new")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    guardianMode === "new" && styles.modeTabTextActive,
                  ]}
                >
                  Register New Parent
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modeTab,
                  guardianMode === "existing" && styles.modeTabActive,
                ]}
                onPress={() => setGuardianMode("existing")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    guardianMode === "existing" && styles.modeTabTextActive,
                  ]}
                >
                  Link Existing Parent
                </Text>
              </Pressable>
            </View>

            {guardianMode === "new" ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    GUARDIAN FULL NAME <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mrs. Ngozi Okafor"
                    placeholderTextColor={colors.slate400}
                    value={guardianFullName}
                    onChangeText={setGuardianFullName}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    GUARDIAN PHONE NUMBER <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="08031234567"
                    placeholderTextColor={colors.slate400}
                    keyboardType="phone-pad"
                    value={guardianPhone}
                    onChangeText={setGuardianPhone}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>GUARDIAN EMAIL ADDRESS (OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ngozi.okafor@example.com"
                    placeholderTextColor={colors.slate400}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={guardianEmail}
                    onChangeText={setGuardianEmail}
                  />
                </View>
              </>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>SELECT REGISTERED GUARDIAN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search existing guardian by name..."
                  placeholderTextColor={colors.slate400}
                  value={guardianSearch}
                  onChangeText={setGuardianSearch}
                />
                <ScrollView style={styles.guardianList} nestedScrollEnabled>
                  {existingParents.map((parent) => {
                    const isSelected = selectedGuardianUserId === parent.userId;
                    return (
                      <Pressable
                        key={parent.userId}
                        style={[
                          styles.guardianOption,
                          isSelected && styles.guardianOptionActive,
                        ]}
                        onPress={() => setSelectedGuardianUserId(parent.userId)}
                      >
                        <Text
                          style={[
                            styles.guardianOptionName,
                            isSelected && styles.guardianOptionNameActive,
                          ]}
                        >
                          {parent.name}
                        </Text>
                        {isSelected && (
                          <Icon name="check" size={14} color={colors.orange} filled />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* STEP 4: MEDICAL & HEALTH */}
        {currentStep === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MEDICAL & EMERGENCY</Text>
              <Text style={styles.sectionSubtitle}>
                Campus health profile and emergency contacts
              </Text>
            </View>

            {/* Blood Group */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>BLOOD GROUP</Text>
              <View style={styles.pillsRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <Pressable
                    key={bg}
                    style={[
                      styles.pillOption,
                      bloodGroup === bg && styles.pillOptionActive,
                    ]}
                    onPress={() => setBloodGroup(bg)}
                  >
                    <Text
                      style={[
                        styles.pillOptionText,
                        bloodGroup === bg && styles.pillOptionTextActive,
                      ]}
                    >
                      {bg}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Genotype */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>GENOTYPE</Text>
              <View style={styles.pillsRow}>
                {GENOTYPES.map((gt) => (
                  <Pressable
                    key={gt}
                    style={[
                      styles.pillOption,
                      genotype === gt && styles.pillOptionActive,
                    ]}
                    onPress={() => setGenotype(gt)}
                  >
                    <Text
                      style={[
                        styles.pillOptionText,
                        genotype === gt && styles.pillOptionTextActive,
                      ]}
                    >
                      {gt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Emergency Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMERGENCY DISPATCH PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="08031234567"
                placeholderTextColor={colors.slate400}
                keyboardType="phone-pad"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
              />
            </View>
          </View>
        )}

        {/* STEP 5: REVIEW & CONFIRMATION */}
        {currentStep === 5 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>REVIEW & CONFIRM ENROLLMENT</Text>
              <Text style={styles.sectionSubtitle}>
                Verify student admission details and class allocations
              </Text>
            </View>

            <Card style={styles.summaryCard}>
              <View style={styles.summaryHero}>
                <Avatar name={fullName} size={54} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.summaryPupilName}>{fullName}</Text>
                  <Text style={styles.summaryPupilSub}>
                    {gender} • {calculatedAge}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Primary Classroom:</Text>
                <Badge text={primaryClass?.name || "General"} tone="warning" />
              </View>

              {secondaryClass && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Secondary Classroom:</Text>
                  <Badge text={secondaryClass.name} tone="neutral" />
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guardian Contact:</Text>
                <Text style={styles.summaryVal}>
                  {guardianMode === "existing"
                    ? selectedExistingGuardian?.name
                    : guardianFullName}{" "}
                  ({guardianPhone})
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Term Tuition Invoice:</Text>
                <Text style={styles.summaryValFee}>
                  {formatKoboToNaira(primaryClass?.termFee || 15000000)}
                </Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Footer Stepper Controls */}
      {method === "manual" && (
        <View style={styles.footerBar}>
          {currentStep > 1 && (
            <Button
              title="Back"
              variant="outline"
              size="lg"
              onPress={handlePrevStep}
              style={{ flex: 1 }}
            />
          )}

          {currentStep < 5 ? (
            <Button
              title="Continue"
              variant="primary"
              size="lg"
              onPress={handleNextStep}
              style={{ flex: 2 }}
            />
          ) : (
            <Button
              title={`Confirm & Enroll (${secondaryClass ? "2 Classes" : "1 Class"})`}
              variant="primary"
              size="lg"
              loading={busy}
              onPress={handleFinalSubmit}
              style={{ flex: 2 }}
            />
          )}
        </View>
      )}

      {/* DOB Date Picker Modal */}
      <DatePickerModal
        visible={dobPickerOpen}
        onClose={() => setDobPickerOpen(false)}
        initialDate={dateOfBirth}
        title="Select Date of Birth"
        onSelect={(iso) => {
          setDateOfBirth(iso);
          setDobPickerOpen(false);
        }}
      />

      {/* Live Camera Scanner Modal */}
      <FullscreenScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        defaultMode="student"
        onScanComplete={(code) => {
          setScannerModalVisible(false);
          setQrCodeInput(code);
          handleParseQrCode(code);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stepProgressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  stepProgressItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBadgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeActive: {
    backgroundColor: colors.navy,
  },
  stepBadgeDone: {
    backgroundColor: colors.green,
  },
  stepBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate500,
  },
  stepBadgeTextActive: {
    color: colors.white,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.slate200,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: colors.green,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  stepContainer: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: 2,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  methodCardsList: {
    gap: spacing.sm,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.xl,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    ...shadows.sm,
  },
  methodCardActive: {
    borderColor: colors.orange,
  },
  methodIconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  methodInfo: {
    flex: 1,
    gap: 4,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methodTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  methodDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 16,
  },
  csvBox: {
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  csvHeader: {
    gap: 2,
  },
  csvTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  csvFormatHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  csvInput: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    padding: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.navy,
    backgroundColor: colors.slate50,
    textAlignVertical: "top",
    minHeight: 90,
  },
  csvPreviewHeader: {
    marginTop: 4,
  },
  csvPreviewTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate400,
  },
  csvPreviewList: {
    gap: 6,
    marginBottom: spacing.xs,
  },
  csvPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  csvRowName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  csvRowSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate600,
    letterSpacing: 0.5,
  },
  requiredMark: {
    color: colors.red,
  },
  optionalMark: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.slate400,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.red,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.red,
    marginTop: 2,
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  genderOptionActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  genderOptionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  genderOptionTextActive: {
    color: colors.white,
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  pickerTriggerText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  classLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classHelper: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    marginBottom: 4,
  },
  classChipsScroll: {
    flexDirection: "row",
  },
  classChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginRight: 8,
  },
  classChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  classChipActiveSecondary: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  classChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate700,
  },
  classChipTextActive: {
    fontFamily: fonts.bold,
    color: colors.white,
  },
  enrolledClassesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.slate100,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  enrolledClassesTitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  enrolledClassesList: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
    lineHeight: 18,
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.slate100,
    padding: 3,
    borderRadius: radii.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radii.sm,
  },
  modeTabActive: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  modeTabText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate600,
  },
  modeTabTextActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  guardianList: {
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  guardianOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  guardianOptionActive: {
    backgroundColor: colors.orangeLight,
  },
  guardianOptionName: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  guardianOptionNameActive: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pillOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  pillOptionActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  pillOptionText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  pillOptionTextActive: {
    color: colors.white,
  },
  summaryCard: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radii.xl,
  },
  summaryHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryPupilName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  summaryPupilSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginVertical: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
  },
  summaryVal: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  summaryValFee: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.greenDark,
  },
  footerBar: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
  },
});
