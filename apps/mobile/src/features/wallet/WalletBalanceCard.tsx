import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radii, shadows, spacing } from "../../theme/tokens";
import { Icon } from "../../components/Icon";
import { money } from "../../domain/model";

export interface WalletBalanceCardProps {
  isParent: boolean;
  isOwnerOrFinance: boolean;
  availableBalanceKobo: number;
  totalCollectedKobo: number;
  totalDisbursedKobo: number;
  parentTotalDueKobo: number;
  parentTotalPaidKobo: number;
  visible: boolean;
  onToggleVisible: () => void;
}

export function WalletBalanceCard({
  isParent,
  isOwnerOrFinance,
  availableBalanceKobo,
  totalCollectedKobo,
  totalDisbursedKobo,
  parentTotalDueKobo,
  parentTotalPaidKobo,
  visible,
  onToggleVisible,
}: WalletBalanceCardProps) {
  const displayAmount = isParent ? parentTotalDueKobo : availableBalanceKobo;

  return (
    <View style={[styles.card, shadows.md]}>
      {/* Top Header Row with Eye Icon */}
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Icon
              name="wallet"
              size={15}
              color={colors.orange}
              filled
            />
          </View>
          <Text style={styles.headerLabel}>
            {isParent
              ? "OUTSTANDING TUITION BALANCE"
              : isOwnerOrFinance
              ? "INSTITUTIONAL TREASURY BALANCE"
              : "CAMPUS SETTLEMENT LEDGER"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide balance" : "Show balance"}
          onPress={onToggleVisible}
          hitSlop={8}
          style={styles.eyeBtn}
        >
          <Icon
            name={visible ? "eye" : "eyeSlash"}
            size={18}
            color="rgba(255, 255, 255, 0.75)"
          />
        </Pressable>
      </View>

      {/* Main Balance Display */}
      <View style={styles.balanceGroup}>
        <Text style={styles.balanceText} numberOfLines={1}>
          {visible ? money(displayAmount) : "₦••••••••"}
        </Text>
      </View>

      {/* Subtle Bottom Stats Strip */}
      <View style={styles.statsStrip}>
        {isParent ? (
          <>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Settled</Text>
              <Text style={styles.statValue}>
                {visible ? money(parentTotalPaidKobo) : "₦••••"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Pending Clearance</Text>
              <Text
                style={[
                  styles.statValue,
                  parentTotalDueKobo > 0 && { color: colors.orangeBright },
                ]}
              >
                {visible ? money(parentTotalDueKobo) : "₦••••"}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Session Collections</Text>
              <Text style={styles.statValue}>
                {visible ? money(totalCollectedKobo) : "₦••••"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Disbursed</Text>
              <Text style={styles.statValue}>
                {visible ? money(totalDisbursedKobo) : "₦••••"}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.navyBorder,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: radii.xs,
    backgroundColor: "rgba(255, 102, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: "rgba(255, 255, 255, 0.7)",
  },
  eyeBtn: {
    padding: 4,
  },
  balanceGroup: {
    marginVertical: 4,
  },
  balanceText: {
    fontFamily: fonts.extra,
    fontSize: 32,
    lineHeight: 38,
    color: "#ffffff",
    letterSpacing: -0.6,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statCol: {
    flex: 1,
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 10,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.65)",
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: "#ffffff",
  },
});
