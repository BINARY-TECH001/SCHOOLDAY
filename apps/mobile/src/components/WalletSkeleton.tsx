import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "./ui";

export function WalletSkeleton() {
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
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={{ gap: 6 }}>
          <Animated.View
            style={[styles.box, { width: 150, height: 22, opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.box, { width: 110, height: 12, opacity: pulseAnim }]}
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
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Big Fintech Balance Card Skeleton */}
        <Animated.View
          style={[styles.balanceCardSkeleton, { opacity: pulseAnim }]}
        />

        {/* Action Pills Row */}
        <View style={{ flexDirection: "row", gap: 10, marginVertical: 4 }}>
          {[1, 2, 3, 4].map((k) => (
            <Animated.View
              key={k}
              style={[styles.actionBtnSkeleton, { opacity: pulseAnim }]}
            />
          ))}
        </View>

        {/* Dedicated Bank Account Card Skeleton */}
        <Animated.View
          style={[styles.accountCardSkeleton, { opacity: pulseAnim }]}
        />

        {/* Search & Filter Bar */}
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Animated.View
            style={[styles.searchSkeleton, { opacity: pulseAnim }]}
          />
          <Animated.View
            style={[
              styles.box,
              { width: 44, height: 44, borderRadius: 12, opacity: pulseAnim },
            ]}
          />
        </View>

        {/* Transaction History Items */}
        <View style={{ gap: 10, marginTop: 4 }}>
          {[1, 2, 3, 4].map((k) => (
            <Animated.View
              key={k}
              style={[styles.transactionItemSkeleton, { opacity: pulseAnim }]}
            />
          ))}
        </View>
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
    gap: 14,
  },
  box: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
  },
  balanceCardSkeleton: {
    height: 160,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
  },
  actionBtnSkeleton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  accountCardSkeleton: {
    height: 110,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  searchSkeleton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  transactionItemSkeleton: {
    height: 68,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
});
