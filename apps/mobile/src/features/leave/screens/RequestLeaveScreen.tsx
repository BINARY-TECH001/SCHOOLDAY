import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Button, Card, Screen } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { useSchool } from "../../../providers/AppProvider";
import { LeaveInput } from "../../../domain/model";
import { DatePickerModal } from "../../../components/pickers/DatePickerModal";
import { pickAndUploadImage } from "../../../services/cloudinary";
import {
  calculateLeaveDuration,
  formatLeaveDateRange,
  validateLeaveInput,
} from "../utils/leaveValidation";

const STEPS = [
  { id: 1, label: "Category" },
  { id: 2, label: "Period" },
  { id: 3, label: "Handover" },
  { id: 4, label: "Review" },
];

const LEAVE_TYPES: Array<{
  key: LeaveInput["type"];
  label: string;
  sub: string;
  description: string;
  icon: "calendar" | "verify" | "people";
}> = [
  {
    key: "Annual",
    label: "Annual Leave",
    sub: "Vacation / Personal Time",
    description: "Paid annual absence allowance according to your institutional staff contract.",
    icon: "calendar",
  },
  {
    key: "Medical",
    label: "Medical Leave",
    sub: "Sick Leave / Health Appointments",
    description: "Temporary health absence. Supporting documentation / medical certificate recommended.",
    icon: "verify",
  },
  {
    key: "Family",
    label: "Family & Compassionate",
    sub: "Bereavement / Paternity / Care",
    description: "Emergency family commitments, childcare responsibilities, or bereavement support.",
    icon: "people",
  },
];

