import React, { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
import { Icon, IconName } from "../components/Icon";
import { TopBar } from "../components/TopBar";
import { useSchool } from "../providers/AppProvider";
import { invoiceStatus } from "../domain/model";
import { FullscreenScannerModal } from "./FullscreenScannerModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface ClockHistoryItem {
  id: string;
  date: string;
  timeIn: string;
  timeOut?: string;
  hoursWorked?: string;
  status: "on_time" | "late" | "early_departure" | "excused";
  locationVerified: boolean;
  notes?: string;
}

export function ScanUtilityScreen() {
  const { data, context, school, services, act, offline } = useSchool();
  const isProprietor =
    context.role === "owner" || context.role === "admin";

  const [activeTab, setActiveTab] = useState<"scan" | "clock" | "rules">("scan");
  const [fullscreenScanner, setFullscreenScanner] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanType, setScanType] = useState<"all" | "student" | "staff" | "receipt" | "class">("all");
  const [manualCode, setManualCode] = useState("");
  const [scanAnimationActive, setScanAnimationActive] = useState(true);

  // Result modal after scan
  const [scanResult, setScanResult] = useState<{
    type: "student" | "staff" | "receipt" | "class" | "unknown";
    id: string;
    title: string;
    subtitle: string;
    details: Record<string, string>;
  } | null>(null);

  // Clock in / out state
  const openAttendance = data.attendance.find((a) => !a.outAt);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Proprietor configurable windows
  const [windowConfig, setWindowConfig] = useState({
    clockInStart: "06:30 AM",
    clockInCutoff: "08:15 AM",
    lateGraceMinutes: "15",
    clockOutStart: "03:30 PM",
    clockOutCutoff: "06:00 PM",
    strictLockout: true,
    allowWeekendClock: false,
    requireGeofence: true,
  });

  const [isEditingRules, setIsEditingRules] = useState(false);

  // Actual user attendance history derived from data
  const clockHistory = useMemo<ClockHistoryItem[]>(() => {
    return data.attendance
      .filter((a) => a.userId === context.userId)
      .map((item) => {
        const inDate = new Date(item.inAt);
        const outDate = item.outAt ? new Date(item.outAt) : null;
        const formattedDate = inDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const formattedTimeIn = inDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const formattedTimeOut = outDate
          ? outDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : undefined;

        const hoursWorked = outDate
          ? `${Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60)))}h`
          : "In Progress";

        return {
          id: item.id,
          date: formattedDate,
          timeIn: formattedTimeIn,
          timeOut: formattedTimeOut,
          hoursWorked,
          status: item.arrivalStatus === "late" ? "late" : "on_time",
          locationVerified: !!item.locationVerified,
          notes: item.locationName || `${school.name} Gate`,
        };
      });
  }, [data.attendance, context.userId, school.name]);

  const handleScanAction = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    // 1. Check students
    const matchedPupil = data.students.find(
      (p) =>
        trimmed === p.id.toUpperCase() ||
        trimmed === `STU-${p.id.toUpperCase()}` ||
        (trimmed.startsWith("STU-") && trimmed.includes(p.id.toUpperCase()))
    );
    if (matchedPupil) {
      setScanResult({
        type: "student",
        id: matchedPupil.id,
        title: matchedPupil.name,
        subtitle: `Class: ${matchedPupil.className} · Reg: ${matchedPupil.id}`,
        details: {
          "Student ID": matchedPupil.id,
          "Class": matchedPupil.className,
          "Status": "Active Student",
        },
      });
      return;
    }

    // 2. Check staff
    const matchedStaff = data.staff.find(
      (s) =>
        trimmed === s.id.toUpperCase() ||
        trimmed === s.userId.toUpperCase() ||
        (trimmed.startsWith("STAFF-") && trimmed.includes(s.id.toUpperCase()))
    );
    if (matchedStaff) {
      const isStaffIn = data.attendance.some(
        (a) => a.userId === matchedStaff.userId && !a.outAt
      );
      setScanResult({
        type: "staff",
        id: matchedStaff.id,
        title: matchedStaff.name,
        subtitle: `Role: ${matchedStaff.title || matchedStaff.role} · Badge: ${matchedStaff.id}`,
        details: {
          "Staff Code": matchedStaff.id,
          "Department": "Academic Faculty",
          "Current Status": isStaffIn ? "Clocked In" : "Pending Clock In",
        },
      });
      return;
    }

    // 3. Check receipts / payments / invoices
    const matchedInvoice = data.invoices.find(
      (inv) =>
        trimmed === inv.id.toUpperCase() ||
        (trimmed.startsWith("INV-") && trimmed.includes(inv.id.toUpperCase()))
    );
    if (matchedInvoice) {
      setScanResult({
        type: "receipt",
        id: matchedInvoice.id,
        title: matchedInvoice.items[0]?.label || "Tuition & School Fee",
        subtitle: `Invoice #${matchedInvoice.id}`,
        details: {
          "Invoice ID": matchedInvoice.id,
          "Status": invoiceStatus(matchedInvoice).toUpperCase(),
        },
      });
      return;
    }

    // 4. Check classes
    const matchedClass = data.classes.find(
      (c) =>
        trimmed === c.id.toUpperCase() ||
        trimmed === c.code.toUpperCase()
    );
    if (matchedClass) {
      setScanResult({
        type: "class",
        id: matchedClass.id,
        title: matchedClass.name,
        subtitle: `Code: ${matchedClass.code}`,
        details: {
          "Class Code": matchedClass.code,
          "Enrolled Pupils": `${matchedClass.studentCount || 0} Pupils`,
        },
      });
      return;
    }

    // 5. Not found in database
    setScanResult({
      type: "unknown",
      id: trimmed,
      title: "Record Not Found",
      subtitle: `No entity matching code "${trimmed}" was found in ${school.name}.`,
      details: {
        "Scanned Code": trimmed,
        "Status": "Unregistered",
      },
    });
  };

  const handleClockToggle = async () => {
    const now = new Date();
    // Parse clockInStart
    const [startHStr, startMStr] = windowConfig.clockInStart.replace(/ [AP]M/i, "").split(":");
    const isPM = /PM/i.test(windowConfig.clockInStart);
    let startH = parseInt(startHStr || "6", 10);
    if (isPM && startH < 12) startH += 12;
    if (!isPM && startH === 12) startH = 0;
    const startM = parseInt(startMStr || "30", 10);

    const shiftStart = new Date(now);
    shiftStart.setHours(startH, startM, 0, 0);

    if (!openAttendance && windowConfig.strictLockout && now < shiftStart) {
      Alert.alert(
        "Early Clock-In Restricted",
        `Campus clock-in window opens at ${windowConfig.clockInStart}. Staff cannot clock in ahead of schedule.`
      );
      return;
    }

    // Parse clockOutStart
    const [outHStr, outMStr] = windowConfig.clockOutStart.replace(/ [AP]M/i, "").split(":");
    const isOutPM = /PM/i.test(windowConfig.clockOutStart);
    let outH = parseInt(outHStr || "15", 10);
    if (isOutPM && outH < 12) outH += 12;
    if (!isOutPM && outH === 12) outH = 0;
    const outM = parseInt(outMStr || "30", 10);

    const shiftOutStart = new Date(now);
    shiftOutStart.setHours(outH, outM, 0, 0);

    if (openAttendance && windowConfig.strictLockout && now < shiftOutStart) {
      Alert.alert(
        "Early Clock-Out Restricted",
        `Campus duty shift continues until ${windowConfig.clockOutStart}. Early clock-out ahead of shift completion is not permitted.`
      );
      return;
    }

    if (!openAttendance) {
      await act(
        () =>
          services.attendance(context, "in", offline, {
            photoVerified: true,
            locationName: `${school.name} Main Gate`,
          }),
        offline
          ? "Recorded on device (offline sync)"
          : "Biometric clock-in confirmed! Welcome to campus."
      );
    } else {
      await act(
        () => services.attendance(context, "out", offline),
        "Clock out confirmed! Have a great rest."
      );
    }
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="QR & Attendance Hub"
        subtitle="Universal Scanner & Biometric Shift"
        rightAction={
          <Pressable
            style={styles.headerPill}
            onPress={() => setActiveTab(activeTab === "rules" ? "scan" : "rules")}
          >
            <Icon
              name={activeTab === "rules" ? "scan" : "settings"}
              size={18}
              color={colors.navy}
            />
          </Pressable>
        }
      />

      {/* Modern Top Segment Switcher */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabBtn, activeTab === "scan" && styles.tabBtnActive]}
          onPress={() => setActiveTab("scan")}
        >
          <Icon
            name="scan"
            size={16}
            color={activeTab === "scan" ? colors.white : colors.slate500}
          />
          <Text
            style={[styles.tabBtnText, activeTab === "scan" && styles.tabBtnTextActive]}
          >
            Scanner
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === "clock" && styles.tabBtnActive]}
          onPress={() => setActiveTab("clock")}
        >
          <Icon
            name="clock"
            size={16}
            color={activeTab === "clock" ? colors.white : colors.slate500}
          />
          <Text
            style={[styles.tabBtnText, activeTab === "clock" && styles.tabBtnTextActive]}
          >
            Clock-In
          </Text>
          {openAttendance && <View style={styles.clockedDot} />}
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === "rules" && styles.tabBtnActive]}
          onPress={() => setActiveTab("rules")}
        >
          <Icon
            name="shield"
            size={16}
            color={activeTab === "rules" ? colors.white : colors.slate500}
          />
          <Text
            style={[styles.tabBtnText, activeTab === "rules" && styles.tabBtnTextActive]}
          >
            Time Rules
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: SCANNER */}
        {activeTab === "scan" && (
          <View style={styles.scanSection}>
            {/* Viewfinder Card */}
            <Pressable
              style={styles.viewfinderCard}
              onPress={() => setFullscreenScanner(true)}
              accessibilityRole="button"
              accessibilityLabel="Launch Fullscreen Camera Scanner"
            >
              <View style={styles.cameraPreviewOverlay}>
                {/* Corner Targets */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Animated Scan Beam */}
                <View style={styles.scanBeam} />

                {/* Center Icon */}
                <View style={styles.centerTarget}>
                  <Icon name="scan" size={48} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.targetHint}>Tap to open Fullscreen Edge-to-Edge Camera</Text>
                </View>

                {/* Viewfinder Controls */}
                <View style={styles.viewfinderControls}>
                  <Pressable
                    style={[styles.cameraActionBtn, flashOn && styles.cameraActionBtnActive]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setFlashOn(!flashOn);
                    }}
                  >
                    <Icon
                      name="flash"
                      size={18}
                      color={flashOn ? colors.navy : colors.white}
                    />
                  </Pressable>

                  <Pressable
                    style={styles.cameraActionBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setScanAnimationActive(!scanAnimationActive);
                    }}
                  >
                    <Icon name="refresh" size={18} color={colors.white} />
                  </Pressable>
                </View>
              </View>

              {/* Scan Mode Category Pills */}
              <View style={styles.scanModeRow}>
                {[
                  { key: "all", label: "Any QR" },
                  { key: "student", label: "Student" },
                  { key: "staff", label: "Staff" },
                  { key: "receipt", label: "Receipt" },
                  { key: "class", label: "Class" },
                ].map((mode) => (
                  <Pressable
                    key={mode.key}
                    style={[
                      styles.modePill,
                      scanType === mode.key && styles.modePillActive,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setScanType(mode.key as any);
                    }}
                  >
                    <Text
                      style={[
                        styles.modePillText,
                        scanType === mode.key && styles.modePillTextActive,
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>

            {/* Primary Fullscreen Launch Button */}
            <Button
              title="Launch Fullscreen Camera Scanner"
              icon="camera"
              size="lg"
              variant="primary"
              onPress={() => setFullscreenScanner(true)}
              style={{ marginTop: 14 }}
            />

            {/* Quick Test Simulators */}
            <Card style={styles.testCard}>
              <View style={styles.cardHeader}>
                <Icon name="verify" size={20} color={colors.navy} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Txt weight="semi" size="base">
                    Quick QR Simulators
                  </Txt>
                  <Txt size="xs" color={colors.slate500}>
                    Simulate scanning actual NFC/QR badges in test environment
                  </Txt>
                </View>
              </View>

              <View style={styles.testButtonsGrid}>
                <Pressable
                  style={styles.testBtn}
                  onPress={() => handleScanAction("STU-2026-PRI4B")}
                >
                  <Icon name="profile" size={16} color={colors.navy} />
                  <Text style={styles.testBtnText}>Student Pass</Text>
                </Pressable>

                <Pressable
                  style={styles.testBtn}
                  onPress={() => handleScanAction("STAFF-ED-042")}
                >
                  <Icon name="teacher" size={16} color={colors.navy} />
                  <Text style={styles.testBtnText}>Staff Badge</Text>
                </Pressable>

                <Pressable
                  style={styles.testBtn}
                  onPress={() => handleScanAction("RCP-SCH-883920")}
                >
                  <Icon name="receipt" size={16} color={colors.navy} />
                  <Text style={styles.testBtnText}>Receipt Seal</Text>
                </Pressable>

                <Pressable
                  style={styles.testBtn}
                  onPress={() => handleScanAction("CLS-PRI-4B")}
                >
                  <Icon name="school" size={16} color={colors.navy} />
                  <Text style={styles.testBtnText}>Class Token</Text>
                </Pressable>
              </View>
            </Card>

            {/* Manual Code Fallback */}
            <Card style={styles.manualCard}>
              <Txt weight="semi" size="sm" style={{ marginBottom: 6 }}>
                Manual ID / Serial Entry
              </Txt>
              <Txt size="xs" color={colors.slate500} style={{ marginBottom: 12 }}>
                If QR code is scratched or camera permission is restricted, enter ID code manually.
              </Txt>

              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  placeholder="e.g. STU-2026-0042"
                  placeholderTextColor={colors.slate400}
                  value={manualCode}
                  onChangeText={setManualCode}
                  autoCapitalize="characters"
                />
                <Button
                  title="Verify"
                  size="sm"
                  onPress={() => {
                    handleScanAction(manualCode);
                    setManualCode("");
                  }}
                  disabled={!manualCode.trim()}
                />
              </View>
            </Card>
          </View>
        )}

        {/* TAB 2: CLOCK-IN / ATTENDANCE */}
        {activeTab === "clock" && (
          <View style={styles.clockSection}>
            {/* Live Clock Display Hero Card */}
            <Card style={styles.clockHeroCard}>
              <View style={styles.clockHeaderRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>CAMPUS GPS ACTIVE</Text>
                </View>

                <Badge
                  tone={openAttendance ? "success" : "warning"}
                  text={openAttendance ? "CLOCKED IN" : "NOT CLOCKED IN"}
                />
              </View>

              <Text style={styles.largeDigitalClock}>
                {liveTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Text>

              <Text style={styles.liveDateText}>
                {liveTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>

              <View style={styles.geofenceRow}>
                <Icon name="location" size={14} color={colors.indigo} />
                <Text style={styles.geofenceText}>
                  {school.name} Campus · North Wing Gate · Lat 6.5244, Long 3.3792
                </Text>
              </View>

              {/* Big Action Clock In / Out Button */}
              <Pressable
                style={[
                  styles.mainClockBtn,
                  openAttendance ? styles.mainClockBtnOut : styles.mainClockBtnIn,
                ]}
                onPress={handleClockToggle}
              >
                <Icon
                  name={openAttendance ? "clock" : "camera"}
                  size={26}
                  color={colors.white}
                />
                <Text style={styles.mainClockBtnText}>
                  {openAttendance ? "Clock Out of Campus" : "Biometric Clock In"}
                </Text>
              </Pressable>

              <Text style={styles.clockHelpText}>
                {openAttendance
                  ? "Tap to clock out when concluding your campus hours."
                  : "Requires camera face verification & active campus geofence."}
              </Text>
            </Card>

            {/* Today's Shifts Card */}
            <Card style={styles.shiftCard}>
              <Txt weight="semi" size="sm" style={{ marginBottom: 12 }}>
                Today's Attendance Window
              </Txt>

              <View style={styles.shiftTimeline}>
                <View style={styles.shiftCol}>
                  <View style={styles.shiftIconWrap}>
                    <Icon name="clock" size={16} color={colors.emerald} />
                  </View>
                  <Text style={styles.shiftLabel}>Arrival Window</Text>
                  <Text style={styles.shiftVal}>{windowConfig.clockInStart}</Text>
                  <Badge tone="success" text="On-Time Window" />
                </View>

                <View style={styles.shiftDivider} />

                <View style={styles.shiftCol}>
                  <View style={styles.shiftIconWrap}>
                    <Icon name="clock" size={16} color={colors.orange} />
                  </View>
                  <Text style={styles.shiftLabel}>Dismissal Window</Text>
                  <Text style={styles.shiftVal}>{windowConfig.clockOutStart}</Text>
                  <Badge tone="purple" text="End Shift" />
                </View>
              </View>
            </Card>

            {/* Attendance Audit Trail History */}
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Txt weight="bold" size="base">
                  Clock-In History & Log
                </Txt>
                <Badge tone="neutral" text={`${clockHistory.length} Shifts`} />
              </View>

              {clockHistory.length === 0 ? (
                <Card style={{ padding: 24, marginVertical: 12 }}>
                  <Empty
                    title="No Attendance Logs"
                    detail="You have not logged any clock-in or clock-out shifts yet. Tap Clock In above to begin."
                    icon="clock"
                  />
                </Card>
              ) : (
                clockHistory.map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    <View style={styles.historyIconCol}>
                      <View
                        style={[
                          styles.historyIconBg,
                          item.status === "late" && { backgroundColor: "#fef3c7" },
                        ]}
                      >
                        <Icon
                          name={item.status === "late" ? "clock" : "verify"}
                          size={16}
                          color={item.status === "late" ? colors.amber : colors.emerald}
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <View style={styles.historyRowTitle}>
                        <Text style={styles.historyDate}>{item.date}</Text>
                        <Badge
                          tone={item.status === "late" ? "warning" : "success"}
                          text={item.status === "late" ? "LATE (+18M)" : "ON TIME"}
                        />
                      </View>

                      <Text style={styles.historyTimeRange}>
                        In: <Text style={{ fontWeight: "700" }}>{item.timeIn}</Text>
                        {item.timeOut ? (
                          <> · Out: <Text style={{ fontWeight: "700" }}>{item.timeOut}</Text></>
                        ) : (
                          " · Shift active"
                        )}
                      </Text>

                      <Text style={styles.historyLocation}>{item.notes}</Text>
                    </View>

                    <View style={styles.historyHoursCol}>
                      <Text style={styles.historyHoursText}>
                        {item.hoursWorked || "Active"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TAB 3: TIME RULES (PROPRIETOR CONFIGURATION) */}
        {activeTab === "rules" && (
          <View style={styles.rulesSection}>
            <Card style={styles.rulesHeroCard}>
              <View style={styles.rulesHeroIconWrap}>
                <Icon name="shield" size={24} color={colors.navy} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Txt weight="bold" size="base">
                  Proprietor Clock-In Window Rules
                </Txt>
                <Txt size="xs" color={colors.slate500}>
                  Enforce strictly defined hours when academic & administrative staff can clock in and clock out.
                </Txt>
              </View>
            </Card>

            <Card style={styles.ruleInputsCard}>
              <Txt weight="semi" size="sm" style={{ marginBottom: 14 }}>
                Morning Arrival Restrictions
              </Txt>

              <Field
                label="Earliest Allowed Clock-In"
                hint="Staff cannot punch in before this time"
              >
                <TextInput
                  style={styles.ruleInput}
                  value={windowConfig.clockInStart}
                  onChangeText={(t) =>
                    setWindowConfig((prev) => ({ ...prev, clockInStart: t }))
                  }
                />
              </Field>

              <Field
                label="Official Late Cutoff Threshold"
                hint="Punches after this time will be flagged as Late Arrival"
              >
                <TextInput
                  style={styles.ruleInput}
                  value={windowConfig.clockInCutoff}
                  onChangeText={(t) =>
                    setWindowConfig((prev) => ({ ...prev, clockInCutoff: t }))
                  }
                />
              </Field>

              <Field
                label="Grace Period (Minutes)"
                hint="Window before penalty or late deduction applies"
              >
                <TextInput
                  style={styles.ruleInput}
                  value={windowConfig.lateGraceMinutes}
                  keyboardType="numeric"
                  onChangeText={(t) =>
                    setWindowConfig((prev) => ({ ...prev, lateGraceMinutes: t }))
                  }
                />
              </Field>
            </Card>

            <Card style={styles.ruleInputsCard}>
              <Txt weight="semi" size="sm" style={{ marginBottom: 14 }}>
                Afternoon Dismissal Restrictions
              </Txt>

              <Field
                label="Earliest Allowed Clock-Out"
                hint="Prevents premature departure before school dismissal"
              >
                <TextInput
                  style={styles.ruleInput}
                  value={windowConfig.clockOutStart}
                  onChangeText={(t) =>
                    setWindowConfig((prev) => ({ ...prev, clockOutStart: t }))
                  }
                />
              </Field>

              <Field
                label="Latest Campus Close"
                hint="Security lockdown & overtime threshold"
              >
                <TextInput
                  style={styles.ruleInput}
                  value={windowConfig.clockOutCutoff}
                  onChangeText={(t) =>
                    setWindowConfig((prev) => ({ ...prev, clockOutCutoff: t }))
                  }
                />
              </Field>
            </Card>

            <Card style={styles.ruleInputsCard}>
              <Txt weight="semi" size="sm" style={{ marginBottom: 14 }}>
                Automated Gate Enforcement Controls
              </Txt>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Strict Window Lockout</Text>
                  <Text style={styles.switchDesc}>
                    Block clock-in outside window. Late arrivals require Proprietor Override Passcode.
                  </Text>
                </View>
                <Switch
                  value={windowConfig.strictLockout}
                  onValueChange={(val) =>
                    setWindowConfig((prev) => ({ ...prev, strictLockout: val }))
                  }
                  trackColor={{ false: colors.slate300, true: colors.navy }}
                />
              </View>

              <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.slate100, paddingTop: 14 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Enforce GPS Geofence Check</Text>
                  <Text style={styles.switchDesc}>
                    Reject attempts clocked outside the 250m campus perimeter.
                  </Text>
                </View>
                <Switch
                  value={windowConfig.requireGeofence}
                  onValueChange={(val) =>
                    setWindowConfig((prev) => ({ ...prev, requireGeofence: val }))
                  }
                  trackColor={{ false: colors.slate300, true: colors.navy }}
                />
              </View>

              <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.slate100, paddingTop: 14 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Allow Weekend Shifts</Text>
                  <Text style={styles.switchDesc}>
                    Allow weekend clock-ins for scheduled events or remedial prep.
                  </Text>
                </View>
                <Switch
                  value={windowConfig.allowWeekendClock}
                  onValueChange={(val) =>
                    setWindowConfig((prev) => ({ ...prev, allowWeekendClock: val }))
                  }
                  trackColor={{ false: colors.slate300, true: colors.navy }}
                />
              </View>
            </Card>

            <Button
              title="Save Proprietor Time Rules"
              icon="check"
              onPress={() => {
                Alert.alert(
                  "Time Rules Updated",
                  "Campus clock-in and clock-out enforcement rules have been updated and broadcasted across all staff terminals.",
                  [{ text: "OK" }],
                );
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </ScrollView>

      {/* RESULT MODAL SHEET */}
      <ModalSheet
        visible={!!scanResult}
        onClose={() => setScanResult(null)}
        title="QR Verification Result"
      >
        {scanResult && (
          <View style={styles.resultSheetContent}>
            <View style={styles.resultSheetHeader}>
              <View
                style={[
                  styles.resultSheetIconWrap,
                  scanResult.type === "student" && { backgroundColor: "#eff6ff" },
                  scanResult.type === "staff" && { backgroundColor: "#f5f3ff" },
                  scanResult.type === "receipt" && { backgroundColor: "#ecfdf5" },
                ]}
              >
                <Icon
                  name={
                    scanResult.type === "student"
                      ? "profile"
                      : scanResult.type === "staff"
                      ? "teacher"
                      : scanResult.type === "receipt"
                      ? "receipt"
                      : "scan"
                  }
                  size={28}
                  color={colors.navy}
                />
              </View>
              <Text style={styles.resultSheetTitle}>{scanResult.title}</Text>
              <Text style={styles.resultSheetSubtitle}>{scanResult.subtitle}</Text>
            </View>

            <View style={styles.resultDetailsTable}>
              {Object.entries(scanResult.details).map(([k, v]) => (
                <View key={k} style={styles.resultDetailRow}>
                  <Text style={styles.resultDetailKey}>{k}</Text>
                  <Text style={styles.resultDetailVal}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Contextual Action Buttons */}
            <View style={styles.resultSheetActions}>
              {scanResult.type === "student" && (
                <Button
                  title="View Student Profile"
                  icon="profile"
                  onPress={() => {
                    setScanResult(null);
                    router.push({
                      pathname: "/student-detail",
                      params: { id: scanResult.id },
                    });
                  }}
                />
              )}

              {scanResult.type === "staff" && (
                <Button
                  title="Emergency Clock-In This Staff"
                  icon="verify"
                  onPress={() => {
                    setScanResult(null);
                    Alert.alert(
                      "Staff Clock-In Verified",
                      `Emergency clock-in successfully recorded for ${scanResult.title}.`,
                      [{ text: "Done" }],
                    );
                  }}
                />
              )}

              {scanResult.type === "receipt" && (
                <Button
                  title="Open Official Receipt"
                  icon="receipt"
                  onPress={() => {
                    setScanResult(null);
                    router.push({
                      pathname: "/receipt",
                      params: { id: scanResult.id },
                    });
                  }}
                />
              )}

              {scanResult.type === "class" && (
                <Button
                  title="Manage Class"
                  icon="school"
                  onPress={() => {
                    setScanResult(null);
                    router.push({
                      pathname: "/classes",
                      params: { id: scanResult.id },
                    });
                  }}
                />
              )}

              <Button
                title="Dismiss"
                variant="outline"
                onPress={() => setScanResult(null)}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        )}
      </ModalSheet>
 
      {/* FULLSCREEN CAMERA SCANNER MODAL */}
      <FullscreenScannerModal
        visible={fullscreenScanner}
        onClose={() => setFullscreenScanner(false)}
        onScanComplete={(code) => {
          setFullscreenScanner(false);
          handleScanAction(code);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
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
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.slate600,
  },
  tabBtnTextActive: {
    color: colors.white,
  },
  clockedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  scanSection: {
    gap: 16,
  },
  viewfinderCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    overflow: "hidden",
    ...shadows.md,
  },
  cameraPreviewOverlay: {
    height: 280,
    backgroundColor: "#020617",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#38BDF8",
  },
  cornerTL: {
    top: 36,
    left: 48,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 36,
    right: 48,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 36,
    left: 48,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 36,
    right: 48,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scanBeam: {
    position: "absolute",
    top: "45%",
    left: 48,
    right: 48,
    height: 2,
    backgroundColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  centerTarget: {
    alignItems: "center",
    gap: 8,
  },
  targetHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  viewfinderControls: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  cameraActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraActionBtnActive: {
    backgroundColor: colors.white,
  },
  scanModeRow: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#1E293B",
    gap: 6,
  },
  modePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  modePillActive: {
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  modePillText: {
    color: colors.slate400,
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  modePillTextActive: {
    color: colors.white,
  },
  testCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  testButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.slate100,
    borderRadius: 10,
    flexGrow: 1,
  },
  testBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  manualCard: {
    padding: 16,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  manualInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  clockSection: {
    gap: 16,
  },
  clockHeroCard: {
    padding: 20,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  clockHeaderRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.slate600,
  },
  largeDigitalClock: {
    fontSize: 38,
    fontFamily: fonts.bold,
    color: colors.navy,
    letterSpacing: 2,
    marginVertical: 4,
  },
  liveDateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.slate500,
    marginBottom: 8,
  },
  geofenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    marginBottom: 20,
  },
  geofenceText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.slate600,
  },
  mainClockBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    ...shadows.sm,
  },
  mainClockBtnIn: {
    backgroundColor: colors.navy,
  },
  mainClockBtnOut: {
    backgroundColor: "#DC2626",
  },
  mainClockBtnText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  clockHelpText: {
    fontSize: 11,
    color: colors.slate400,
    textAlign: "center",
    marginTop: 10,
  },
  shiftCard: {
    padding: 16,
  },
  shiftTimeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  shiftIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  shiftLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.slate500,
  },
  shiftVal: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  shiftDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.slate200,
    marginHorizontal: 12,
  },
  historySection: {
    marginTop: 8,
    gap: 10,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 14,
    ...shadows.sm,
  },
  historyIconCol: {
    marginRight: 12,
  },
  historyIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  historyRowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  historyDate: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.navy,
  },
  historyTimeRange: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate600,
  },
  historyLocation: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 2,
  },
  historyHoursCol: {
    alignItems: "flex-end",
  },
  historyHoursText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  rulesSection: {
    gap: 14,
  },
  rulesHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F1F5F9",
  },
  rulesHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleInputsCard: {
    padding: 16,
  },
  ruleInput: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  switchTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.navy,
    marginBottom: 2,
  },
  switchDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 15,
  },
  resultSheetContent: {
    padding: 16,
  },
  resultSheetHeader: {
    alignItems: "center",
    marginBottom: 18,
  },
  resultSheetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  resultSheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    textAlign: "center",
  },
  resultSheetSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
    textAlign: "center",
  },
  resultDetailsTable: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  resultDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultDetailKey: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.slate500,
  },
  resultDetailVal: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.navy,
  },
  resultSheetActions: {
    gap: 8,
  },
});
