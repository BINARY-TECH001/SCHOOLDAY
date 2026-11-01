import React, { useState, useEffect, useRef } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing, shadows } from "../../theme/tokens";
import { Button } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useSchool } from "../../providers/AppProvider";
import { can, Staff } from "../../domain/model";
import { ScannerOverlay } from "./components/ScannerOverlay";
import { AttendancePunchSheet } from "./components/AttendancePunchSheet";
import { ManualCodeEntrySheet } from "./components/ManualCodeEntrySheet";

export interface ScannerScreenProps {
  onClose?: () => void;
  defaultMode?: string;
  onScanComplete?: (code: string) => void;
}

export function ScannerScreen({
  onClose,
  defaultMode,
  onScanComplete,
}: ScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const { data, context, school, services, act, offline } = useSchool();

  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [facingFront, setFacingFront] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [punchSheetOpen, setPunchSheetOpen] = useState(false);
  const [proxyStaff, setProxyStaff] = useState<Staff | null>(null);
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const [isClocking, setIsClocking] = useState(false);

  const scanLockRef = useRef(false);

  const locationName = `${school.name} Campus Gate`;

  // Fetch real location
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted" && isMounted) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMounted) {
            setGpsCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch {
        // Handled gracefully
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // PanResponder for ID Sheet drag-down-to-close gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 12 && Math.abs(gestureState.dx) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 60 || gestureState.vy > 0.5) {
          handleClose();
        }
      },
    }),
  ).current;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home" as any);
    }
  };

  const isClockedIn = data.attendance.some(
    (a) => a.userId === context.userId && !a.outAt,
  );
  const currentStaff = data.staff.find((s) => s.userId === context.userId);
  const currentMembership = data.memberships.find(
    (m) => m.userId === context.userId,
  );
  const userName = currentStaff?.name || currentMembership?.name || "Staff Member";

  const isOwnerOrAdmin = context.role === "owner" || context.role === "admin";
  const canClockOthers =
    isOwnerOrAdmin ||
    currentStaff?.permissions?.includes("clock_others") ||
    currentStaff?.permissions?.includes("attendance");

  const targetStaffMember = proxyStaff || currentStaff;
  const targetUserId = targetStaffMember?.userId || context.userId;
  const targetIsClockedIn = data.attendance.some(
    (a) => a.userId === targetUserId && !a.outAt,
  );
  const targetDisplayName = targetStaffMember?.name || userName;
  const targetRoleTitle = targetStaffMember?.title || targetStaffMember?.role || context.role;

  const handleBarcodeScanned = (scanningResult: { data: string; type?: string }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const rawCode = scanningResult.data ? scanningResult.data.trim() : "";
    if (!rawCode) {
      scanLockRef.current = false;
      return;
    }

    const upper = rawCode.toUpperCase();

    // 0. If consumer provided an onScanComplete callback (e.g. Add Pupil flow), invoke and close
    if (onScanComplete) {
      toast.success("Barcode Captured!");
      onScanComplete(rawCode);
      handleClose();
      return;
    }

    // Try parsing JSON or URL payload
    let targetStudentId = "";
    let targetStaffId = "";
    let targetReceiptId = "";
    let targetInvoiceId = "";
    let targetClass = "";

    try {
      const parsed = JSON.parse(rawCode);
      if (parsed.studentId) targetStudentId = parsed.studentId;
      if (parsed.staffId) targetStaffId = parsed.staffId;
      if (parsed.receiptId) targetReceiptId = parsed.receiptId;
      if (parsed.invoiceId) targetInvoiceId = parsed.invoiceId;
      if (parsed.class) targetClass = parsed.class;
      if (parsed.id) {
        targetStudentId = parsed.id;
        targetStaffId = parsed.id;
        targetReceiptId = parsed.id;
        targetInvoiceId = parsed.id;
      }
    } catch {
      // Check query params if URL
      if (rawCode.includes("?")) {
        const query = rawCode.split("?")[1] || "";
        const parts = query.split("&");
        for (const p of parts) {
          const [k, v] = p.split("=");
          if (k === "id" || k === "studentId") targetStudentId = v || "";
          if (k === "staffId") targetStaffId = v || "";
          if (k === "receiptId") targetReceiptId = v || "";
          if (k === "invoiceId") targetInvoiceId = v || "";
        }
      }
    }

    // 1. School Attendance QR Code (Clock in / Clock out)
    const isSchoolQr =
      upper.includes("SCHOOL") ||
      upper.includes("ATTENDANCE") ||
      upper.includes("CLOCK") ||
      upper === school.id.toUpperCase() ||
      upper === context.schoolId.toUpperCase() ||
      upper === "CAMPUS-GATE" ||
      upper === "GATE-QR";

    if (isSchoolQr) {
      setPunchSheetOpen(true);
      return;
    }

    // 2. Student ID Badge
    const matchedStudent = data.students.find((s) => {
      const sid = s.id.toUpperCase();
      const sName = s.name.toUpperCase();
      return (
        upper === sid ||
        upper === `STUDENT_${sid}` ||
        upper === `STU_${sid}` ||
        upper.includes(sid) ||
        (targetStudentId && sid === targetStudentId.toUpperCase()) ||
        (upper.length > 4 && sName.includes(upper))
      );
    });

    if (matchedStudent) {
      toast.success(`Scanned Pupil: ${matchedStudent.name}`);
      handleClose();
      setTimeout(() => {
        router.push({
          pathname: "/student-detail",
          params: { id: matchedStudent.id },
        });
      }, 100);
      return;
    }

    // 3. Staff ID Badge
    const matchedStaff = data.staff.find((s) => {
      const sid = s.id.toUpperCase();
      const suid = s.userId.toUpperCase();
      const sName = s.name.toUpperCase();
      return (
        upper === sid ||
        upper === suid ||
        upper === `STAFF_${sid}` ||
        upper.includes(sid) ||
        upper.includes(suid) ||
        (targetStaffId && (sid === targetStaffId.toUpperCase() || suid === targetStaffId.toUpperCase())) ||
        (upper.length > 4 && sName.includes(upper))
      );
    });

    if (matchedStaff) {
      if (canClockOthers) {
        toast.success(`Staff Scanned: ${matchedStaff.name}`);
        setProxyStaff(matchedStaff);
        setPunchSheetOpen(true);
        return;
      }
      toast.success(`Scanned Staff: ${matchedStaff.name}`);
      handleClose();
      setTimeout(() => {
        router.push({
          pathname: "/staff-detail",
          params: { id: matchedStaff.id },
        });
      }, 100);
      return;
    }

    // 4. Receipt / Payment QR (supports schoolday:receipt:, RCP- prefix, or transactionRef)
    const receiptRefFromQr = rawCode.startsWith("schoolday:receipt:")
      ? rawCode.replace("schoolday:receipt:", "").trim()
      : rawCode.startsWith("schoolday:ref:RCP-")
      ? rawCode.replace("schoolday:ref:RCP-", "").trim()
      : rawCode.startsWith("RCP-")
      ? rawCode.replace("RCP-", "").trim()
      : targetReceiptId;

    const matchedPayment = data.payments.find((p) => {
      const pid = p.id.toUpperCase();
      const pRef = (p.reference || "").toUpperCase();
      return (
        upper === pid ||
        upper === `RECEIPT_${pid}` ||
        upper === `RCP_${pid}` ||
        upper.includes(pid) ||
        (pRef && upper.includes(pRef)) ||
        (receiptRefFromQr && (pid === receiptRefFromQr.toUpperCase() || (pRef && pRef === receiptRefFromQr.toUpperCase())))
      );
    });

    if (matchedPayment || receiptRefFromQr) {
      const targetId = matchedPayment ? matchedPayment.id : receiptRefFromQr;
      const paymentRec = matchedPayment || data.payments.find((p) => p.id === targetId || p.reference === targetId);

      // Enforce teacher class isolation on receipts
      const isTeacher = context.role === "teacher";
      const hasUnlimitedFinance = isOwnerOrAdmin || can(context.role, "finance") || currentStaff?.permissions?.includes("finance");

      if (isTeacher && !hasUnlimitedFinance && paymentRec) {
        const teacherClasses = [currentStaff?.assignedClass, ...(currentStaff?.assignedClasses || [])].filter(Boolean) as string[];
        const inv = data.invoices.find((i) => paymentRec.invoiceIds.includes(i.id));
        const stud = data.students.find((s) => s.id === inv?.studentId);
        const studentClasses = stud ? (stud.classes || [stud.className]).filter(Boolean) : [];

        const belongsToTeacherClass =
          teacherClasses.length > 0 &&
          studentClasses.some((sc) =>
            teacherClasses.some((tc) => tc.toLowerCase() === sc.toLowerCase()),
          );

        if (!belongsToTeacherClass && stud) {
          toast.error("Class Restricted Receipt", {
            description: `Receipt #${targetId} is for ${stud.name} (${studentClasses.join(", ") || "Other Class"}). You can only view receipts for your assigned class.`,
          });
          setTimeout(() => {
            scanLockRef.current = false;
          }, 2500);
          return;
        }
      }

      toast.success(`Scanned Official Receipt #${targetId}`);
      handleClose();
      setTimeout(() => {
        router.push({
          pathname: "/receipt",
          params: { id: targetId },
        });
      }, 100);
      return;
    }

    // 5. Invoice QR
    const matchedInvoice = data.invoices.find((i) => {
      const iid = i.id.toUpperCase();
      return (
        upper === iid ||
        upper === `INVOICE_${iid}` ||
        upper === `INV_${iid}` ||
        upper.includes(iid) ||
        (targetInvoiceId && iid === targetInvoiceId.toUpperCase())
      );
    });

    if (matchedInvoice) {
      toast.success(`Scanned Invoice #${matchedInvoice.id}`);
      handleClose();
      setTimeout(() => {
        router.push({
          pathname: "/invoice-detail",
          params: { id: matchedInvoice.id },
        });
      }, 100);
      return;
    }

    // 6. Classroom QR
    const matchedClass = data.classes.find((c) => {
      const cid = c.id.toUpperCase();
      const cname = c.name.toUpperCase();
      return upper === cid || upper.includes(cid) || (targetClass && cname.includes(targetClass.toUpperCase()));
    });

    if (matchedClass) {
      toast.success(`Scanned Classroom: ${matchedClass.name}`);
      handleClose();
      setTimeout(() => {
        router.push("/classes" as any);
      }, 100);
      return;
    }

    // 7. Unrecognized QR Code
    toast.error("Unrecognized QR Code", {
      description: `Barcode "${rawCode.slice(0, 24)}" is not registered to this campus.`,
    });

    setTimeout(() => {
      scanLockRef.current = false;
    }, 2000);
  };

  const handlePunchAttendance = async () => {
    setIsClocking(true);
    try {
      const actionType = targetIsClockedIn ? "out" : "in";
      await act(
        () =>
          services.attendance(context, actionType, offline, {
            photoVerified: true,
            locationName,
            targetUserId: targetUserId !== context.userId ? targetUserId : undefined,
          }),
        offline
          ? `Attendance punch for ${targetDisplayName} saved offline • Will sync automatically`
          : targetIsClockedIn
          ? `Clock-out recorded for ${targetDisplayName} at ${locationName}. Good evening!`
          : `Clock-in recorded for ${targetDisplayName} at ${locationName}. Have a great school day!`,
      );

      setPunchSheetOpen(false);
      setProxyStaff(null);
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm attendance.");
    } finally {
      setIsClocking(false);
    }
  };

  // Permission Request Screen
  if (!permission || !permission.granted) {
    return (
      <View style={[styles.root, styles.permissionContainer]}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconTile}>
            <Icon name="camera" size={32} color={colors.orange} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            To automatically scan campus attendance QR codes, pupil badges, and payment
            receipts, SchoolDay requires permission to use your camera.
          </Text>
          <View style={styles.permissionActions}>
            <Button
              title="Grant Camera Access"
              variant="primary"
              size="lg"
              onPress={requestPermission}
            />
            <Button
              title="Enter Code Manually"
              variant="outline"
              size="md"
              onPress={() => setManualSheetOpen(true)}
            />
            <Button
              title="Cancel"
              variant="ghost"
              size="md"
              onPress={handleClose}
            />
          </View>
        </View>

        {/* Manual Code Entry Modal */}
        <ManualCodeEntrySheet
          visible={manualSheetOpen}
          onClose={() => setManualSheetOpen(false)}
          onSubmit={(code) => handleBarcodeScanned({ data: code })}
          data={data}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Live Real Camera Feed */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facingFront ? "front" : "back"}
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128"],
        }}
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={(error) => {
          console.warn("[Camera Mount Error]", error);
          setCameraError(error.message);
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Top ID Sheet Pull Handle (Gesture Swipe Down to Close) */}
      <View
        {...panResponder.panHandlers}
        style={[styles.sheetHandleArea, { paddingTop: Math.max(insets.top, 8) }]}
      >
        <View style={styles.sheetHandleBar} />
      </View>

      {/* Top HUD */}
      <View
        {...panResponder.panHandlers}
        style={styles.topHud}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          style={styles.hudButton}
          onPress={handleClose}
        >
          <Icon name="close" size={20} color="#ffffff" />
        </Pressable>

        <View style={styles.hudCenterInfo}>
          <Text style={styles.hudTitle}>Campus QR Scanner</Text>
          <Text style={styles.hudSubtitle} numberOfLines={1}>
            {school.name}
          </Text>
        </View>

        <View style={styles.hudRightGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter code manually"
            style={styles.hudButton}
            onPress={() => setManualSheetOpen(true)}
          >
            <Icon name="edit" size={18} color="#ffffff" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle flashlight"
            style={[styles.hudButton, flashOn && styles.hudButtonActive]}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Icon name="flash" size={18} color={flashOn ? colors.navy : "#ffffff"} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            style={styles.hudButton}
            onPress={() => setFacingFront(!facingFront)}
          >
            <Icon name="refresh" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {/* Offline Mode Banner */}
      {offline && (
        <View style={styles.offlineBanner}>
          <Icon name="clock" size={14} color="#f59e0b" />
          <Text style={styles.offlineBannerText}>
            Offline Mode • Scans & punches will sync when reconnected
          </Text>
        </View>
      )}

      {/* Center Viewfinder Reticle */}
      <View style={styles.viewportArea}>
        <ScannerOverlay mode="all" locationName={locationName} />
      </View>

      {/* Bottom Floating Bar */}
      <View style={[styles.bottomFloatingWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Quick Test / Manual Action Strip */}
        <View style={styles.quickTestBar}>
          <Pressable
            style={styles.quickTestBtnPrimary}
            onPress={() => handleBarcodeScanned({ data: "CAMPUS-GATE" })}
          >
            <Icon name="location" size={15} color={colors.white} filled />
            <Text style={styles.quickTestBtnPrimaryText}>
              {isClockedIn ? "Clock Out (School QR)" : "Clock In (School QR)"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.quickTestBtnSecondary}
            onPress={() => setManualSheetOpen(true)}
          >
            <Icon name="search" size={15} color={colors.navy} />
            <Text style={styles.quickTestBtnSecondaryText}>Type Code</Text>
          </Pressable>
        </View>

        <View style={styles.bottomHintPill}>
          <Icon name="verify" size={13} color={colors.orange} filled />
          <Text style={styles.bottomHintText}>
            Scan School QR to clock in/out, or Pupil / Staff / Receipt QR
          </Text>
        </View>
      </View>

      {/* Clock In / Out Confirmation Sheet */}
      <AttendancePunchSheet
        visible={punchSheetOpen}
        onClose={() => {
          setPunchSheetOpen(false);
          setProxyStaff(null);
          scanLockRef.current = false;
        }}
        isClockedIn={targetIsClockedIn}
        onPunch={handlePunchAttendance}
        loading={isClocking}
        userName={targetDisplayName}
        userRole={targetRoleTitle}
        locationName={locationName}
        gpsCoords={gpsCoords}
      />

      {/* Manual Code Input Modal */}
      <ManualCodeEntrySheet
        visible={manualSheetOpen}
        onClose={() => {
          setManualSheetOpen(false);
          scanLockRef.current = false;
        }}
        onSubmit={(code) => handleBarcodeScanned({ data: code })}
        data={data}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  sheetHandleArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 6,
    backgroundColor: "rgba(10, 15, 29, 0.85)",
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  permissionContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  permissionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    maxWidth: 380,
    width: "100%",
    gap: spacing.md,
  },
  permissionIconTile: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    textAlign: "center",
  },
  permissionDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.slate600,
    textAlign: "center",
    lineHeight: 19,
  },
  permissionActions: {
    width: "100%",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  topHud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: "rgba(10, 15, 29, 0.85)",
  },
  hudButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  hudButtonActive: {
    backgroundColor: "#ffffff",
  },
  hudCenterInfo: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  hudTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#ffffff",
  },
  hudSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
  },
  hudRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  offlineBannerText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#fbbf24",
  },
  viewportArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomFloatingWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  quickTestBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickTestBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.navy,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...shadows.md,
  },
  quickTestBtnPrimaryText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  quickTestBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    ...shadows.md,
  },
  quickTestBtnSecondaryText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  bottomHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(10, 15, 29, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  bottomHintText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
});
