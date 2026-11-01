import React, { useState, useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Icon } from "../Icon";

export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (isoDate: string) => void;
  selectedDate?: string; // YYYY-MM-DD
  title?: string;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  title = "Select Date",
  minDate,
  maxDate,
}: DatePickerModalProps) {
  const insets = useSafeAreaInsets();

  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return new Date(selectedDate);
    }
    return new Date();
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed
  const [tempSelected, setTempSelected] = useState<string>(
    selectedDate || initialDate.toISOString().slice(0, 10)
  );

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days for currentMonth and currentYear
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: { day: number; dateStr: string; disabled: boolean }[] = [];

    // Empty slots before month start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: "", disabled: true });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const monthPadded = String(currentMonth + 1).padStart(2, "0");
      const dayPadded = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${monthPadded}-${dayPadded}`;

      let disabled = false;
      if (minDate && dateStr < minDate) disabled = true;
      if (maxDate && dateStr > maxDate) disabled = true;

      days.push({ day: d, dateStr, disabled });
    }

    return days;
  }, [currentYear, currentMonth, minDate, maxDate]);

  const handleConfirm = () => {
    if (tempSelected) {
      onSelectDate(tempSelected);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Text style={styles.sheetSubtitle}>
                {tempSelected
                  ? new Date(tempSelected + "T00:00:00").toLocaleDateString("en-NG", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Tap a day on the calendar"}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>

          {/* Month & Year Navigation Row */}
          <View style={styles.monthNavRow}>
            <Pressable
              onPress={handlePrevMonth}
              style={[styles.navArrowBtn, { transform: [{ rotate: "180deg" }] }]}
              hitSlop={8}
              accessibilityLabel="Previous Month"
            >
              <Icon name="chevron" size={16} color={colors.navy} />
            </Pressable>

            <Text style={styles.monthYearLabel}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>

            <Pressable
              onPress={handleNextMonth}
              style={styles.navArrowBtn}
              hitSlop={8}
              accessibilityLabel="Next Month"
            >
              <Icon name="chevron" size={16} color={colors.navy} />
            </Pressable>
          </View>

          {/* Weekday Labels Row */}
          <View style={styles.weekdaysRow}>
            {DAYS_OF_WEEK.map((day) => (
              <Text key={day} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, index) => {
              if (item.day === 0) {
                return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
              }

              const isSelected = item.dateStr === tempSelected;
              const isToday = item.dateStr === todayStr;

              return (
                <Pressable
                  key={item.dateStr}
                  disabled={item.disabled}
                  onPress={() => setTempSelected(item.dateStr)}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayCellInner,
                      isSelected && styles.dayCellSelected,
                      item.disabled && styles.dayCellDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        isSelected && styles.dayNumberSelected,
                        item.disabled && styles.dayNumberDisabled,
                      ]}
                    >
                      {item.day}
                    </Text>
                    {isToday && !isSelected && <View style={styles.todayIndicatorDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Actions Footer */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => {
                setTempSelected(todayStr);
                setCurrentYear(new Date().getFullYear());
                setCurrentMonth(new Date().getMonth());
              }}
              style={styles.todayBtn}
              hitSlop={8}
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={!tempSelected}
                style={[styles.confirmBtn, !tempSelected && { opacity: 0.5 }]}
              >
                <Text style={styles.confirmBtnText}>Select Date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 17, 32, 0.45)",
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthYearLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  weekdaysRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: spacing.xs,
  },
  weekdayText: {
    width: "14.285%",
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  dayCellEmpty: {
    width: "14.285%",
    height: 40,
    marginVertical: 2,
  },
  dayCell: {
    width: "14.285%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayCellInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellSelected: {
    backgroundColor: colors.navy,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayNumberText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  dayNumberSelected: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  dayNumberDisabled: {
    color: colors.muted,
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.orange,
    position: "absolute",
    bottom: 5,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  todayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  todayBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.muted,
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
    backgroundColor: colors.orange,
  },
  confirmBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
});
