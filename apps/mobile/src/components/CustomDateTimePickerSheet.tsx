import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, fonts, shadows } from "../theme/tokens";
import { Icon } from "./Icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface CustomDateTimePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  mode?: "date" | "time" | "datetime";
  title?: string;
  subtitle?: string;
  initialDate?: Date;
  initialTime?: string; // "07:30"
  onConfirm: (result: { date?: Date; dateString?: string; timeString?: string }) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const TIME_PRESETS = [
  { label: "07:30 AM", hour: 7, min: 30, ampm: "AM" },
  { label: "08:00 AM", hour: 8, min: 0, ampm: "AM" },
  { label: "01:30 PM", hour: 1, min: 30, ampm: "PM" },
  { label: "03:30 PM", hour: 3, min: 30, ampm: "PM" },
  { label: "04:00 PM", hour: 4, min: 0, ampm: "PM" },
  { label: "05:00 PM", hour: 5, min: 0, ampm: "PM" },
];

export function CustomDateTimePickerSheet({
  visible,
  onClose,
  mode = "time",
  title,
  subtitle,
  initialDate,
  initialTime = "07:30",
  onConfirm,
}: CustomDateTimePickerSheetProps) {
  // Mode switcher if "datetime"
  const [activeTab, setActiveTab] = useState<"date" | "time">(
    mode === "date" ? "date" : "time"
  );

  // Calendar Date State
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(
    initialDate ? initialDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    initialDate ? initialDate.getMonth() : today.getMonth()
  );
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate || today
  );

  // Time State: Parse initial "07:30" or "15:30"
  const parseInitialTime = () => {
    if (!initialTime) return { hour: 7, min: 30, ampm: "AM" as const };
    const [hStr, mStr] = initialTime.split(":");
    let h = parseInt(hStr || "7", 10);
    const m = parseInt(mStr || "30", 10);
    let ampm: "AM" | "PM" = "AM";
    if (h >= 12) {
      ampm = "PM";
      if (h > 12) h -= 12;
    } else if (h === 0) {
      h = 12;
    }
    return { hour: h, min: m, ampm };
  };

  const initialParsed = parseInitialTime();
  const [selectedHour, setSelectedHour] = useState<number>(initialParsed.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initialParsed.min);
  const [selectedAmPm, setSelectedAmPm] = useState<"AM" | "PM">(initialParsed.ampm);

  // Calendar Weeks Calculation
  const calendarWeeks = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    setSelectedDate(d);
  };

  const handleConfirm = () => {
    // Format 24h string
    let h24 = selectedHour;
    if (selectedAmPm === "PM" && h24 < 12) h24 += 12;
    if (selectedAmPm === "AM" && h24 === 12) h24 = 0;
    const timeString = `${String(h24).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;

    const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    onConfirm({
      date: selectedDate,
      dateString,
      timeString,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Sheet Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>
                {title || (mode === "date" ? "Select Date" : "Select Time")}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {subtitle ||
                  (mode === "date"
                    ? "Choose calendar day"
                    : "Configure daily operating hours")}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Mode Tabs if "datetime" */}
          {mode === "datetime" && (
            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                style={[styles.modeTab, activeTab === "date" && styles.modeTabActive]}
                onPress={() => setActiveTab("date")}
              >
                <Icon
                  name="calendar"
                  size={16}
                  color={activeTab === "date" ? "#FFFFFF" : colors.navy}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeTab === "date" && styles.modeTabTextActive,
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, activeTab === "time" && styles.modeTabActive]}
                onPress={() => setActiveTab("time")}
              >
                <Icon
                  name="clock"
                  size={16}
                  color={activeTab === "time" ? "#FFFFFF" : colors.navy}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeTab === "time" && styles.modeTabTextActive,
                  ]}
                >
                  Time
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {/* ======================================================== */}
            {/* VIEW A: CALENDAR DATE PICKER */}
            {/* ======================================================== */}
            {(mode === "date" || (mode === "datetime" && activeTab === "date")) && (
              <View style={styles.calendarWrap}>
                {/* Month & Year Bar */}
                <View style={styles.monthNavRow}>
                  <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                    <Icon name="chevron" size={16} color={colors.navy} />
                  </TouchableOpacity>

                  <Text style={styles.monthTitle}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </Text>

                  <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
                    <Icon name="arrow" size={16} color={colors.navy} />
                  </TouchableOpacity>
                </View>

                {/* Day Header Row */}
                <View style={styles.weekDaysRow}>
                  {WEEK_DAYS.map((wd) => (
                    <Text key={wd} style={styles.weekDayHeader}>
                      {wd}
                    </Text>
                  ))}
                </View>

                {/* Calendar Days Matrix */}
                {calendarWeeks.map((week, wIdx) => (
                  <View key={wIdx} style={styles.calendarWeekRow}>
                    {week.map((day, dIdx) => {
                      if (!day) {
                        return <View key={dIdx} style={styles.dayCellEmpty} />;
                      }
                      const isSelected =
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === viewMonth &&
                        selectedDate.getFullYear() === viewYear;
                      const isToday =
                        today.getDate() === day &&
                        today.getMonth() === viewMonth &&
                        today.getFullYear() === viewYear;

                      return (
                        <TouchableOpacity
                          key={dIdx}
                          onPress={() => handleSelectDay(day)}
                          style={[
                            styles.dayCell,
                            isSelected && styles.dayCellSelected,
                            isToday && !isSelected && styles.dayCellToday,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.dayTextSelected,
                              isToday && !isSelected && styles.dayTextToday,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            {/* ======================================================== */}
            {/* VIEW B: CUSTOM TIME PICKER */}
            {/* ======================================================== */}
            {(mode === "time" || (mode === "datetime" && activeTab === "time")) && (
              <View style={styles.timeWrap}>
                {/* Quick Presets */}
                <Text style={styles.sectionLabel}>QUICK TIME PRESETS</Text>
                <View style={styles.presetPillsRow}>
                  {TIME_PRESETS.map((p) => {
                    const isCurrent =
                      selectedHour === p.hour &&
                      selectedMinute === p.min &&
                      selectedAmPm === p.ampm;
                    return (
                      <TouchableOpacity
                        key={p.label}
                        onPress={() => {
                          setSelectedHour(p.hour);
                          setSelectedMinute(p.min);
                          setSelectedAmPm(p.ampm as any);
                        }}
                        style={[
                          styles.presetPill,
                          isCurrent && styles.presetPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetPillText,
                            isCurrent && styles.presetPillTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Time Selector Wheels / Blocks */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  CUSTOM TIME
                </Text>
                <View style={styles.timeSelectorCard}>
                  {/* Hour Selector */}
                  <View style={styles.timeUnitCol}>
                    <Text style={styles.unitLabel}>HOUR</Text>
                    <View style={styles.unitRow}>
                      <TouchableOpacity
                        onPress={() => setSelectedHour((h) => (h === 1 ? 12 : h - 1))}
                        style={styles.timeStepBtn}
                      >
                        <Text style={styles.timeStepBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeDigitText}>
                        {String(selectedHour).padStart(2, "0")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setSelectedHour((h) => (h === 12 ? 1 : h + 1))}
                        style={styles.timeStepBtn}
                      >
                        <Text style={styles.timeStepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.timeColon}>:</Text>

                  {/* Minute Selector */}
                  <View style={styles.timeUnitCol}>
                    <Text style={styles.unitLabel}>MINUTE</Text>
                    <View style={styles.unitRow}>
                      <TouchableOpacity
                        onPress={() =>
                          setSelectedMinute((m) => (m === 0 ? 55 : (m - 5 + 60) % 60))
                        }
                        style={styles.timeStepBtn}
                      >
                        <Text style={styles.timeStepBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeDigitText}>
                        {String(selectedMinute).padStart(2, "0")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setSelectedMinute((m) => (m + 5) % 60)}
                        style={styles.timeStepBtn}
                      >
                        <Text style={styles.timeStepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* AM/PM Switcher */}
                  <View style={styles.ampmCol}>
                    <TouchableOpacity
                      onPress={() => setSelectedAmPm("AM")}
                      style={[
                        styles.ampmBtn,
                        selectedAmPm === "AM" && styles.ampmBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ampmBtnText,
                          selectedAmPm === "AM" && styles.ampmBtnTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedAmPm("PM")}
                      style={[
                        styles.ampmBtn,
                        selectedAmPm === "PM" && styles.ampmBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ampmBtnText,
                          selectedAmPm === "PM" && styles.ampmBtnTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Pinned Confirm Action */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Text style={styles.confirmBtnText}>Confirm Selection</Text>
              <Icon name="check" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    ...shadows.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: colors.navy,
  },
  modeTabText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.navy,
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  calendarWrap: {
    paddingBottom: 8,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontFamily: fonts.extra,
    fontSize: 15,
    color: colors.navy,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekDayHeader: {
    width: (SCREEN_WIDTH - 48) / 7,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#94A3B8",
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dayCell: {
    width: (SCREEN_WIDTH - 48) / 7,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellEmpty: {
    width: (SCREEN_WIDTH - 48) / 7,
    height: 38,
  },
  dayCellSelected: {
    backgroundColor: colors.orange,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.navy,
    backgroundColor: "#F1F5F9",
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
  },
  dayTextToday: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  timeWrap: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: "#64748B",
    marginBottom: 8,
  },
  presetPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  presetPillText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.navy,
  },
  presetPillTextActive: {
    color: "#FFFFFF",
  },
  timeSelectorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 16,
  },
  timeUnitCol: {
    alignItems: "center",
    gap: 6,
  },
  unitLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: "#94A3B8",
  },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  timeStepBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  timeDigitText: {
    fontFamily: fonts.extra,
    fontSize: 26,
    color: colors.navy,
    minWidth: 36,
    textAlign: "center",
  },
  timeColon: {
    fontFamily: fonts.extra,
    fontSize: 26,
    color: colors.navy,
    marginBottom: -16,
  },
  ampmCol: {
    gap: 4,
    marginLeft: 8,
  },
  ampmBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ampmBtnActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  ampmBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#64748B",
  },
  ampmBtnTextActive: {
    color: "#FFFFFF",
  },
  bottomBar: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.orange,
    gap: 10,
    ...shadows.sm,
  },
  confirmBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
});
