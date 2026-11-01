import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "./ui";

export function HomeSkeleton() {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.root}>
      {/* Top Bar Skeleton */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={{ gap: 6 }}>
          <Animated.View
            style={[styles.box, { width: 140, height: 22, opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.box, { width: 100, height: 12, opacity: pulseAnim }]}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Animated.View
            style={[
              styles.box,
              { width: 38, height: 38, borderRadius: 12, opacity: pulseAnim },
            ]}
          />
          <Animated.View
            style={[
              styles.box,
              { width: 38, height: 38, borderRadius: 12, opacity: pulseAnim },
            ]}
          />
          <Animated.View
            style={[
              styles.box,
              { width: 38, height: 38, borderRadius: 12, opacity: pulseAnim },
            ]}
          />
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Banner Card Skeleton */}
        <Animated.View
          style={[styles.bannerSkeleton, { opacity: pulseAnim }]}
        />

        {/* Setup Guide Banner Skeleton */}
        <Animated.View
          style={[styles.setupCardSkeleton, { opacity: pulseAnim }]}
        />

        {/* Metric Cards Grid */}
        <View style={styles.metricGrid}>
          <Animated.View
            style={[styles.metricCard, { opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.metricCard, { opacity: pulseAnim }]}
          />
        </View>

        {/* Action Bar Pills */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <Animated.View
            style={[styles.box, { width: 120, height: 12, opacity: pulseAnim }]}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[1, 2, 3].map((k) => (
              <Animated.View
                key={k}
                style={[styles.chipSkeleton, { opacity: pulseAnim }]}
              />
            ))}
          </View>
        </View>

        {/* Operations Card Skeleton */}
        <Animated.View
          style={[styles.cardLargeSkeleton, { opacity: pulseAnim }]}
        />

        {/* Noticeboard Card Skeleton */}
        <Animated.View
          style={[styles.noticeSkeleton, { opacity: pulseAnim }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 16,
  },
  box: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
  },
  bannerSkeleton: {
    height: 145,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
  },
  setupCardSkeleton: {
    height: 96,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    height: 90,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  chipSkeleton: {
    width: 120,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  cardLargeSkeleton: {
    height: 140,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  noticeSkeleton: {
    height: 110,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
});