export function RequestLeaveScreen() {
  const insets = useSafeAreaInsets();
  const { school, context, data, services, act, offline, refresh } = useSchool();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState<LeaveInput["type"]>("Annual");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState<string>("");
  const [reliefStaffId, setReliefStaffId] = useState<string>("");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  // Date Pickers
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);

  // Validation
  const [errors, setErrors] = useState<{ start?: string; end?: string; reason?: string }>({});

  const duration = calculateLeaveDuration(startDate, endDate);
  const eligibleColleagues = data.staff.filter((s) => s.userId !== context.userId);
  const selectedReliefStaff = data.staff.find((s) => s.id === reliefStaffId || s.userId === reliefStaffId);

  const handleStartDateSelect = (selected: string) => {
    setStartDate(selected);
    if (!endDate || endDate < selected) {
      setEndDate(selected);
    }
    setActivePicker(null);
  };

  const handleEndDateSelect = (selected: string) => {
    setEndDate(selected);
    setActivePicker(null);
  };

  const handleUploadDocument = async () => {
    setUploadingDoc(true);
    try {
      const url = await pickAndUploadImage({ allowsEditing: false, quality: 0.9 });
      if (url) {
        setAttachmentUrl(url);
        toast.success("Medical document attached successfully!");
      }
    } catch {
      toast.error("Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Step navigation validations
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!reason.trim() || reason.trim().length < 10) {
        setErrors({ reason: "Please provide a detailed reason (at least 10 characters)." });
        return;
      }
      setErrors({});
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!startDate || !endDate || endDate < startDate) {
        setErrors({ end: "End date must be on or after start date." });
        return;
      }
      setErrors({});
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async (asDraft: boolean) => {
    setSubmitting(true);
    const formInput: LeaveInput = {
      type,
      start: startDate,
      end: endDate,
      reason: reason.trim(),
    };

    if (!asDraft) {
      const validation = validateLeaveInput(formInput);
      if (!validation.isValid) {
        setErrors(validation.errors);
        toast.error("Please resolve form errors before submitting.");
        setSubmitting(false);
        return;
      }
    }

    try {
      await act(
        () => services.requestLeave(context, formInput, offline, asDraft),
        asDraft
          ? "Time off request saved as draft"
          : offline
          ? "Request submitted offline • Will sync when connected"
          : "Time off request submitted to proprietor for approval!",
      );
      refresh();
      router.back();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      title="Request Time Off"
      subtitle={`${school.name} Faculty Leave Application`}
      scrollable={false}
      back={handlePreviousStep}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Step Progress Header */}
        <View style={styles.stepHeaderWrap}>
          <View style={styles.stepsRow}>
            {STEPS.map((s) => {
              const isActive = s.id === currentStep;
              const isDone = s.id < currentStep;
              return (
                <View key={s.id} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isActive && styles.stepCircleActive,
                    ]}
                  >
                    {isDone ? (
                      <Icon name="check" size={13} color="#ffffff" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNum,
                          (isActive || isDone) && styles.stepNumActive,
                        ]}
                      >
                        {s.id}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      (isActive || isDone) && styles.stepLabelActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` },
              ]}
            />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* STEP 1: CATEGORY & REASON */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Select Leave Category</Text>
              <View style={styles.categoriesList}>
                {LEAVE_TYPES.map((cat) => {
                  const isSelected = type === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      accessibilityRole="button"
                      onPress={() => setType(cat.key)}
                      style={[
                        styles.catCard,
                        isSelected && styles.catCardSelected,
                      ]}
                    >
                      <View style={styles.catTopRow}>
                        <View
                          style={[
                            styles.catIconTile,
                            isSelected && styles.catIconTileSelected,
                          ]}
                        >
                          <Icon
                            name={cat.icon}
                            size={18}
                            color={isSelected ? "#ffffff" : colors.navy}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.catLabel}>{cat.label}</Text>
                          <Text style={styles.catSub}>{cat.sub}</Text>
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                      </View>
                      <Text style={styles.catDesc}>{cat.description}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>REASON FOR TIME OFF</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    Boolean(errors.reason) && styles.inputError,
                  ]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Detail the circumstances of your absence (e.g. medical appointment, annual leave travel)..."
                  placeholderTextColor={colors.slate400}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors.reason ? (
                  <Text style={styles.errorText}>{errors.reason}</Text>
                ) : (
                  <Text style={styles.charCountText}>
                    {reason.length} / 10 minimum characters
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* STEP 2: DATES & WORKING DAYS */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Leave Dates & Duration</Text>

              {/* Duration Preview Card */}
              <View style={styles.durationCard}>
                <View style={styles.durationTopRow}>
                  <View style={styles.calendarIconBox}>
                    <Icon name="calendar" size={20} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.durationDaysText}>
                      {duration.workingDays}{" "}
                      {duration.workingDays === 1 ? "Working Day" : "Working Days"}
                    </Text>
                    <Text style={styles.durationRangeText}>
                      {formatLeaveDateRange(startDate, endDate)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.durationNote}>
                  Excludes weekend days automatically. Total calendar days:{" "}
                  {duration.calendarDays}.
                </Text>
              </View>

              {/* Date Inputs */}
              <View style={styles.dateFieldsGrid}>
                {/* Start Date */}
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>START DATE</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActivePicker("start")}
                    style={styles.datePickerBtn}
                  >
                    <Icon name="calendar" size={16} color={colors.navy} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.datePickerVal}>{startDate}</Text>
                      <Text style={styles.datePickerSub}>
                        {new Date(startDate + "T00:00:00").toLocaleDateString(
                          "en-NG",
                          { weekday: "short", month: "short", day: "numeric" },
                        )}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* End Date */}
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>END DATE</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActivePicker("end")}
                    style={styles.datePickerBtn}
                  >
                    <Icon name="calendar" size={16} color={colors.navy} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.datePickerVal}>{endDate}</Text>
                      <Text style={styles.datePickerSub}>
                        {new Date(endDate + "T00:00:00").toLocaleDateString(
                          "en-NG",
                          { weekday: "short", month: "short", day: "numeric" },
                        )}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {errors.end && <Text style={styles.errorText}>{errors.end}</Text>}
            </View>
          )}

          {/* STEP 3: HANDOVER & DOCUMENTATION */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Relief Colleague & Contact</Text>

              {/* Relief Colleague Selector */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>DUTY HANDOVER / RELIEF STAFF</Text>
                <Text style={styles.fieldHint}>
                  Colleague nominated to cover classroom supervision or scheduled tasks.
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.colleaguesScroll}
                >
                  {eligibleColleagues.map((st) => {
                    const isSelected = reliefStaffId === st.id;
                    return (
                      <Pressable
                        key={st.id}
                        accessibilityRole="button"
                        onPress={() => setReliefStaffId(st.id)}
                        style={[
                          styles.staffPill,
                          isSelected && styles.staffPillSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.staffDot,
                            isSelected && styles.staffDotSelected,
                          ]}
                        />
                        <View>
                          <Text
                            style={[
                              styles.staffPillName,
                              isSelected && styles.staffPillNameSelected,
                            ]}
                          >
                            {st.name}
                          </Text>
                          <Text style={styles.staffPillRole}>{st.role}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Emergency Contact */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>EMERGENCY PHONE NUMBER</Text>
                <View style={styles.inputWithIcon}>
                  <Icon name="phone" size={16} color={colors.muted} />
                  <TextInput
                    style={styles.textInputFrameless}
                    value={emergencyPhone}
                    onChangeText={setEmergencyPhone}
                    placeholder="+234 800 000 0000"
                    placeholderTextColor={colors.slate400}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Supporting Document / Medical Certificate */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>SUPPORTING DOCUMENTATION</Text>
                <Text style={styles.fieldHint}>
                  Optional medical certificate, doctor's note, or official invitation.
                </Text>

                {attachmentUrl ? (
                  <View style={styles.attachmentPreviewWrap}>
                    <Image
                      source={{ uri: attachmentUrl }}
                      style={styles.attachmentThumbnail}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.attachmentSuccessTitle}>Document Attached</Text>
                      <Text style={styles.attachmentSuccessSub}>
                        Stored securely on Cloudinary CDN
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setAttachmentUrl("")}
                      style={styles.removeDocBtn}
                    >
                      <Icon name="trash" size={15} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleUploadDocument}
                    disabled={uploadingDoc}
                    style={styles.uploadDocBox}
                  >
                    {uploadingDoc ? (
                      <ActivityIndicator size="small" color={colors.navy} />
                    ) : (
                      <>
                        <Icon name="upload" size={20} color={colors.navy} />
                        <Text style={styles.uploadDocText}>
                          Attach Certificate or Photo
                        </Text>
                        <Text style={styles.uploadDocHint}>JPG or PNG via Cloudinary</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Review Time Off Request</Text>

              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewBadgeWrap}>
                    <Text style={styles.reviewBadgeText}>{type.toUpperCase()} LEAVE</Text>
                  </View>
                  <Text style={styles.reviewDaysHighlight}>
                    {duration.workingDays} Working Days
                  </Text>
                </View>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Date Interval</Text>
                  <Text style={styles.reviewVal}>
                    {formatLeaveDateRange(startDate, endDate)}
                  </Text>
                </View>

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Reason</Text>
                  <Text style={styles.reviewValReason}>{reason}</Text>
                </View>

                {selectedReliefStaff && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Relief Staff</Text>
                    <Text style={styles.reviewVal}>
                      {selectedReliefStaff.name} ({selectedReliefStaff.role})
                    </Text>
                  </View>
                )}

                {emergencyPhone ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Emergency Contact</Text>
                    <Text style={styles.reviewVal}>{emergencyPhone}</Text>
                  </View>
                ) : null}

                {attachmentUrl ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Documentation</Text>
                    <Text style={[styles.reviewVal, { color: colors.greenDark }]}>
                      Verified Certificate Attached
                    </Text>
                  </View>
                ) : null}
              </Card>

              {/* Policy note */}
              <View style={styles.policyNoticeBox}>
                <Icon name="verify" size={16} color={colors.navy} filled />
                <Text style={styles.policyNoticeText}>
                  Your request will be routed directly to the school proprietor / HR for approval.
                  You will receive an instant notification once reviewed.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions Bar */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {currentStep > 1 && (
            <Button
              title="Back"
              variant="outline"
              size="md"
              onPress={handlePreviousStep}
            />
          )}

          {currentStep < 4 ? (
            <View style={{ flex: 1 }}>
              <Button
                title="Continue"
                variant="primary"
                size="md"
                onPress={handleNextStep}
              />
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
              <Button
                title="Save Draft"
                variant="outline"
                size="md"
                onPress={() => handleSubmit(true)}
                disabled={submitting}
              />
              <View style={{ flex: 1 }}>
                <Button
                  title={submitting ? "Submitting..." : "Submit to Proprietor"}
                  variant="primary"
                  size="md"
                  onPress={() => handleSubmit(false)}
                  disabled={submitting}
                />
              </View>
            </View>
          )}
        </View>

        {/* Zero-Gap Date Picker Modals */}
        <DatePickerModal
          visible={activePicker === "start"}
          onClose={() => setActivePicker(null)}
          onSelectDate={handleStartDateSelect}
          selectedDate={startDate}
          title="Select Leave Start Date"
        />

        <DatePickerModal
          visible={activePicker === "end"}
          onClose={() => setActivePicker(null)}
          onSelectDate={handleEndDateSelect}
          selectedDate={endDate}
          minDate={startDate}
          title="Select Leave End Date"
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepHeaderWrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.xs,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  stepCircleDone: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
  },
  stepNum: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  stepNumActive: {
    color: "#ffffff",
  },
  stepLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  stepLabelActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.borderLight,
    width: "100%",
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.navy,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 100,
  },
  stepContainer: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  categoriesList: {
    gap: 10,
  },
  catCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 8,
  },
  catCardSelected: {
    borderColor: colors.navy,
    backgroundColor: "#f8fafc",
  },
  catTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIconTile: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  catIconTileSelected: {
    backgroundColor: colors.navy,
  },
  catLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  catSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.navy,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.navy,
  },
  catDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate600,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.slate700,
  },
  fieldHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 100,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  charCountText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
  },
  durationCard: {
    backgroundColor: "#eff6ff",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: spacing.md,
    gap: 8,
  },
  durationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calendarIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  durationDaysText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  durationRangeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate600,
  },
  durationNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  dateFieldsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  dateCol: {
    flex: 1,
    gap: 6,
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.sm,
  },
  datePickerVal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  datePickerSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  colleaguesScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  staffPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffPillSelected: {
    borderColor: colors.navy,
    backgroundColor: "#f8fafc",
  },
  staffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderDark,
  },
  staffDotSelected: {
    backgroundColor: colors.navy,
  },
  staffPillName: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  staffPillNameSelected: {
    fontFamily: fonts.bold,
  },
  staffPillRole: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 12,
    height: 48,
  },
  textInputFrameless: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  uploadDocBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderDark,
    backgroundColor: colors.surfaceSubtle,
    gap: 6,
  },
  uploadDocText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  uploadDocHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  attachmentPreviewWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentThumbnail: {
    width: 50,
    height: 50,
    borderRadius: radii.sm,
  },
  attachmentSuccessTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  attachmentSuccessSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  removeDocBtn: {
    padding: 8,
  },
  reviewCard: {
    padding: spacing.md,
    gap: 12,
    backgroundColor: colors.white,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewBadgeWrap: {
    backgroundColor: colors.navyLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  reviewBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  reviewDaysHighlight: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.greenDark,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  reviewRow: {
    gap: 2,
  },
  reviewKey: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  reviewVal: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  reviewValReason: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.navy,
  },
  policyNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  policyNoticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.navy,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: "row",
    gap: 10,
  },
});
