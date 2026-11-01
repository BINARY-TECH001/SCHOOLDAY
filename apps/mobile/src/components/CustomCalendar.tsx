import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Icon } from "./Icon";
import { CalendarEvent } from "../domain/model";

export interface CustomCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events?: CalendarEvent[];
  viewYear?: number;
  viewMonth?: number;
  onChangeMonth?: (year: number, month: number) => void;
  compact?: boolean;
}

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

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function CustomCalendar({
  selectedDate,
  onSelectDate,
  events = [],
  viewYear: controlledYear,
  viewMonth: controlledMonth,
  onChangeMonth,
  compact = false,
}: CustomCalendarProps) {
  const [internalYear, setInternalYear] = React.useState<number>(
    selectedDate.getFullYear(),
  );
  const [internalMonth, setInternalMonth] = React.useState<number>(
    selectedDate.getMonth(),
  );

  const viewYear = controlledYear ?? internalYear;
  const viewMonth = controlledMonth ?? internalMonth;

  const handlePrevMonth = () => {
    let nextY = viewYear;
    let nextM = viewMonth - 1;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    }
    if (onChangeMonth) {
      onChangeMonth(nextY, nextM);
    } else {
      setInternalYear(nextY);
      setInternalMonth(nextM);
    }
  };

  const handleNextMonth = () => {
    let nextY = viewYear;
    let nextM = viewMonth + 1;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    if (onChangeMonth) {
      onChangeMonth(nextY, nextM);
    } else {
      setInternalYear(nextY);
      setInternalMonth(nextM);
    }
  };

  // Build 7-day grid matrix
  const calendarWeeks = useMemo(() => {
    const today = new Date();
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1; // 0=Mon, 6=Sun
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDays = lastDay.getDate();
    const days: Array<{
      dayNumber: number | null;
      date: Date | null;
      isToday: boolean;
      isSelected: boolean;
      eventsOnDay: CalendarEvent[];
    }> = [];

    // Leading empty slots
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        dayNumber: null,
        date: null,
        isToday: false,
        isSelected: false,
        eventsOnDay: [],
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();

      // Check events on this day
      const dateIso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const eventsOnDay = events.filter((e) => {
        if (e.date === dateIso) return true;
        if (e.endDate && e.date <= dateIso && e.endDate >= dateIso) return true;
        return false;
      });

      days.push({
        dayNumber: d,
        date,
        isToday,
        isSelected,
        eventsOnDay,
      });
    }

    // Trailing empty slots to make complete 7-day weeks
    const remainder = days.length % 7;
    if (remainder !== 0) {
      const trailing = 7 - remainder;
      for (let i = 0; i < trailing; i++) {
        days.push({
          dayNumber: null,
          date: null,
          isToday: false,
          isSelected: false,
          eventsOnDay: [],
        });
      }
    }

    // Chunk into 7-day rows
    const weeks: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [viewYear, viewMonth, selectedDate, events]);

  const getEventDotColor = (type: string) => {
    switch (type) {
      case "term":
        return "#0284c7";
      case "holiday":
        return "#10b981";
      case "exam":
        return "#8b5cf6";
      case "break":
        return "#f59e0b";
      default:
        return "#ea580c";
    }
  };

  return (
    <View style={styles.calendarContainer}>
      {/* Month & Year Navigation Header */}
      <View style={styles.monthHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={handlePrevMonth}
          style={styles.navChevronBtn}
          hitSlop={10}
        >
          <Icon name="back" size={17} color={colors.navy} />
        </Pressable>

        <Text style={styles.monthTitleText}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={handleNextMonth}
          style={styles.navChevronBtn}
          hitSlop={10}
        >
          <Icon name="arrow" size={17} color={colors.navy} />
        </Pressable>
      </View>

      {/* Weekday Labels Row */}
      <View style={styles.weekDaysRow}>
        {WEEK_DAYS.map((day) => (
          <Text key={day} style={styles.weekDayLabel}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar 7-Day Weeks Grid */}
      <View style={{ gap: compact ? 4 : 8 }}>
        {calendarWeeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((slot, dayIndex) => {
              if (slot.dayNumber === null || !slot.date) {
                return (
                  <View
                    key={`slot-${dayIndex}`}
                    style={[styles.daySlot, compact && styles.daySlotCompact]}
                  />
                );
              }

              return (
                <Pressable
                  key={`day-${slot.dayNumber}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${slot.date.toLocaleDateString()}`}
                  onPress={() => onSelectDate(slot.date!)}
                  style={[
                    styles.daySlot,
                    compact && styles.daySlotCompact,
                    slot.isToday && styles.daySlotToday,
                    slot.isSelected && styles.daySlotSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      compact && styles.dayNumberTextCompact,
                      slot.isToday && styles.dayNumberToday,
                      slot.isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    {slot.dayNumber}
                  </Text>

                  {/* Event indicators */}
                  {slot.eventsOnDay.length > 0 && (
                    <View style={styles.eventDotsRow}>
                      {slot.eventsOnDay.slice(0, 3).map((ev, i) => (
                        <View
                          key={i}
                          style={[
                            styles.eventDot,
                            {
                              backgroundColor: slot.isSelected
                                ? "#ffffff"
                                : getEventDotColor(ev.type),
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  navChevronBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  monthTitleText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingBottom: 8,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  daySlot: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    position: "relative",
  },
  daySlotCompact: {
    height: 36,
    borderRadius: 10,
  },
  daySlotToday: {
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  daySlotSelected: {
    backgroundColor: colors.navy,
  },
  dayNumberText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  dayNumberTextCompact: {
    fontSize: 13,
  },
  dayNumberToday: {
    color: colors.orange,
    fontFamily: fonts.bold,
  },
  dayNumberSelected: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  eventDotsRow: {
    position: "absolute",
    bottom: 3,
    flexDirection: "row",
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
