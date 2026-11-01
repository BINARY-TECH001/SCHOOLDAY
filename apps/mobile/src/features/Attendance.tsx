import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  ModalSheet,
  Txt,
  colors,
  fonts,
  shadows,
} from "../components/ui";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";
import { FullscreenScannerModal } from "./FullscreenScannerModal";

const formatTime = (value?: string) =>
  value
    ? new Date(value).toLocaleTimeString("en-NG", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export function Attendance() {
  const { data, context, school, services, act, offline, busy } = useSchool();
  const isOwner = context.role === "owner" || context.role === "admin";

  const [activeTab, setActiveTab] = useState<"self" | "roster">(
    isOwner ? "roster" : "self",
  );
  const [fullscreenScanner, setFullscreenScanner] = useState(false);
  const [scannerDefaultMode, setScannerDefaultMode] = useState<"face" | "staff" | "any">("face");

  const [liveTime, setLiveTime] = useState(new Date());
  const [rosterFilter, setRosterFilter] = useState<"all" | "clocked" | "late" | "unclocked">("all");

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openTime = school.openTime || "07:30";
  const closeTime = school.closeTime || "15:30";

  // Check current user attendance status
  const myOpenAttendance = data.attendance.find(
    (a) => !a.outAt && a.userId === context.userId,
  );
  const myLatest = data.attendance
    .filter((a) => a.userId === context.userId)
    .at(-1);

  // Late window check
  const currentHour = liveTime.getHours();
  const currentMin = liveTime.getMinutes();
  const [openHour, openMin] = openTime.split(":").map(Number);
  const isLate =
    currentHour > (openHour || 7) ||
    (currentHour === (openHour || 7) && currentMin > (openMin || 30));

  // Staff roster items
  const staffAttendanceList = data.staff.map((staffMember) => {
    const att = data.attendance.find((a) => a.userId === staffMember.userId);
    const isOpen = att && !att.outAt;
    const isClocked = !!att;
    const isLateStaff = att?.arrivalStatus === "Late";

    return {
      staff: staffMember,
      attendance: att,
      isOpen,
      isClocked,
      isLate: isLateStaff,
      inTime: att ? formatTime(att.inAt) : undefined,
      outTime: att?.outAt ? formatTime(att.outAt) : undefined,
      location: att?.locationName || "North Gate Main Terminal",
    };
  });

  const totalStaffCount = data.staff.length;
  const clockedInCount = staffAttendanceList.filter((s) => s.isClocked).length;
  const lateCount = staffAttendanceList.filter((s) => s.isLate).length;
  const unclockedCount = totalStaffCount - clockedInCount;

  const filteredStaffList = staffAttendanceList.filter((item) => {
    if (rosterFilter === "clocked") return item.isClocked;
    if (rosterFilter === "late") return item.isLate;
    if (rosterFilter === "unclocked") return !item.isClocked;
    return true;
  });

  // Proprietor manual clock-in / clock-out for a staff member
  const handleProprietorToggleStaffClock = async (staffUserId: string, staffName: string) => {
    const staffRecord = data.attendance.find((a) => !a.outAt && a.userId === staffUserId);

    if (!staffRecord) {
      await act(
        () =>
          services.attendance(context, "in", offline, {
            photoVerified: true,
            locationName: "Admin Terminal · Proprietor Authorized",
            targetUserId: staffUserId,
          }),
        `Clocked in ${staffName} as On-Duty.`,
      );
    } else {
      await act(
        () =>
          services.attendance(context, "out", offline, {
            targetUserId: staffUserId,
          }),
        `Clocked out ${staffName}.`,
      );
    }
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="Biometric Attendance"
        subtitle="Facial scan, GPS geofence & staff roster"
        rightAction={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              style={styles.headerScanBtn}
              accessibilityLabel="View Attendance Calendar"
              onPress={() => router.push("/attendance-calendar")}
            >
              <Icon name="calendar" size={18} color={colors.navy} />
            </Pressable>
            <Pressable
              style={styles.headerScanBtn}
              accessibilityLabel="Fullscreen Biometric Scanner"
              onPress={() => {
                setScannerDefaultMode("any");
                setFullscreenScanner(true);
              }}
            >
              <Icon name="camera" size={18} color={colors.navy} />
            </Pressable>
          </View>
        }
      />

      {/* Tab Switcher for Proprietor / Admin */}
      {isOwner && (
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabBtn, activeTab === "roster" && styles.tabBtnActive]}
            onPress={() => setActiveTab("roster")}
          >
            <Icon
              name="people"
              size={16}
              color={activeTab === "roster" ? colors.white : colors.slate500}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "roster" && styles.tabBtnTextActive,
              ]}
            >
              Staff Roster ({totalStaffCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === "self" && styles.tabBtnActive]}
            onPress={() => setActiveTab("self")}
          >
            <Icon
              name="clock"
              size={16}
              color={activeTab === "self" ? colors.white : colors.slate500}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "self" && styles.tabBtnTextActive,
              ]}
            >
              My Attendance
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* VIEW 1: STAFF ROSTER & MANAGEMENT (PROPRIETOR VIEW) */}
        {activeTab === "roster" && (
          <View style={{ gap: 16 }}>
            {/* KPI Summary Cards Grid */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { borderLeftColor: colors.emerald }]}>
                <Text style={styles.kpiVal}>{clockedInCount}</Text>
                <Text style={styles.kpiLabel}>Clocked In</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: colors.amber }]}>
                <Text style={styles.kpiVal}>{lateCount}</Text>
                <Text style={styles.kpiLabel}>Late Arrival</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: colors.rose }]}>
                <Text style={styles.kpiVal}>{unclockedCount}</Text>
                <Text style={styles.kpiLabel}>Not Clocked</Text>
              </View>
            </View>

            {/* Launch Fullscreen Scanner Banner */}
            <Card style={styles.launchScannerHeroCard}>
              <View style={styles.scannerHeroIconWrap}>
                <Icon name="camera" size={26} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scannerHeroTitle}>
                  Fullscreen Biometric Gate Scanner
                </Text>
                <Text style={styles.scannerHeroSub}>
                  Scan staff badges, facial verification, or student passes at school gate.
                </Text>
              </View>
              <Button
                title="Scan Now"
                size="sm"
                variant="primary"
                icon="scan"
                onPress={() => {
                  setScannerDefaultMode("any");
                  setFullscreenScanner(true);
                }}
              />
            </Card>

            {/* Attendance Calendar Quick Banner */}
            <Pressable
              style={styles.calendarQuickCard}
              onPress={() => router.push("/attendance-calendar")}
            >
              <View style={styles.calendarQuickIconWrap}>
                <Icon name="calendar" size={18} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.calendarQuickTitle}>Full Attendance Calendar</Text>
                <Text style={styles.calendarQuickSub}>
                  Month grid, shift durations, filter by staff & export
                </Text>
              </View>
              <Icon name="chevron" size={16} color={colors.slate400} />
            </Pressable>

            {/* Roster Filter Chips */}
            <View style={styles.filterChipRow}>
              {[
                { key: "all", label: `All Staff (${totalStaffCount})` },
                { key: "clocked", label: `Present (${clockedInCount})` },
                { key: "late", label: `Late (${lateCount})` },
                { key: "unclocked", label: `Pending (${unclockedCount})` },
              ].map((f) => (
                <Pressable
                  key={f.key}
                  style={[
                    styles.rosterFilterPill,
                    rosterFilter === f.key && styles.rosterFilterPillActive,
                  ]}
                  onPress={() => setRosterFilter(f.key as any)}
                >
                  <Text
                    style={[
                      styles.rosterFilterPillText,
                      rosterFilter === f.key && styles.rosterFilterPillTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Staff Attendance Cards */}
            <View style={{ gap: 10 }}>
              {filteredStaffList.map((item) => (
                <Card key={item.staff.id} style={styles.staffAttendanceCard}>
                  <View style={styles.staffTopRow}>
                    <Avatar name={item.staff.name} size={42} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.staffNameText}>{item.staff.name}</Text>
                      <Text style={styles.staffRoleText}>
                        {item.staff.title || item.staff.role} ·{" "}
                        {item.staff.assignedClass || "General Faculty"}
                      </Text>
                    </View>

                    <Badge
                      tone={
                        item.isOpen
                          ? "success"
                          : item.isLate
                          ? "warning"
                          : item.isClocked
                          ? "neutral"
                          : "danger"
                      }
                      text={
                        item.isOpen
                          ? "ON DUTY"
                          : item.isClocked
                          ? "COMPLETED"
                          : "NOT CLOCKED"
                      }
                      dot={item.isOpen}
                    />
                  </View>

                  {/* Shift details row */}
                  <View style={styles.shiftDetailsRow}>
                    <View style={styles.shiftDetailItem}>
                      <Icon name="clock" size={13} color={colors.slate400} />
                      <Text style={styles.shiftDetailText}>
                        In: <Text style={{ fontFamily: fonts.bold }}>{item.inTime || "—"}</Text>
                        {item.outTime && (
                          <> · Out: <Text style={{ fontFamily: fonts.bold }}>{item.outTime}</Text></>
                        )}
                      </Text>
                    </View>

                    <View style={styles.shiftDetailItem}>
                      <Icon name="location" size={13} color={colors.slate400} />
                      <Text style={styles.shiftDetailText} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  </View>

                  {/* Proprietor Quick Management Action Bar */}
                  <View style={styles.proprietorActionBar}>
                    <Pressable
                      style={styles.actionLinkBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/staff-detail",
                          params: { id: item.staff.id },
                        })
                      }
                    >
                      <Icon name="profile" size={14} color={colors.navy} />
                      <Text style={styles.actionLinkText}>View Profile</Text>
                    </Pressable>

                    <Button
                      title={item.isOpen ? "Clock Out Staff" : "Manual Clock-In"}
                      variant={item.isOpen ? "outline" : "secondary"}
                      size="sm"
                      icon={item.isOpen ? "clock" : "verify"}
                      onPress={() =>
                        handleProprietorToggleStaffClock(
                          item.staff.userId,
                          item.staff.name,
                        )
                      }
                    />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* VIEW 2: PERSONAL ATTENDANCE (MY CLOCK-IN) */}
        {activeTab === "self" && (
          <View style={{ gap: 16 }}>
            {/* Sleek Digital Clock Hero Card */}
            <Card style={styles.personalClockHeroCard}>
              <View style={styles.clockTopStatusRow}>
                <View style={styles.gpsVerifiedTag}>
                  <Icon name="location" size={14} color={colors.emerald} />
                  <Text style={styles.gpsVerifiedText}>
                    {school.name} · North Gate GPS Locked
                  </Text>
                </View>

                <Badge
                  tone={myOpenAttendance ? "success" : isLate ? "warning" : "neutral"}
                  text={
                    myOpenAttendance
                      ? "CLOCKED IN"
                      : isLate
                      ? "LATE WINDOW"
                      : "ON TIME WINDOW"
                  }
                  dot={!!myOpenAttendance}
                />
              </View>

              <Text style={styles.liveClockBigText}>
                {liveTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Text>

              <Text style={styles.liveDateSubText}>
                {liveTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>

              {/* Big Action: Launch Fullscreen Camera Scanner */}
              <Pressable
                style={[
                  styles.launchFullscreenBtn,
                  myOpenAttendance
                    ? styles.launchFullscreenBtnOut
                    : styles.launchFullscreenBtnIn,
                ]}
                onPress={() => {
                  setScannerDefaultMode("face");
                  setFullscreenScanner(true);
                }}
              >
                <Icon
                  name={myOpenAttendance ? "clock" : "camera"}
                  size={24}
                  color={colors.white}
                />
                <Text style={styles.launchFullscreenBtnText}>
                  {myOpenAttendance
                    ? "Fullscreen Clock Out of Campus"
                    : "Fullscreen Facial Clock In"}
                </Text>
              </Pressable>

              <Text style={styles.cameraNoteText}>
                Uses fullscreen biometric face recognition & on-campus geofence verification.
              </Text>
            </Card>

            {/* Operating Hours Card */}
            <Card style={styles.operatingHoursCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.hoursIconWrap}>
                  <Icon name="clock" size={18} color={colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hoursLabel}>CAMPUS SHIFT SCHEDULE</Text>
                  <Text style={styles.hoursValue}>
                    {openTime} AM – {closeTime} PM
                  </Text>
                </View>
                <Badge
                  tone={isLate ? "warning" : "success"}
                  text={isLate ? "LATE WINDOW" : "ON-TIME"}
                />
              </View>
            </Card>

            {/* Personal Attendance History */}
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Txt weight="bold" size="base">
                  My Verified Attendance History
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View Attendance Calendar"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: colors.slate100,
                    borderRadius: 8,
                  }}
                  onPress={() => router.push("/attendance-calendar")}
                >
                  <Icon name="calendar" size={13} color={colors.navy} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: fonts.bold,
                      color: colors.navy,
                    }}
                  >
                    Month View
                  </Text>
                </Pressable>
              </View>

              {data.attendance.length === 0 ? (
                <Empty
                  title="No shifts recorded yet"
                  detail="Tap the fullscreen scanner button above to log your first attendance punch."
                  icon="camera"
                />
              ) : (
                data.attendance
                  .slice()
                  .reverse()
                  .map((att) => (
                    <Card key={att.id} style={styles.historyCard}>
                      <View style={styles.historyRow}>
                        <View style={styles.historyIconCircle}>
                          <Icon name="verify" size={16} color={colors.emerald} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyDateText}>
                            {new Date(att.inAt).toLocaleDateString("en-NG", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </Text>
                          <Text style={styles.historySubText}>
                            In: {formatTime(att.inAt)}
                            {att.outAt ? ` · Out: ${formatTime(att.outAt)}` : " · Shift active"}
                          </Text>
                          <Text style={styles.historyLocationText}>
                            {att.locationName || "Main Campus"}
                          </Text>
                        </View>

                        <Badge
                          tone={att.arrivalStatus === "Late" ? "warning" : "success"}
                          text={att.arrivalStatus === "Late" ? "LATE" : "ON TIME"}
                        />
                      </View>
                    </Card>
                  ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* FULLSCREEN CAMERA SCANNER MODAL */}
      <FullscreenScannerModal
        visible={fullscreenScanner}
        onClose={() => setFullscreenScanner(false)}
        defaultMode={scannerDefaultMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerScanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.slate100,
  },
  tabBtnActive: {
    backgroundColor: colors.navy,
  },
  tabBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.slate600,
  },
  tabBtnTextActive: {
    color: colors.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  kpiVal: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.slate500,
    marginTop: 2,
  },
  launchScannerHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  scannerHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerHeroTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  scannerHeroSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  filterChipRow: {
    flexDirection: "row",
    gap: 8,
  },
  rosterFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  rosterFilterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  rosterFilterPillText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.slate600,
  },
  rosterFilterPillTextActive: {
    color: colors.white,
  },
  staffAttendanceCard: {
    padding: 14,
    gap: 10,
  },
  staffTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  staffNameText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  staffRoleText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.slate500,
    marginTop: 1,
  },
  shiftDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  shiftDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  shiftDetailText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.slate600,
  },
  proprietorActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: 10,
  },
  actionLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.navy,
  },
  personalClockHeroCard: {
    padding: 20,
    alignItems: "center",
  },
  clockTopStatusRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  gpsVerifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gpsVerifiedText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.slate600,
  },
  liveClockBigText: {
    fontSize: 40,
    fontFamily: fonts.bold,
    color: colors.navy,
    letterSpacing: 2,
    marginVertical: 4,
  },
  liveDateSubText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.slate500,
    marginBottom: 18,
  },
  launchFullscreenBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    ...shadows.sm,
  },
  launchFullscreenBtnIn: {
    backgroundColor: colors.orange,
  },
  launchFullscreenBtnOut: {
    backgroundColor: colors.rose,
  },
  launchFullscreenBtnText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  cameraNoteText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.slate400,
    textAlign: "center",
    marginTop: 10,
  },
  operatingHoursCard: {
    padding: 14,
  },
  hoursIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  hoursLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  hoursValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.navy,
    marginTop: 1,
  },
  historyCard: {
    padding: 14,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  historyDateText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  historySubText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.slate600,
    marginTop: 1,
  },
  historyLocationText: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.slate400,
    marginTop: 2,
  },
  calendarQuickCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    gap: 12,
    ...shadows.sm,
  },
  calendarQuickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarQuickTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  calendarQuickSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.slate500,
    marginTop: 2,
  },
});
