import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Avatar, Badge, Card } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { Staff } from "../../../domain/model";
import { StaffComputedStatus } from "../types";

export interface StaffIdentityCardProps {
  staff: Staff;
  computed: StaffComputedStatus;
  isOwnerOrAdmin: boolean;
  onOpenDigitalId: () => void;
  onClockOutAssist?: () => void;
  onClockInAssist?: () => void;
  isClockingAction?: boolean;
}

export function StaffIdentityCard({
  staff,
  computed,
  isOwnerOrAdmin,
  onOpenDigitalId,
  onClockOutAssist,
  onClockInAssist,
  isClockingAction,
}: StaffIdentityCardProps) {
  const handleEmail = () => {
    if (staff.email) {
      Linking.openURL(`mailto:${staff.email}`).catch(() => {
        toast.error("Could not launch email client.");
      });
    }
  };

  const handleCall = () => {
    if (staff.phone) {
      Linking.openURL(`tel:${staff.phone}`).catch(() => {
        toast.error("Could not launch phone dialer.");
      });
    } else {
      toast.error("No phone number on record for this staff member.");
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Avatar uri={staff.avatar} name={staff.name} size={56} role={staff.role} />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {staff.name}
            </Text>
            <Badge
              tone={
                staff.status === "active"
                  ? "success"
                  : staff.status === "suspended"
                  ? "danger"
                  : "warning"
              }
              text={(staff.status || "active").toUpperCase()}
              size="sm"
            />
          </View>

          <Text style={styles.titleText}>
            {staff.title || staff.role} · ID: {staff.id}
          </Text>

          {staff.rank ? (
            <Text style={styles.rankText} numberOfLines={1}>
              {staff.rank}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Live Operational Attendance Strip */}
      <View style={styles.attendanceStrip}>
        <View style={styles.attendanceStatusRow}>
          <View
            style={[
              styles.pulseDot,
              computed.presence === "present"
                ? styles.pulseDotGreen
                : computed.presence === "on_leave"
                ? styles.pulseDotPurple
                : styles.pulseDotGray,
            ]}
          />
          <Text style={styles.attendanceStatusText}>{computed.statusLabel}</Text>
          {computed.arrivalStatus === "late" && (
            <Badge tone="warning" text="Late Arrival" size="sm" />
          )}
        </View>

        {isOwnerOrAdmin && (
          <View style={styles.attendanceActionWrap}>
            {computed.presence === "present" && onClockOutAssist ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clock out for staff"
                style={({ pressed }) => [
                  styles.assistBtn,
                  pressed && { opacity: 0.8 },
                ]}
                disabled={isClockingAction}
                onPress={onClockOutAssist}
              >
                <Icon name="clock" size={13} color="#ffffff" />
                <Text style={styles.assistBtnText}>
                  {isClockingAction ? "Processing…" : "Clock Out"}
                </Text>
              </Pressable>
            ) : computed.presence === "not_in" && onClockInAssist ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Record assisted clock-in"
                style={({ pressed }) => [
                  styles.assistBtn,
                  styles.assistBtnGreen,
                  pressed && { opacity: 0.8 },
                ]}
                disabled={isClockingAction}
                onPress={onClockInAssist}
              >
                <Icon name="verify" size={13} color="#ffffff" />
                <Text style={styles.assistBtnText}>
                  {isClockingAction ? "Processing…" : "Record Arrival"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {/* Action Buttons Row: Email, Call, Digital ID */}
      <View style={styles.actionButtonsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send email"
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionBtnPressed,
          ]}
          onPress={handleEmail}
        >
          <Icon name="sms" size={16} color={colors.navy} />
          <Text style={styles.actionBtnText}>Email</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Call staff member"
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionBtnPressed,
          ]}
          onPress={handleCall}
        >
          <Icon name="call" size={16} color={colors.navy} />
          <Text style={styles.actionBtnText}>Call</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View digital ID card"
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionBtnAccent,
            pressed && styles.actionBtnPressed,
          ]}
          onPress={onOpenDigitalId}
        >
          <Icon name="verify" size={16} color={colors.orange} />
          <Text style={[styles.actionBtnText, { color: colors.orange }]}>
            Digital ID
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nameText: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  titleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  rankText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.slate600,
  },
  attendanceStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  attendanceStatusRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseDotGreen: {
    backgroundColor: colors.green,
  },
  pulseDotPurple: {
    backgroundColor: "#a855f7",
  },
  pulseDotGray: {
    backgroundColor: colors.muted,
  },
  attendanceStatusText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  attendanceActionWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  assistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.danger,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
  },
  assistBtnGreen: {
    backgroundColor: colors.green,
  },
  assistBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#ffffff",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnAccent: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  actionBtnPressed: {
    opacity: 0.75,
  },
  actionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
});
