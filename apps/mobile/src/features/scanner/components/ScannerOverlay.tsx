import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radii } from "../../../theme/tokens";
import { Icon } from "../../../components/Icon";
import { ScanMode } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEWFINDER_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

export interface ScannerOverlayProps {
  mode: ScanMode;
  locationName: string;
}

export function ScannerOverlay({ mode, locationName }: ScannerOverlayProps) {
  const [scanAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, VIEWFINDER_SIZE - 4],
  });

  return (
    <View style={styles.container}>
      {/* Viewfinder frame */}
      <View style={styles.viewfinder}>
        {/* Reticle corner marks in SchoolDay Navy & Orange */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Laser beam */}
        <Animated.View
          style={[
            styles.laser,
            { transform: [{ translateY: laserTranslateY }] },
          ]}
        />

        {/* Center Guidance Silhouette */}
        <View style={styles.centerTarget}>
          <Icon
            name={mode === "attendance" ? "camera" : "document"}
            size={48}
            color="rgba(255, 255, 255, 0.35)"
          />
          <Text style={styles.targetHint}>
            {mode === "attendance"
              ? "Position face within frame"
              : mode === "badges"
              ? "Point at ID Card QR code"
              : mode === "receipts"
              ? "Align voucher barcode"
              : "Align QR or Barcode"}
          </Text>
        </View>
      </View>

      {/* Telemetry info */}
      <View style={styles.telemetryBar}>
        <View style={styles.telemetryItem}>
          <View style={styles.pulseDot} />
          <Text style={styles.telemetryText}>LIVE GEOFENCE VERIFIED</Text>
        </View>
        <Text style={styles.telemetryDivider}>•</Text>
        <Text style={styles.telemetryText} numberOfLines={1}>
          {locationName}
        </Text>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    position: "relative",
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.orange,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: radii.sm,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: radii.sm,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: radii.sm,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: radii.sm,
  },
  laser: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    zIndex: 10,
  },
  centerTarget: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  targetHint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.75)",
    textAlign: "center",
  },
  telemetryBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  telemetryItem: {
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
  telemetryDivider: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10,
  },
  telemetryText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: "rgba(255, 255, 255, 0.8)",
  },
});
