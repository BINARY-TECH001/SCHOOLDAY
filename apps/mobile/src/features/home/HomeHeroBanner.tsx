import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Icon } from "../../components/Icon";
import { roleLabels } from "../Entry";
import { Role } from "../../domain/model";

export interface HomeHeroBannerProps {
  schoolName: string;
  shortName?: string;
  motto?: string;
  coverPhoto?: string;
  openTime?: string;
  closeTime?: string;
  activeRole: Role;
  dateFormatted: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function HomeHeroBanner({
  schoolName,
  shortName,
  motto,
  coverPhoto,
  openTime = "07:30",
  closeTime = "15:30",
  activeRole,
  dateFormatted,
  logo,
  primaryColor,
  secondaryColor,
}: HomeHeroBannerProps) {
  const isOwnerOrAdmin = activeRole === "owner" || activeRole === "admin";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Campus details for ${schoolName}`}
      onPress={() => (isOwnerOrAdmin ? router.push("/more") : router.push("/calendar" as any))}
      style={[
        styles.container,
        primaryColor ? { backgroundColor: primaryColor } : null,
        shadows.sm,
      ]}
    >
      <Image
        source={{
          uri:
            coverPhoto ||
            "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
        }}
        style={styles.bannerImage}
      />
      <View style={styles.bannerOverlay} />

      <View style={styles.bannerContent}>
        {/* Top Badges Row */}
        <View style={styles.topRow}>
          <View style={[styles.schoolPill, primaryColor ? { backgroundColor: "rgba(0,0,0,0.4)" } : null]}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.schoolMiniLogo} resizeMode="contain" />
            ) : (
              <Icon name="school" size={13} color="#ffffff" filled />
            )}
            <Text style={styles.schoolPillText}>
              {shortName || "CAMPUS"}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch active workspace role"
            onPress={() => router.push("/account")}
            style={styles.roleSwitcherPill}
          >
            <Text style={styles.roleSwitcherText}>
              {roleLabels[activeRole] || activeRole}
            </Text>
            <Icon name="chevron" size={12} color="#ffffff" />
          </Pressable>
        </View>

        {/* School Name & Motto */}
        <View style={styles.titleGroup}>
          <Text style={styles.schoolTitle} numberOfLines={1}>
            {schoolName}
          </Text>
          <Text style={styles.schoolMotto} numberOfLines={1}>
            {motto || "Knowledge, Character & Leadership"}
          </Text>
        </View>

        {/* Bottom Status & Date Row */}
        <View style={styles.bottomRow}>
          <View style={styles.statusIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>
              Open · {openTime} – {closeTime}
            </Text>
          </View>
          <Text style={styles.dateText}>{dateFormatted}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 154,
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.navy,
  },
  bannerImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20, 33, 61, 0.78)",
  },
  bannerContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  schoolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
  },
  schoolMiniLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  schoolPillText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  roleSwitcherPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  roleSwitcherText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: "#ffffff",
  },
  titleGroup: {
    gap: 2,
  },
  schoolTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  schoolMotto: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
  },
  dateText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
});
