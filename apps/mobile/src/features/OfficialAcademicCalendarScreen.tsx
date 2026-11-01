import React, { useState } from "react";
import {
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

export function OfficialAcademicCalendarScreen() {
  const { data, context, services, act, busy, school } = useSchool();
  const [activeTab, setActiveTab] = useState<"upload" | "manual" | "published">("upload");
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);

  // State: File Upload & Extraction
  const [selectedDoc, setSelectedDoc] = useState<{
    name: string;
    size: string;
    authority: string;
    extractedCount: number;
  }>({
    name: "Lagos_State_MOE_Academic_Calendar_2026_2027.pdf",
    size: "2.4 MB · Verified Digital Signature",
    authority: "Lagos State Ministry of Basic & Secondary Education",
    extractedCount: 5,
  });

  const [extractedMilestones] = useState<
    Array<{
      title: string;
      date: string;
      endDate?: string;
      type: CalendarEvent["type"];
      description: string;
    }>
  >([
    {
      title: "First Term Resumption (Govt Approved)",
      date: "2026-09-14",
      type: "term",
      description: "Official resumption for all public and approved private institutions",
    },
    {
      title: "National Independence Day",
      date: "2026-10-01",
      type: "holiday",
      description: "Federal Public Holiday · Campus Closed",
    },
    {
      title: "Approved First Term Mid-Term Break",
      date: "2026-10-24",
      endDate: "2026-11-01",
      type: "break",
      description: "Statewide mid-term break for basic and secondary schools",
    },
    {
      title: "First Term Statewide Unified Examinations",
      date: "2026-12-01",
      endDate: "2026-12-11",
      type: "exam",
      description: "Standardized Term End Examinations across all grade levels",
    },
    {
      title: "End of Term Vacation & Carol Service",
      date: "2026-12-18",
      type: "term",
      description: "Vacation begins. Second term resumes Monday, 11 January 2027",
    },
  ]);

  // State: Manual Milestone Entry
  const [manualTitle, setManualTitle] = useState("");
  const [manualType, setManualType] = useState<CalendarEvent["type"]>("term");
  const [manualDate, setManualDate] = useState("2026-11-15");
  const [manualEndDate, setManualEndDate] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualSource, setManualSource] = useState("Academic Board Notice");

  // State: Published Filter
  const [filterType, setFilterType] = useState<string>("all");

  const isOwner = context.role === "owner" || context.role === "admin";

  const handleSyncExtractedMilestones = async () => {
    await act(
      () =>
        services.populateCalendar(
          context,
          extractedMilestones.map((m) => ({
            ...m,
            source: selectedDoc.name,
          })),
        ),
      `Successfully synced ${extractedMilestones.length} official dates from ${selectedDoc.name} to school calendar!`,
    );
    setActiveTab("published");
  };

  const handlePublishManualMilestone = async () => {
    if (!manualTitle.trim()) {
      toast.error("Please enter an event or milestone title.");
      return;
    }

    await act(
      () =>
        services.populateCalendar(context, [
          {
            title: manualTitle.trim(),
            date: manualDate,
            endDate: manualEndDate.trim() || undefined,
            type: manualType,
            description: manualDesc.trim() || "Official scheduled school date",
            source: manualSource.trim() || "School Leadership",
          },
        ]),
      `Published "${manualTitle.trim()}" to the official school calendar!`,
    );

    setManualTitle("");
    setManualDesc("");
    setManualEndDate("");
    setActiveTab("published");
  };

  const publishedEvents = (data.calendar || []).filter((e) => {
    if (filterType === "all") return true;
    return e.type === filterType;
  });

  const getEventBadgeTone = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "term":
        return "purple";
      case "exam":
        return "warning";
      case "break":
        return "neutral";
      case "holiday":
        return "danger";
      case "event":
      default:
        return "success";
    }
  };

  return (
    <View style={styles.root}>
      <TopBar
        title="Official Academic Calendar"
        subtitle={`${school.name} · Institutional Milestones & Circulars`}
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={() => router.push("/calendar" as any)}
            style={styles.calendarNavBtn}
          >
            <Icon name="calendar" size={14} color="#ffffff" filled />
            <Text style={styles.calendarNavBtnText}>Live View</Text>
          </Pressable>
        }
      />

      {/* Segmented Mode Switcher */}
      <View style={styles.segmentBarContainer}>
        <View style={styles.segmentBar}>
          <Pressable
            onPress={() => setActiveTab("upload")}
            style={[styles.segmentBtn, activeTab === "upload" && styles.segmentBtnActive]}
          >
            <Icon
              name="upload"
              size={14}
              color={activeTab === "upload" ? colors.navy : colors.muted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "upload" && styles.segmentBtnTextActive,
              ]}
            >
              Upload Circular
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("manual")}
            style={[styles.segmentBtn, activeTab === "manual" && styles.segmentBtnActive]}
          >
            <Icon
              name="add"
              size={14}
              color={activeTab === "manual" ? colors.navy : colors.muted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "manual" && styles.segmentBtnTextActive,
              ]}
            >
              Enter Dates
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("published")}
            style={[styles.segmentBtn, activeTab === "published" && styles.segmentBtnActive]}
          >
            <Icon
              name="check"
              size={14}
              color={activeTab === "published" ? colors.navy : colors.muted}
              filled={activeTab === "published"}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "published" && styles.segmentBtnTextActive,
              ]}
            >
              Published ({data.calendar?.length || 0})
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MODE 1: UPLOAD & AUTO-EXTRACT CIRCULAR */}
        {activeTab === "upload" && (
          <View style={{ gap: 16 }}>
            {/* Upload Dropzone */}
            <Card style={[styles.dropzoneCard, shadows.sm]}>
              <View style={styles.docIconTile}>
                <Icon name="document" size={32} color={colors.orange} />
              </View>

              <View style={{ gap: 4, alignItems: "center" }}>
                <Text style={styles.docFileName}>{selectedDoc.name}</Text>
                <Text style={styles.docFileSize}>{selectedDoc.size}</Text>
                <Text style={styles.docAuthorityText}>
                  Authority: {selectedDoc.authority}
                </Text>
              </View>

              <View style={styles.docActionRow}>
                <Button
                  title="Switch Document"
                  variant="outline"
                  size="sm"
                  icon="document"
                  onPress={() => {
                    toast.info("Switched to Federal Ministry Schedule circular.");
                    setSelectedDoc({
                      name: "Federal_Republic_MOE_Session_Term_Schedule_2026.pdf",
                      size: "3.1 MB · Approved Official Circular",
                      authority: "Federal Ministry of Education",
                      extractedCount: 5,
                    });
                  }}
                />
              </View>
            </Card>

            {/* Extracted Milestones Preview */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.sectionTitle}>
                  Auto-Extracted Session Milestones ({extractedMilestones.length})
                </Text>
                <Badge text="PARSED VERIFIED" tone="success" dot />
              </View>

              {extractedMilestones.map((item, idx) => (
                <View key={idx} style={[styles.milestoneCard, shadows.sm]}>
                  <View style={styles.milestoneHeader}>
                    <Text style={styles.milestoneTitle}>{item.title}</Text>
                    <Badge text={item.type.toUpperCase()} tone={getEventBadgeTone(item.type)} />
                  </View>

                  <Text style={styles.milestoneDesc}>{item.description}</Text>

                  <View style={styles.milestoneFooter}>
                    <View style={styles.milestoneDatePill}>
                      <Icon name="calendar" size={12} color={colors.navy} />
                      <Text style={styles.milestoneDateText}>
                        {item.date} {item.endDate ? `to ${item.endDate}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.sourceTag}>MOE Approved</Text>
                  </View>
                </View>
              ))}
            </View>

            <Button
              title="Sync Extracted Dates to School Calendar"
              variant="primary"
              size="lg"
              icon="check"
              loading={busy}
              disabled={busy}
              onPress={handleSyncExtractedMilestones}
            />
          </View>
        )}

        {/* MODE 2: MANUAL DATE & MILESTONE ENTRY */}
        {activeTab === "manual" && (
          <View style={{ gap: 14 }}>
            <Card style={{ padding: 16, gap: 14 }}>
              <Text style={styles.sectionTitle}>Schedule Official Event or Milestone</Text>

              <Field
                label="Milestone Title *"
                placeholder="e.g. Mid-Term Open Day or Unified Mock Exam"
                value={manualTitle}
                onChangeText={setManualTitle}
                icon="calendar"
              />

              {/* Event Type Selector */}
              <View style={{ gap: 8 }}>
                <Txt tone="label">Milestone Category</Txt>
                <View style={styles.chipsWrap}>
                  {(["term", "exam", "break", "holiday", "event"] as const).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setManualType(t)}
                      style={[
                        styles.choiceChip,
                        manualType === t && styles.choiceChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          manualType === t && styles.choiceChipTextActive,
                        ]}
                      >
                        {t.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select start date"
                  onPress={() => setActivePicker("start")}
                  style={styles.dateSelectorBox}
                >
                  <Text style={styles.dateSelectorLabel}>START DATE *</Text>
                  <View style={styles.dateSelectorValueRow}>
                    <Icon name="calendar" size={16} color={colors.navy} />
                    <Text style={styles.dateSelectorValue}>
                      {formatDisplayDate(manualDate)}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select end date"
                  onPress={() => setActivePicker("end")}
                  style={styles.dateSelectorBox}
                >
                  <Text style={styles.dateSelectorLabel}>END DATE (OPTIONAL)</Text>
                  <View style={styles.dateSelectorValueRow}>
                    <Icon name="calendar" size={16} color={colors.navy} />
                    <Text
                      style={[
                        styles.dateSelectorValue,
                        !manualEndDate && { color: colors.muted },
                      ]}
                    >
                      {manualEndDate ? formatDisplayDate(manualEndDate) : "None"}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <Field
                label="Description & Instructions"
                placeholder="Details, schedule, or instructions for the school community..."
                value={manualDesc}
                onChangeText={setManualDesc}
                multiline
              />

              <Field
                label="Issuing Authority / Citation"
                placeholder="e.g. State MOE Circular #ED/2026/04"
                value={manualSource}
                onChangeText={setManualSource}
                icon="document"
              />

              <Button
                title="Publish to Academic Calendar"
                variant="primary"
                size="lg"
                icon="check"
                loading={busy}
                disabled={busy || !manualTitle.trim()}
                onPress={handlePublishManualMilestone}
              />
            </Card>
          </View>
        )}

        {/* MODE 3: PUBLISHED CALENDAR FEED */}
        {activeTab === "published" && (
          <View style={{ gap: 14 }}>
            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {[
                { key: "all", label: "All Milestones" },
                { key: "term", label: "Term Dates" },
                { key: "exam", label: "Examinations" },
                { key: "break", label: "Breaks" },
                { key: "holiday", label: "Public Holidays" },
              ].map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setFilterType(f.key)}
                  style={[
                    styles.filterChip,
                    filterType === f.key && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterType === f.key && styles.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {publishedEvents.length === 0 ? (
              <Empty
                title="No events in this category"
                detail="Use 'Upload Circular' or 'Enter Dates' to populate institutional calendar milestones."
                icon="calendar"
              />
            ) : (
              publishedEvents.map((ev) => (
                <View key={ev.id} style={[styles.milestoneCard, shadows.sm]}>
                  <View style={styles.milestoneHeader}>
                    <Text style={styles.milestoneTitle}>{ev.title}</Text>
                    <Badge text={ev.type.toUpperCase()} tone={getEventBadgeTone(ev.type)} />
                  </View>

                  {ev.description ? (
                    <Text style={styles.milestoneDesc}>{ev.description}</Text>
                  ) : null}

                  <View style={styles.milestoneFooter}>
                    <View style={styles.milestoneDatePill}>
                      <Icon name="calendar" size={12} color={colors.navy} />
                      <Text style={styles.milestoneDateText}>
                        {ev.date} {ev.endDate ? `to ${ev.endDate}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.sourceTag}>{ev.source || "Official"}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* DatePickerModal Instance */}
      <DatePickerModal
        visible={activePicker !== null}
        onClose={() => setActivePicker(null)}
        selectedDate={
          activePicker === "start"
            ? manualDate
            : manualEndDate || manualDate
        }
        title={activePicker === "start" ? "Select Start Date" : "Select End Date"}
        onSelectDate={(iso) => {
          if (activePicker === "start") {
            setManualDate(iso);
          } else if (activePicker === "end") {
            setManualEndDate(iso);
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
  dateSelectorBox: {
    flex: 1,
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
  calendarNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  calendarNavBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  segmentBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    ...shadows.sm,
  },
  segmentBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  segmentBtnTextActive: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  dropzoneCard: {
    alignItems: "center",
    padding: 20,
    gap: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.orange,
    backgroundColor: "#fffdf9",
  },
  docIconTile: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  docFileName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    textAlign: "center",
  },
  docFileSize: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  docAuthorityText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.orange,
    textAlign: "center",
  },
  docActionRow: {
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  milestoneCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  milestoneTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    flex: 1,
  },
  milestoneDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.inkSecondary,
    lineHeight: 17,
  },
  milestoneFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 8,
    marginTop: 4,
  },
  milestoneDatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  milestoneDateText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  sourceTag: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
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
    fontSize: 11,
    color: colors.muted,
  },
  choiceChipTextActive: {
    color: "#ffffff",
    fontFamily: fonts.bold,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  filterChipTextActive: {
    fontFamily: fonts.bold,
    color: "#ffffff",
  },
});
