import React, { useState, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  ModalSheet,
  Txt,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { CustomCalendar } from "../components/CustomCalendar";
import { CalendarEvent } from "../domain/model";
import { useSchool } from "../providers/AppProvider";

import { DatePickerModal } from "../components/pickers/DatePickerModal";

function formatDisplayDate(iso: string) {
  if (!iso) return "Select date";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CalendarScreen() {
  const { data, context, services, act, busy } = useSchool();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 9, 24)); // Default to Oct 2026
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [addModal, setAddModal] = useState(false);
  const [activePicker, setActivePicker] = useState<"add" | "editStart" | "editEnd" | null>(null);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("event");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDateStr, setEventDateStr] = useState(
    selectedDate.toISOString().slice(0, 10),
  );

  const isOwner = context.role === "owner" || context.role === "admin";
  const calendarEvents = data.calendar || [];

  const selectedDateStr = selectedDate.toISOString().slice(0, 10);

  // Chronological timeline grouping
  const timelineMonths = useMemo(() => {
    const sorted = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date));
    const groups: { monthKey: string; monthTitle: string; events: CalendarEvent[] }[] = [];
    const map = new Map<string, CalendarEvent[]>();

    for (const ev of sorted) {
      if (activeCategory !== "all" && ev.type !== activeCategory) continue;
      const d = new Date(ev.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const list = map.get(monthKey) || [];
      list.push(ev);
      map.set(monthKey, list);
    }

    map.forEach((events, monthKey) => {
      const [y, m] = monthKey.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      const monthTitle = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      groups.push({ monthKey, monthTitle, events });
    });

    return groups;
  }, [calendarEvents, activeCategory]);

  // Events on the selected day
  const eventsOnSelectedDay = useMemo(() => {
    return calendarEvents.filter((ev) => {
      const matchCategory =
        activeCategory === "all" || ev.type === activeCategory;
      if (!matchCategory) return false;

      if (ev.endDate) {
        return selectedDateStr >= ev.date && selectedDateStr <= ev.endDate;
      }
      return ev.date === selectedDateStr;
    });
  }, [calendarEvents, selectedDateStr, activeCategory]);

  // Upcoming events in current month
  const monthEvents = useMemo(() => {
    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();
    return calendarEvents.filter((ev) => {
      const evDate = new Date(ev.date);
      return (
        evDate.getFullYear() === selYear && evDate.getMonth() === selMonth
      );
    });
  }, [calendarEvents, selectedDate]);

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      alert("Please provide an event title.");
      return;
    }

    await act(
      () =>
        services.populateCalendar(context, [
          {
            title: eventTitle.trim(),
            date: eventDateStr || selectedDateStr,
            type: eventType,
            description: eventDescription.trim() || undefined,
          },
        ]),
      `Added "${eventTitle.trim()}" to the official school calendar!`,
    );

    setEventTitle("");
    setEventDescription("");
    setAddModal(false);
  };

  const formattedSelectedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const getToneForType = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "term":
        return "purple";
      case "holiday":
        return "success";
      case "exam":
        return "warning";
      case "break":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getIconForType = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "term":
        return "school";
      case "holiday":
        return "flash";
      case "exam":
        return "document";
      case "break":
        return "clock";
      default:
        return "calendar";
    }
  };

  // Edit Event State
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<CalendarEvent["type"]>("event");
  const [editDate, setEditDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleOpenEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditType(ev.type);
    setEditDate(ev.date);
    setEditEndDate(ev.endDate || "");
    setEditDescription(ev.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !editTitle.trim()) {
      alert("Please enter an activity title.");
      return;
    }

    await act(
      () =>
        services.updateCalendarEvent(context, editingEvent.id, {
          title: editTitle.trim(),
          date: editDate || editingEvent.date,
          endDate: editEndDate.trim() ? editEndDate.trim() : undefined,
          type: editType,
          description: editDescription.trim() || undefined,
        }),
      `Updated "${editTitle.trim()}" in calendar!`,
    );

    setEditingEvent(null);
  };

  const handleDeleteEvent = async (ev: CalendarEvent) => {
    await act(
      () => services.deleteCalendarEvent(context, ev.id),
      `Cancelled & removed "${ev.title}" from calendar.`,
    );
  };

  const handleBroadcastEvent = async (ev: CalendarEvent) => {
    await act(
      () =>
        services.postNotice(context, {
          title: `Academic Notice: ${ev.title}`,
          body: `${ev.description || ev.title}. Scheduled date: ${ev.date}${ev.endDate ? ` through ${ev.endDate}` : ""}.`,
          target: "home",
        }),
      `Broadcasted "${ev.title}" to campus notices & circulars!`,
    );
  };

  const handleSetReminder = (ev: CalendarEvent) => {
    alert(`Reminder confirmed for "${ev.title}". You will be notified before this date.`);
  };

  return (
    <View style={styles.root}>
      {/* Reusable Clean TopBar Touching Status Bar */}
      <TopBar
        title="Academic Calendar"
        onBack={() => router.back()}
        rightAction={
          isOwner ? (
            <Pressable
              onPress={() => router.push("/create-event" as any)}
              style={styles.addEventTopBtn}
              hitSlop={8}
            >
              <Icon name="add" size={16} color="#ffffff" filled />
              <Text style={styles.addEventTopBtnText}>Add Event</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* View Mode Switcher: Month Grid vs Chronological Timeline */}
      <View style={styles.viewModeWrap}>
        <View style={styles.viewModeSegment}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Month Grid View"
            onPress={() => setViewMode("grid")}
            style={[
              styles.viewModeBtn,
              viewMode === "grid" && styles.viewModeBtnActive,
            ]}
          >
            <Icon
              name="calendar"
              size={15}
              color={viewMode === "grid" ? colors.navy : colors.muted}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                viewMode === "grid" && styles.viewModeBtnTextActive,
              ]}
            >
              Month Grid
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chronological Timeline View"
            onPress={() => setViewMode("timeline")}
            style={[
              styles.viewModeBtn,
              viewMode === "timeline" && styles.viewModeBtnActive,
            ]}
          >
            <Icon
              name="clock"
              size={15}
              color={viewMode === "timeline" ? colors.navy : colors.muted}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                viewMode === "timeline" && styles.viewModeBtnTextActive,
              ]}
            >
              Chronological Timeline
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: "all", label: "All Activities" },
            { key: "term", label: "Term Dates" },
            { key: "exam", label: "Exams" },
            { key: "holiday", label: "Holidays" },
            { key: "break", label: "Breaks" },
            { key: "event", label: "Events" },
          ].map((cat) => (
            <Pressable
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              style={[
                styles.categoryChip,
                activeCategory === cat.key && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  activeCategory === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {viewMode === "grid" ? (
          <>
            {/* Interactive Custom Month Calendar Card */}
            <Card style={[styles.calendarCard, shadows.sm]}>
              <CustomCalendar
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setEventDateStr(d.toISOString().slice(0, 10));
                }}
                events={calendarEvents}
              />
            </Card>

            {/* Selected Date Header */}
            <View style={styles.dateHeaderRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.selectedDateTitle}>{formattedSelectedDate}</Text>
                <Text style={styles.selectedDateSub}>
                  {eventsOnSelectedDay.length} scheduled{" "}
                  {eventsOnSelectedDay.length === 1 ? "activity" : "activities"} on
                  this date
                </Text>
              </View>
            </View>

            {/* Activities List for Selected Day */}
            <View style={styles.eventsContainer}>
              {eventsOnSelectedDay.length > 0 ? (
                eventsOnSelectedDay.map((ev) => (
                  <View key={ev.id} style={[styles.eventCard, shadows.sm]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                      <View
                        style={[
                          styles.eventTypeIconTile,
                          {
                            backgroundColor:
                              ev.type === "term"
                                ? colors.purpleLight
                                : ev.type === "holiday"
                                  ? colors.greenLight
                                  : ev.type === "exam"
                                    ? colors.orangeLight
                                    : colors.surfaceSubtle,
                          },
                        ]}
                      >
                        <Icon
                          name={getIconForType(ev.type)}
                          size={20}
                          color={
                            ev.type === "term"
                              ? colors.purpleText
                              : ev.type === "holiday"
                                ? colors.greenDark
                                : ev.type === "exam"
                                  ? colors.orange
                                  : colors.navy
                          }
                        />
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={styles.eventTitleRow}>
                          <Text style={styles.eventTitle} numberOfLines={2}>
                            {ev.title}
                          </Text>
                          <Badge text={ev.type.toUpperCase()} tone={getToneForType(ev.type)} />
                        </View>

                        {ev.description ? (
                          <Text style={styles.eventDesc}>{ev.description}</Text>
                        ) : null}

                        <View style={styles.eventMetaRow}>
                          <Icon name="clock" size={12} color={colors.muted} />
                          <Text style={styles.eventDateText}>
                            {ev.date}
                            {ev.endDate ? ` – ${ev.endDate}` : ""}
                          </Text>
                          {ev.source ? (
                            <Text style={styles.eventSourceText}>· {ev.source}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* Event Action CTAs */}
                    <View style={styles.eventActionsRow}>
                      {isOwner && (
                        <Pressable
                          onPress={() => handleOpenEdit(ev)}
                          style={styles.eventActionBtn}
                          hitSlop={6}
                        >
                          <Icon name="edit" size={13} color={colors.navy} />
                          <Text style={styles.eventActionBtnText}>Edit</Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => handleBroadcastEvent(ev)}
                        style={styles.eventActionBtn}
                        hitSlop={6}
                      >
                        <Icon name="share" size={13} color={colors.navy} />
                        <Text style={styles.eventActionBtnText}>Broadcast</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleSetReminder(ev)}
                        style={styles.eventActionBtn}
                        hitSlop={6}
                      >
                        <Icon name="notification" size={13} color={colors.navy} />
                        <Text style={styles.eventActionBtnText}>Remind</Text>
                      </Pressable>

                      {isOwner && (
                        <Pressable
                          onPress={() => handleDeleteEvent(ev)}
                          style={[styles.eventActionBtn, styles.eventActionBtnDanger]}
                          hitSlop={6}
                        >
                          <Icon name="trash" size={13} color={colors.red} />
                          <Text style={[styles.eventActionBtnText, { color: colors.red }]}>
                            Cancel
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noDayEventsBox}>
                  <Empty
                    title="No activities on this day"
                    detail="Click another day with an indicator dot or check upcoming events below."
                    icon="calendar"
                  />
                </View>
              )}
            </View>

            {/* Other Notable Events in Selected Month */}
            {monthEvents.length > 0 && (
              <View style={styles.monthSection}>
                <Text style={styles.monthSectionTitle}>
                  All Scheduled Events in this Month ({monthEvents.length})
                </Text>

                <View style={{ gap: 10 }}>
                  {monthEvents.map((ev) => (
                    <View
                      key={ev.id}
                      style={[styles.monthEventRow, shadows.sm]}
                    >
                      <Pressable
                        onPress={() => setSelectedDate(new Date(ev.date))}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
                      >
                        <View style={styles.monthEventDateBadge}>
                          <Text style={styles.monthEventDayNumber}>
                            {new Date(ev.date).getDate()}
                          </Text>
                          <Text style={styles.monthEventMonthText}>
                            {new Date(ev.date).toLocaleString("en-US", { month: "short" })}
                          </Text>
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.monthEventTitle}>{ev.title}</Text>
                          <Text style={styles.monthEventSub}>
                            {ev.date}
                            {ev.endDate ? ` to ${ev.endDate}` : ""}
                          </Text>
                        </View>

                        <Badge text={ev.type.toUpperCase()} tone={getToneForType(ev.type)} />
                      </Pressable>

                      {isOwner && (
                        <Pressable
                          onPress={() => handleOpenEdit(ev)}
                          style={styles.monthEditIconBtn}
                          hitSlop={8}
                        >
                          <Icon name="edit" size={14} color={colors.navy} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          /* TIMELINE VIEW: Chronological stream across academic year */
          <View style={styles.timelineWrap}>
            {timelineMonths.length === 0 ? (
              <Card style={styles.noDayEventsBox}>
                <Empty
                  title="No timeline events"
                  detail="There are no academic milestones matching the selected category."
                  icon="calendar"
                />
              </Card>
            ) : (
              timelineMonths.map((group) => (
                <View key={group.monthKey} style={styles.timelineMonthGroup}>
                  <View style={styles.timelineMonthHeaderRow}>
                    <View style={styles.timelineMonthDot} />
                    <Text style={styles.timelineMonthHeaderTitle}>
                      {group.monthTitle.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.timelineEventsList}>
                    {group.events.map((ev, index) => {
                      const isLast = index === group.events.length - 1;
                      return (
                        <View key={ev.id} style={styles.timelineItemRow}>
                          {/* Timeline spine with connector */}
                          <View style={styles.timelineSpine}>
                            <View style={[styles.timelineBullet, { borderColor: colors.navy }]}>
                              <View style={styles.timelineBulletInner} />
                            </View>
                            {!isLast && <View style={styles.timelineConnector} />}
                          </View>

                          {/* Milestone Event Card */}
                          <Card style={styles.timelineMilestoneCard}>
                            <View style={styles.milestoneTopRow}>
                              <Text style={styles.milestoneDateText}>
                                {formatDisplayDate(ev.date)}
                                {ev.endDate ? ` – ${formatDisplayDate(ev.endDate)}` : ""}
                              </Text>
                              <Badge
                                text={ev.type.toUpperCase()}
                                tone={getToneForType(ev.type)}
                              />
                            </View>

                            <Text style={styles.milestoneTitle}>{ev.title}</Text>
                            {ev.description ? (
                              <Text style={styles.milestoneDesc}>{ev.description}</Text>
                            ) : null}

                            {ev.source && (
                              <Text style={styles.milestoneSource}>
                                Authority: {ev.source}
                              </Text>
                            )}

                            <View style={styles.milestoneActionsRow}>
                              <Pressable
                                onPress={() => handleBroadcastEvent(ev)}
                                style={styles.milestoneBtn}
                              >
                                <Icon name="share" size={13} color={colors.navy} />
                                <Text style={styles.milestoneBtnText}>Broadcast</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => handleSetReminder(ev)}
                                style={styles.milestoneBtn}
                              >
                                <Icon name="notification" size={13} color={colors.navy} />
                                <Text style={styles.milestoneBtnText}>Remind</Text>
                              </Pressable>

                              {isOwner && (
                                <Pressable
                                  onPress={() => handleOpenEdit(ev)}
                                  style={styles.milestoneBtn}
                                >
                                  <Icon name="edit" size={13} color={colors.navy} />
                                  <Text style={styles.milestoneBtnText}>Edit</Text>
                                </Pressable>
                              )}
                            </View>
                          </Card>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: Add New Calendar Event */}
      <ModalSheet
        visible={addModal}
        onClose={() => setAddModal(false)}
        title="New Calendar Activity"
        subtitle="Schedule terms, exams, holidays or campus events."
      >
        <Field
          label="Activity Title *"
          placeholder="e.g. Mid-Term Assessment Week"
          value={eventTitle}
          onChangeText={setEventTitle}
          icon="document"
        />

        {/* Date Selection via DatePickerModal */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select activity date"
          onPress={() => setActivePicker("add")}
          style={styles.dateSelectorBox}
        >
          <Text style={styles.dateSelectorLabel}>ACTIVITY DATE *</Text>
          <View style={styles.dateSelectorValueRow}>
            <Icon name="calendar" size={16} color={colors.navy} />
            <Text style={styles.dateSelectorValue}>
              {formatDisplayDate(eventDateStr)}
            </Text>
          </View>
        </Pressable>

        {/* Event Type Picker */}
        <View style={{ gap: 8 }}>
          <Txt tone="label">Activity Category</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["term", "exam", "holiday", "break", "event"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setEventType(t)}
                style={[
                  styles.eventTypePickChip,
                  eventType === t && styles.eventTypePickChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.eventTypePickChipText,
                    eventType === t && styles.eventTypePickChipTextActive,
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Field
          label="Details / Notes (Optional)"
          placeholder="e.g. Uniform examination across all junior and senior arms"
          value={eventDescription}
          onChangeText={setEventDescription}
        />

        <Button
          title="Save to Academic Calendar"
          size="lg"
          variant="primary"
          icon="check"
          disabled={busy}
          loading={busy}
          onPress={handleAddEvent}
        />
      </ModalSheet>

      {/* Modal: Edit Existing Calendar Event (Proprietor Management) */}
      <ModalSheet
        visible={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Edit Scheduled Activity"
        subtitle="Update timeline, category, or event details."
      >
        <Field
          label="Activity Title *"
          placeholder="e.g. Mid-Term Assessment Week"
          value={editTitle}
          onChangeText={setEditTitle}
          icon="document"
        />

        {/* Start Date & End Date via DatePickerModal */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select start date"
            onPress={() => setActivePicker("editStart")}
            style={styles.dateSelectorBox}
          >
            <Text style={styles.dateSelectorLabel}>START DATE *</Text>
            <View style={styles.dateSelectorValueRow}>
              <Icon name="calendar" size={16} color={colors.navy} />
              <Text style={styles.dateSelectorValue}>
                {formatDisplayDate(editDate)}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select end date"
            onPress={() => setActivePicker("editEnd")}
            style={styles.dateSelectorBox}
          >
            <Text style={styles.dateSelectorLabel}>END DATE (OPTIONAL)</Text>
            <View style={styles.dateSelectorValueRow}>
              <Icon name="calendar" size={16} color={colors.navy} />
              <Text
                style={[
                  styles.dateSelectorValue,
                  !editEndDate && { color: colors.muted },
                ]}
              >
                {editEndDate ? formatDisplayDate(editEndDate) : "None"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Event Type Picker */}
        <View style={{ gap: 8 }}>
          <Txt tone="label">Category</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["term", "exam", "holiday", "break", "event"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setEditType(t)}
                style={[
                  styles.eventTypePickChip,
                  editType === t && styles.eventTypePickChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.eventTypePickChipText,
                    editType === t && styles.eventTypePickChipTextActive,
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Field
          label="Activity Details / Instructions"
          placeholder="Details for students, parents and staff"
          value={editDescription}
          onChangeText={setEditDescription}
        />

        <View style={{ gap: 10, marginTop: 4 }}>
          <Button
            title="Save Changes"
            size="lg"
            variant="primary"
            icon="check"
            disabled={busy}
            loading={busy}
            onPress={handleSaveEdit}
          />
          <Button
            title="Cancel"
            size="md"
            variant="ghost"
            onPress={() => setEditingEvent(null)}
          />
        </View>
      </ModalSheet>

      {/* DatePickerModal Instance */}
      <DatePickerModal
        visible={activePicker !== null}
        onClose={() => setActivePicker(null)}
        selectedDate={
          activePicker === "add"
            ? eventDateStr
            : activePicker === "editStart"
            ? editDate
            : editEndDate || editDate
        }
        title={
          activePicker === "add"
            ? "Select Event Date"
            : activePicker === "editStart"
            ? "Select Start Date"
            : "Select End Date"
        }
        onSelectDate={(iso) => {
          if (activePicker === "add") {
            setEventDateStr(iso);
          } else if (activePicker === "editStart") {
            setEditDate(iso);
          } else if (activePicker === "editEnd") {
            setEditEndDate(iso);
          }
          setActivePicker(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  addEventTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addEventTopBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  calendarCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedDateTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
  selectedDateSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  categoryChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  eventsContainer: {
    gap: 10,
  },
  eventCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  eventActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    marginTop: 2,
  },
  eventActionBtn: {
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
  eventActionBtnDanger: {
    backgroundColor: "#fef2f2",
    borderColor: "#fee2e2",
    marginLeft: "auto",
  },
  eventActionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  monthEditIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTypeIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    flex: 1,
    marginRight: 8,
  },
  eventDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  eventDateText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  eventSourceText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.faint,
  },
  noDayEventsBox: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  monthSection: {
    gap: 10,
    marginTop: 8,
  },
  monthSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    letterSpacing: 0.2,
  },
  monthEventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  monthEventDateBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  monthEventDayNumber: {
    fontFamily: fonts.extra,
    fontSize: 15,
    color: colors.navy,
  },
  monthEventMonthText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.orange,
    textTransform: "uppercase",
  },
  monthEventTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  monthEventSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  eventTypePickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  eventTypePickChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  eventTypePickChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
  },
  eventTypePickChipTextActive: {
    color: "#ffffff",
  },
  viewModeWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.bg,
  },
  viewModeSegment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  viewModeBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  viewModeBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  viewModeBtnTextActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  dateSelectorBox: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  dateSelectorLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.6,
  },
  dateSelectorValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateSelectorValue: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.navy,
  },
  timelineWrap: {
    gap: 20,
    paddingBottom: 24,
  },
  timelineMonthGroup: {
    gap: 12,
  },
  timelineMonthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 4,
  },
  timelineMonthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  timelineMonthHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
    letterSpacing: 0.8,
  },
  timelineEventsList: {
    gap: 0,
  },
  timelineItemRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  timelineSpine: {
    width: 20,
    alignItems: "center",
  },
  timelineBullet: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  timelineBulletInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
  },
  timelineMilestoneCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  milestoneTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  milestoneDateText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.indigo,
  },
  milestoneTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  milestoneDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  milestoneSource: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.faint,
  },
  milestoneActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    marginTop: 2,
  },
  milestoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  milestoneBtnText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.navy,
  },
});
