import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radii, shadows, spacing } from "../../../theme/tokens";
import { Button } from "../../../components/ui";
import { Icon } from "../../../components/Icon";

interface AttendancePunchSheetProps {
  visible: boolean;
  onClose: () => void;
  isClockedIn: boolean;
  onPunch: () => void;
  loading: boolean;
  userName: string;
  userRole: string;
  locationName: string;
  gpsCoords?: { latitude: number; longitude: number } | null;
}

export function AttendancePunchSheet({
  visible,
  onClose,
  isClockedIn,
  onPunch,
  loading,
  userName,
  userRole,
  locationName,
  gpsCoords,
}: AttendancePunchSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header Tile */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconTile,
                { backgroundColor: isClockedIn ? colors.orangeLight : colors.greenLight },
              ]}
            >
              <Icon
                name={isClockedIn ? "logout" : "verify"}
                size={22}
                color={isClockedIn ? colors.orange : colors.greenDark}
                filled
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {isClockedIn ? "Confirm Clock-Out" : "Confirm Clock-In"}
              </Text>
              <Text style={styles.subtitle}>Institutional Attendance Verification</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.slate400} />
            </Pressable>
          </View>

          {/* Details Card */}
          <View style={styles.body}>
            <View style={styles.userCard}>
              <View style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarInitials}>
                    {userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userMeta}>
                  <Text style={styles.userName}>{userName}</Text>
                  <Text style={styles.userRole}>{userRole.toUpperCase()} • ACTIVE SESSION</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: isClockedIn ? colors.orangeLight : colors.greenLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isClockedIn ? colors.orange : colors.greenDark },
                    ]}
                  >
                    {isClockedIn ? "ON CAMPUS" : "OFF CAMPUS"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Geofence & Location */}
            <View style={styles.geoBox}>
              <Icon name="location" size={16} color={colors.navy} filled />
              <View style={styles.geoTextGroup}>
                <Text style={styles.geoTitle}>{locationName}</Text>
                <Text style={styles.geoSubtitle}>
                  {gpsCoords
                    ? `GPS: ${gpsCoords.latitude.toFixed(4)}° N, ${gpsCoords.longitude.toFixed(4)}° E • Verified Inside Geofence`
                    : "Live Campus Beacon Verified"}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <Button
              title={isClockedIn ? "Clock Out Now" : "Clock In Now"}
              variant={isClockedIn ? "secondary" : "primary"}
              size="lg"
              loading={loading}
              onPress={onPunch}
            />
            <Button
              title="Cancel"
              variant="ghost"
              size="md"
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingBottom: spacing.xl,
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  userCard: {
    backgroundColor: colors.slate50,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  avatarInitials: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.white,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  userRole: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.slate500,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  geoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  geoTextGroup: {
    flex: 1,
  },
  geoTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  geoSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
});
