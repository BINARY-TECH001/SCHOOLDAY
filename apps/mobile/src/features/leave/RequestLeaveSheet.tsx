import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Button } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { LeaveInput } from "../../domain/model";
import { DatePickerModal } from "../../components/pickers/DatePickerModal";
import {
  calculateLeaveDuration,
  validateLeaveInput,
} from "./utils/leaveValidation";

export interface RequestLeaveSheetProps {
  visible: boolean;
  onClose: () => void;
  initialData?: LeaveInput;
  initialId?: string;
  isDraft?: boolean;
  onSubmit: (input: LeaveInput, draft: boolean, id?: string) => Promise<void>;
  busy?: boolean;
}

const LEAVE_TYPES: Array<{
  key: LeaveInput["type"];
  label: string;
  sub: string;
  icon: "calendar" | "verify" | "people";
}> = [
  { key: "Annual", label: "Annual Leave", sub: "Vacation / Personal", icon: "calendar" },
  { key: "Medical", label: "Medical Leave", sub: "Sick / Appointment", icon: "verify" },
  { key: "Family", label: "Family Leave", sub: "Care / Bereavement", icon: "people" },
];

export function RequestLeaveSheet({
  visible,
  onClose,
  initialData,
  initialId,
  isDraft,
  onSubmit,
  busy,
}: RequestLeaveSheetProps) {
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<LeaveInput["type"]>("Annual");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Modal date picker state
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);

  // Validation errors
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<{ start?: string; end?: string; reason?: string }>({});

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setType(initialData.type || "Annual");
        setStartDate(initialData.start || "");
        setEndDate(initialData.end || "");
        setReason(initialData.reason || "");
      } else {
        const todayIso = new Date().toISOString().slice(0, 10);
        setType("Annual");
        setStartDate(todayIso);
        setEndDate(todayIso);
        setReason("");
      }
      setTouched(false);
      setErrors({});
      setActivePicker(null);
    }
  }, [visible, initialData]);

  const duration = calculateLeaveDuration(startDate, endDate);

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

  const handleSave = async (asDraft: boolean) => {
    setTouched(true);
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
        return;
      }
    }

    try {
      await onSubmit(formInput, asDraft, initialId);
      onClose();
    } catch {
      // Handled by caller's toast/act
    }
  };

  const formatDisplayDate = (isoStr?: string) => {
    if (!isoStr) return "Select date";
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  {initialId ? "Edit Leave Request" : "Request Time Off"}
                </Text>
                <Text style={styles.headerSub}>
                  Submit formal request for administrative review
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeBtn}
                onPress={onClose}
              >
                <Icon name="close" size={20} color={colors.navy} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* SECTION 1: LEAVE TYPE SELECTOR */}
              <View style={styles.formGroup}>
                <Text style={styles.groupLabel}>LEAVE CATEGORY</Text>
                <View style={styles.typeOptionsRow}>
                  {LEAVE_TYPES.map((t) => {
                    const isSelected = type === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        accessibilityRole="button"
                        accessibilityLabel={t.label}
                        style={[
                          styles.typeCard,
                          isSelected && styles.typeCardSelected,
                        ]}
                        onPress={() => setType(t.key)}
                      >
                        <View
                          style={[
                            styles.typeIconCircle,
                            isSelected && styles.typeIconCircleSelected,
                          ]}
                        >
                          <Icon
                            name={t.icon}
                            size={16}
                            color={isSelected ? colors.white : colors.navy}
                          />
                        </View>
                        <Text
                          style={[
                            styles.typeCardLabel,
                            isSelected && styles.typeCardLabelSelected,
                          ]}
                        >
                          {t.label}
                        </Text>
                        <Text
                          style={[
                            styles.typeCardSub,
                            isSelected && styles.typeCardSubSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {t.sub}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* SECTION 2: DATES */}
              <View style={styles.formGroup}>
                <View style={styles.datesHeaderRow}>
                  <Text style={styles.groupLabel}>PERIOD & DURATION</Text>
                  {duration.calendarDays > 0 && (
                    <View style={styles.durationChip}>
                      <Icon name="clock" size={12} color={colors.navy} />
                      <Text style={styles.durationChipText}>
                        {duration.formatted}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.datesGrid}>
                  {/* Start Date Button */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select start date"
                    style={[
                      styles.dateSelectorBox,
                      errors.start && styles.dateSelectorBoxError,
                    ]}
                    onPress={() => setActivePicker("start")}
                  >
                    <Text style={styles.dateSelectorLabel}>START DATE</Text>
                    <View style={styles.dateSelectorValueRow}>
                      <Icon name="calendar" size={15} color={colors.navy} />
                      <Text
                        style={[
                          styles.dateSelectorValue,
                          !startDate && styles.placeholderText,
                        ]}
                      >
                        {formatDisplayDate(startDate)}
                      </Text>
                    </View>
                    {errors.start ? (
                      <Text style={styles.errorText}>{errors.start}</Text>
                    ) : null}
                  </Pressable>

                  {/* End Date Button */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select end date"
                    style={[
                      styles.dateSelectorBox,
                      errors.end && styles.dateSelectorBoxError,
                    ]}
                    onPress={() => setActivePicker("end")}
                  >
                    <Text style={styles.dateSelectorLabel}>END DATE</Text>
                    <View style={styles.dateSelectorValueRow}>
                      <Icon name="calendar" size={15} color={colors.navy} />
                      <Text
                        style={[
                          styles.dateSelectorValue,
                          !endDate && styles.placeholderText,
                        ]}
                      >
                        {formatDisplayDate(endDate)}
                      </Text>
                    </View>
                    {errors.end ? (
                      <Text style={styles.errorText}>{errors.end}</Text>
                    ) : null}
                  </Pressable>
                </View>
              </View>

              {/* SECTION 3: REASON & COVERAGE */}
              <View style={styles.formGroup}>
                <View style={styles.datesHeaderRow}>
                  <Text style={styles.groupLabel}>REASON FOR REQUEST</Text>
                  <Text
                    style={[
                      styles.charCount,
                      reason.trim().length >= 10 && styles.charCountValid,
                    ]}
                  >
                    {reason.trim().length}/10 min chars
                  </Text>
                </View>

                <TextInput
                  accessibilityLabel="Reason for leave"
                  style={[
                    styles.reasonInput,
                    errors.reason && styles.reasonInputError,
                  ]}
                  placeholder="Provide context for HR and academic coverage planning (at least 10 characters)..."
                  placeholderTextColor={colors.muted}
                  value={reason}
                  onChangeText={(val) => {
                    setReason(val);
                    if (touched && val.trim().length >= 10) {
                      setErrors((prev) => ({ ...prev, reason: undefined }));
                    }
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors.reason ? (
                  <Text style={styles.errorText}>{errors.reason}</Text>
                ) : null}
              </View>

              {/* Administrative Note */}
              <View style={styles.noticeBox}>
                <Icon name="verify" size={16} color={colors.navy} />
                <Text style={styles.noticeText}>
                  Your request will be routed directly to school administration.
                  Lesson coverage will be coordinated with your department head.
                </Text>
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <View style={styles.actionBtnRow}>
                <Button
                  title="Save Draft"
                  variant="outline"
                  size="md"
                  disabled={busy}
                  style={{ flex: 1 }}
                  onPress={() => handleSave(true)}
                />
                <Button
                  title={initialId && !isDraft ? "Update Request" : "Submit Request"}
                  variant="primary"
                  size="md"
                  disabled={busy}
                  style={{ flex: 2 }}
                  onPress={() => handleSave(false)}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Date Pickers */}
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
          minDate={startDate || undefined}
          title="Select Leave End Date"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  keyboardWrap: {
    width: "100%",
  },
  sheetContainer: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "92%",
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  bodyContent: {
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  formGroup: {
    gap: spacing.xs + 2,
  },
  groupLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  typeOptionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    alignItems: "center",
    gap: 4,
  },
  typeCardSelected: {
    borderColor: colors.navy,
    backgroundColor: "#f0f4ff",
  },
  typeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconCircleSelected: {
    backgroundColor: colors.navy,
  },
  typeCardLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
    textAlign: "center",
  },
  typeCardLabelSelected: {
    color: colors.navy,
  },
  typeCardSub: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
  },
  typeCardSubSelected: {
    color: colors.slate600,
  },
  datesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  durationChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  datesGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateSelectorBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  dateSelectorBoxError: {
    borderColor: colors.danger,
    backgroundColor: "#fff5f5",
  },
  dateSelectorLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  dateSelectorValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  dateSelectorValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
    flex: 1,
  },
  placeholderText: {
    color: colors.muted,
  },
  charCount: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  charCountValid: {
    color: colors.green,
  },
  reasonInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.navy,
    minHeight: 90,
  },
  reasonInputError: {
    borderColor: colors.danger,
    backgroundColor: "#fff5f5",
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#eff6ff",
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.navy,
    lineHeight: 16,
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
