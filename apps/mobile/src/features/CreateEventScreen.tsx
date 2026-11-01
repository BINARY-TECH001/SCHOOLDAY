import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
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
import { CustomCalendar } from "../components/CustomCalendar";
import { CustomDateTimePickerSheet } from "../components/CustomDateTimePickerSheet";
import { CalendarEvent } from "../domain/model";
import { useSchool } from "../providers/AppProvider";

export function CreateEventScreen() {
  const { context, services, act, busy } = useSchool();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Event Basics
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("term");
  const [eventDescription, setEventDescription] = useState("");

  // Step 2: Date & Schedule
  const [startDate, setStartDate] = useState<Date>(new Date(2026, 9, 24));
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState<Date>(new Date(2026, 9, 28));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("Full Day Event");
  const [pickerSheetOpen, setPickerSheetOpen] = useState(false);

  // Step 3: Audience & Broadcast
  const [targetAudience, setTargetAudience] = useState<"all" | "teachers" | "parents" | "admin">("all");
  const [broadcastNotification, setBroadcastNotification] = useState(true);

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const handleFinish = async () => {
    if (!eventTitle.trim()) {
      alert("Please provide an event title.");
      setStep(1);
      return;
    }

    await act(
      () =>
        services.populateCalendar(context, [
          {
            title: eventTitle.trim(),
            date: startDateStr,
            endDate: isMultiDay ? endDateStr : undefined,
            type: eventType,
            description: eventDescription.trim() || undefined,
            source: "School Administrator Portal",
          },
        ]),
      `Event "${eventTitle.trim()}" published to the official school calendar!`,
    );

    if (broadcastNotification) {
      await act(
        () =>
          services.postNotice(context, {
            title: `[Calendar Alert] ${eventTitle.trim()}`,
            body: `${eventTitle.trim()} has been scheduled for ${startDateStr}${
              isMultiDay ? ` through ${endDateStr}` : ""
            }. ${eventDescription.trim()}`,
            target: "home",
          }),
        "",
      );
    }

    router.back();
  };

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      {/* Reusable Clean TopBar */}
      <TopBar
        title="Schedule Academic Event"
        subtitle={`Step ${step} of 4 · ${
          step === 1
            ? "Event Details"
            : step === 2
              ? "Date & Time"
              : step === 3
                ? "Target Audience"
                : "Review & Publish"
        }`}
        onBack={() => {
          if (step > 1) {
            setStep((s) => (s - 1) as any);
          } else {
            router.back();
          }
        }}
      />

      {/* Progress Bar */}
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
        {/* STEP 1: EVENT DETAILS */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Event Information</Text>
            <Text style={styles.stepSub}>
              Define the activity type, title, and institutional notes.
            </Text>

            <Field
              label="Activity Title *"
              placeholder="e.g. First Term Unified Examinations"
              value={eventTitle}
              onChangeText={setEventTitle}
              icon="calendar"
            />

            {/* Event Category Chips */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Activity Category</Txt>
              <View style={styles.chipsWrap}>
                {[
                  { key: "term", label: "Term Resumption / Vacation", tone: "purple" },
                  { key: "exam", label: "Unified Examination", tone: "warning" },
                  { key: "holiday", label: "Public Holiday", tone: "success" },
                  { key: "break", label: "Mid-Term Break", tone: "neutral" },
                  { key: "event", label: "Campus Event / PTA", tone: "neutral" },
                ].map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setEventType(cat.key as any)}
                    style={[
                      styles.categoryChoiceChip,
                      eventType === cat.key && styles.categoryChoiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChoiceChipText,
                        eventType === cat.key && styles.categoryChoiceChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Field
              label="Description / Circular Notes (Optional)"
              placeholder="Provide context, required materials, or ministry circular details…"
              value={eventDescription}
              onChangeText={setEventDescription}
            />
          </View>
        )}

        {/* STEP 2: DATE & TIME SELECTION */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Calendar Date & Schedule</Text>
            <Text style={styles.stepSub}>
              Choose the start date, duration, and time slot.
            </Text>

            {/* Selected Date Summary Card */}
            <Card style={[styles.datePreviewCard, shadows.sm]}>
              <View style={{ gap: 2 }}>
                <Text style={styles.datePreviewLabel}>SCHEDULED TIMEFRAME</Text>
                <Text style={styles.datePreviewVal}>
                  {startDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {isMultiDay &&
                    ` → ${endDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}`}
                </Text>
                <Text style={styles.datePreviewTime}>{selectedTimeSlot}</Text>
              </View>
              <Pressable
                onPress={() => setPickerSheetOpen(true)}
                style={styles.changePresetBtn}
              >
                <Icon name="clock" size={14} color={colors.orange} />
                <Text style={styles.changePresetBtnText}>Presets</Text>
              </Pressable>
            </Card>

            {/* Interactive Custom Month Calendar */}
            <Card style={[styles.calendarCard, shadows.sm]}>
              <CustomCalendar
                selectedDate={startDate}
                onSelectDate={(d) => setStartDate(d)}
              />
            </Card>

            {/* Multi-Day Switch */}
            <View style={styles.multiDayRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.multiDayLabel}>Multi-Day Event / Span</Text>
                <Text style={styles.multiDaySub}>
                  Toggle on for examinations, mid-term breaks or term stretches
                </Text>
              </View>
              <Switch
                value={isMultiDay}
                onValueChange={setIsMultiDay}
                trackColor={{ false: "#e2e8f0", true: colors.indigo }}
              />
            </View>

            {/* Time Slot Presets */}
            <View style={{ gap: 8 }}>
              <Txt tone="label">Time Schedule</Txt>
              <View style={styles.chipsWrap}>
                {[
                  "Full Day Event",
                  "08:00 AM - 12:00 PM",
                  "09:00 AM - 01:00 PM",
                  "02:00 PM - 04:00 PM",
                ].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setSelectedTimeSlot(t)}
                    style={[
                      styles.categoryChoiceChip,
                      selectedTimeSlot === t && styles.categoryChoiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChoiceChipText,
                        selectedTimeSlot === t && styles.categoryChoiceChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: AUDIENCE & BROADCAST */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Target Audience</Text>
            <Text style={styles.stepSub}>
              Specify who this calendar activity is intended for.
            </Text>

            {/* Audience Options */}
            <View style={{ gap: 10 }}>
              {[
                {
                  key: "all",
                  title: "Whole School Campus",
                  desc: "Parents, Students, Teachers & Administration",
                  icon: "school",
                },
                {
                  key: "teachers",
                  title: "Academic Faculty & Teachers Only",
                  desc: "Restricted to instructors and classroom staff",
                  icon: "profile",
                },
                {
                  key: "parents",
                  title: "Guardians & Parents",
                  desc: "PTA meetings, fee deadlines & term holidays",
                  icon: "people",
                },
                {
                  key: "admin",
                  title: "Administrative Staff",
                  desc: "Internal planning and inspection schedules",
                  icon: "verify",
                },
              ].map((aud) => {
                const isSelected = targetAudience === aud.key;
                return (
                  <Pressable
                    key={aud.key}
                    onPress={() => setTargetAudience(aud.key as any)}
                    style={[
                      styles.audienceCard,
                      isSelected && styles.audienceCardActive,
                      shadows.sm,
                    ]}
                  >
                    <View style={styles.audienceIconTile}>
                      <Icon
                        name={aud.icon as any}
                        size={20}
                        color={isSelected ? colors.indigo : colors.muted}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.audienceTitle}>{aud.title}</Text>
                      <Text style={styles.audienceDesc}>{aud.desc}</Text>
                    </View>
                    {isSelected && (
                      <Icon name="check" size={18} color={colors.indigo} filled />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Broadcast Notice Switch */}
            <Card style={styles.broadcastBox}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.broadcastTitle}>Dispatch Broadcast Notification</Text>
                <Text style={styles.broadcastSub}>
                  Publish this event simultaneously as a high-priority school announcement.
                </Text>
              </View>
              <Switch
                value={broadcastNotification}
                onValueChange={setBroadcastNotification}
                trackColor={{ false: "#e2e8f0", true: colors.orange }}
              />
            </Card>
          </View>
        )}

        {/* STEP 4: REVIEW & PUBLISH */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review & Publish</Text>
            <Text style={styles.stepSub}>
              Confirm event parameters before publishing to the institutional school calendar.
            </Text>

            <Card style={[styles.reviewCard, shadows.md]}>
              <View style={styles.reviewHeader}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={styles.reviewTitle}>{eventTitle}</Text>
                  <Text style={styles.reviewSub}>
                    Source: School Administrator Portal
                  </Text>
                </View>
                <Badge
                  text={eventType.toUpperCase()}
                  tone={getToneForType(eventType)}
                />
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>DATE & DURATION</Text>
                <Text style={styles.reviewVal}>
                  {startDateStr}
                  {isMultiDay ? ` through ${endDateStr}` : ""}
                </Text>
                <Text style={styles.reviewValSub}>{selectedTimeSlot}</Text>
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>TARGET AUDIENCE</Text>
                <Text style={styles.reviewVal}>
                  {targetAudience === "all"
                    ? "Whole Campus (All Members)"
                    : targetAudience.toUpperCase()}
                </Text>
              </View>

              {eventDescription ? (
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>CIRCULAR NOTES</Text>
                  <Text style={styles.reviewValDesc}>{eventDescription}</Text>
                </View>
              ) : null}

              {broadcastNotification && (
                <View style={styles.broadcastActivePill}>
                  <Icon name="flash" size={14} color={colors.orange} filled />
                  <Text style={styles.broadcastActivePillText}>
                    Simultaneous Campus Bulletin Announcement Enabled
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Pinned Bottom Navigation Bar */}
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
              ? "Publish Event"
              : step === 1
                ? "Next: Select Date & Time"
                : step === 2
                  ? "Next: Target Audience"
                  : "Next: Review Event"
          }
          variant="primary"
          size="lg"
          icon={step === 4 ? "check" : undefined}
          style={{ flex: step > 1 ? 2 : 1 }}
          loading={busy}
          disabled={busy || (step === 1 && !eventTitle.trim())}
          onPress={() => {
            if (step < 4) {
              setStep((s) => (s + 1) as any);
            } else {
              handleFinish();
            }
          }}
        />
      </View>

      {/* Date Time Picker Sheet */}
      <CustomDateTimePickerSheet
        visible={pickerSheetOpen}
        onClose={() => setPickerSheetOpen(false)}
        title="Schedule Event Date"
        onConfirm={(res) => {
          if (res.date) {
            setStartDate(res.date);
          }
          setPickerSheetOpen(false);
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
  categoryChoiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryChoiceChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryChoiceChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  categoryChoiceChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  datePreviewCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  datePreviewLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  datePreviewVal: {
    fontFamily: fonts.extra,
    fontSize: 16,
    color: colors.navy,
  },
  datePreviewTime: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.orange,
  },
  changePresetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.orangeLight,
  },
  changePresetBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  calendarCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  multiDayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  multiDayLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  multiDaySub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  audienceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  audienceCardActive: {
    borderColor: colors.indigo,
    backgroundColor: "#fbfcfe",
  },
  audienceIconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  audienceTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  audienceDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  broadcastBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  broadcastTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  broadcastSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
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
  reviewTitle: {
    fontFamily: fonts.extra,
    fontSize: 18,
    color: colors.navy,
  },
  reviewSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  reviewItem: {
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
  reviewValSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.orange,
  },
  reviewValDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 17,
  },
  broadcastActivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  broadcastActivePillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.orange,
  },
  fixedBottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
});
