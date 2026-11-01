import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Rect, Line, Text as SvgText, G } from "react-native-svg";
import { colors, fonts, radii, spacing, shadows } from "../../theme/tokens";
import { Badge, Button, Card, Screen } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { money, balance } from "../../domain/model";
import { useSchool } from "../../providers/AppProvider";
import {
  FinancialInsightsFilterSheet,
  InsightsFilterState,
} from "./components/FinancialInsightsFilterSheet";

const DEFAULT_FILTERS: InsightsFilterState = {
  preset: "30days",
  category: "all",
};

export function FinancialInsightsScreen() {
  const { data, school } = useSchool();
  const [filters, setFilters] = useState<InsightsFilterState>(DEFAULT_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Financial Aggregations based on filters
  const {
    totalInflows,
    totalOutflows,
    netSurplus,
    collectionEfficiency,
    paymentsInRange,
    dailyBars,
    totalBilled,
    totalCollected,
    totalOutstanding,
  } = useMemo(() => {
    const nowMs = Date.now();
    let rangeMs = 30 * 86400000;
    if (filters.preset === "7days") rangeMs = 7 * 86400000;
    else if (filters.preset === "30days") rangeMs = 30 * 86400000;
    else if (filters.preset === "90days") rangeMs = 90 * 86400000;
    else if (filters.preset === "term") rangeMs = 120 * 86400000;

    const inRange = data.payments.filter((p) => {
      const pTime = new Date(p.createdAt).getTime();
      const pDate = p.createdAt.slice(0, 10);

      if (filters.preset === "custom") {
        if (filters.customStartDate && pDate < filters.customStartDate) return false;
        if (filters.customEndDate && pDate > filters.customEndDate) return false;
        return true;
      }

      if (filters.category === "tuition" && p.type === "payout") return false;
      if (filters.category === "disbursement" && p.type !== "payout") return false;

      return nowMs - pTime <= rangeMs;
    });

    const inflows = inRange
      .filter((p) => p.state === "settled" && p.type !== "payout")
      .reduce((sum, p) => sum + p.amount, 0);

    const outflows = inRange
      .filter((p) => p.state === "settled" && p.type === "payout")
      .reduce((sum, p) => sum + p.amount, 0);

    const surplus = inflows - outflows;

    // School Term Total Invoiced vs Paid
    const billed = data.invoices.reduce(
      (sum, i) => sum + i.items.reduce((s, it) => s + it.amount, 0),
      0,
    );
    const collected = data.invoices.reduce((sum, i) => sum + i.paid, 0);
    const outstanding = data.invoices.reduce((sum, i) => sum + balance(i), 0);
    const efficiency = billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : 100;

    // Build 5-interval comparative bars for SVG Chart
    const intervals = 5;
    const intervalMs = (filters.preset === "custom" ? 30 * 86400000 : rangeMs) / intervals;
    const bars: Array<{ label: string; inflow: number; outflow: number }> = [];

    for (let i = intervals - 1; i >= 0; i--) {
      const endT = nowMs - i * intervalMs;
      const startT = endT - intervalMs;
      const bucketPayments = inRange.filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= startT && t < endT;
      });

      const bucketIn = bucketPayments
        .filter((p) => p.state === "settled" && p.type !== "payout")
        .reduce((s, p) => s + p.amount, 0);
      const bucketOut = bucketPayments
        .filter((p) => p.state === "settled" && p.type === "payout")
        .reduce((s, p) => s + p.amount, 0);

      const d = new Date(endT);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      bars.push({ label, inflow: bucketIn, outflow: bucketOut });
    }

    return {
      totalInflows: inflows,
      totalOutflows: outflows,
      netSurplus: surplus,
      collectionEfficiency: efficiency,
      paymentsInRange: inRange,
      dailyBars: bars,
      totalBilled: billed,
      totalCollected: collected,
      totalOutstanding: outstanding,
    };
  }, [data.payments, data.invoices, filters]);

  // SVG Chart Maximums
  const maxBarAmount = Math.max(
    ...dailyBars.map((b) => Math.max(b.inflow, b.outflow)),
    1000000,
  );

  return (
    <Screen
      title="Financial Insights"
      subtitle="Campus Cashflow & Settlement Analytics"
      back={() => (router.canGoBack() ? router.back() : router.replace("/wallet" as any))}
    >
      <View style={styles.content}>
        {/* Filter Trigger Bar */}
        <View style={styles.topFilterBar}>
          <View style={styles.activeHorizonWrap}>
            <Text style={styles.horizonLabel}>ACTIVE HORIZON</Text>
            <Text style={styles.horizonValue}>
              {filters.preset === "7days"
                ? "Past 7 Days"
                : filters.preset === "30days"
                ? "Past 30 Days"
                : filters.preset === "90days"
                ? "Past 90 Days"
                : filters.preset === "term"
                ? "Current Academic Term"
                : `${filters.customStartDate || "Start"} to ${filters.customEndDate || "End"}`}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter Horizon"
            onPress={() => setFilterSheetOpen(true)}
            style={styles.filterBtn}
          >
            <Icon name="filter" size={16} color={colors.navy} />
            <Text style={styles.filterBtnText}>Change Scope</Text>
          </Pressable>
        </View>

        {/* Executive Net Surplus Hero Card */}
        <View style={[styles.surplusHero, shadows.md]}>
          <View style={styles.surplusTopRow}>
            <Text style={styles.surplusLabel}>NET TREASURY SURPLUS</Text>
            <Badge
              text={netSurplus >= 0 ? "SURPLUS" : "DEFICIT"}
              tone={netSurplus >= 0 ? "success" : "danger"}
            />
          </View>
          <Text
            style={[
              styles.surplusAmount,
              netSurplus < 0 && { color: "#f87171" },
            ]}
          >
            {money(netSurplus)}
          </Text>
          <Text style={styles.surplusSub}>
            Reconciled collections minus operational expenditures in selected period
          </Text>
        </View>

        {/* Real SVG Bar Chart: Inflows vs Outflows */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Collections vs Disbursements</Text>
              <Text style={styles.chartSubtitle}>
                Comparative cashflow velocity per interval
              </Text>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#16a34a" }]} />
                <Text style={styles.legendText}>Inflows</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#e11d48" }]} />
                <Text style={styles.legendText}>Outflows</Text>
              </View>
            </View>
          </View>

          {/* SVG Bar Chart Visualization */}
          <View style={styles.svgContainer}>
            <Svg width="100%" height={160} viewBox="0 0 320 160">
              {/* Grid Lines */}
              <Line x1="20" y1="30" x2="300" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="20" y1="70" x2="300" y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="20" y1="110" x2="300" y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <Line x1="20" y1="130" x2="300" y2="130" stroke="#cbd5e1" strokeWidth="1" />

              {/* Bars */}
              {dailyBars.map((bar, i) => {
                const groupX = 35 + i * 54;
                const barWidth = 14;
                const chartHeight = 90;

                const inH = Math.max(4, (bar.inflow / maxBarAmount) * chartHeight);
                const outH = Math.max(4, (bar.outflow / maxBarAmount) * chartHeight);

                return (
                  <G key={bar.label}>
                    {/* Inflow Bar (Green) */}
                    <Rect
                      x={groupX}
                      y={130 - inH}
                      width={barWidth}
                      height={inH}
                      rx={3}
                      fill="#16a34a"
                    />
                    {/* Outflow Bar (Red) */}
                    <Rect
                      x={groupX + barWidth + 4}
                      y={130 - outH}
                      width={barWidth}
                      height={outH}
                      rx={3}
                      fill="#e11d48"
                    />
                    {/* Date Label */}
                    <SvgText
                      x={groupX + barWidth}
                      y={148}
                      fontSize={9}
                      fill="#64748b"
                      textAnchor="middle"
                      fontFamily={fonts.medium}
                    >
                      {bar.label}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* KPI Strip */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>Total Inflows</Text>
              <Text style={styles.kpiValInflow}>{money(totalInflows)}</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>Total Outflows</Text>
              <Text style={styles.kpiValOutflow}>{money(totalOutflows)}</Text>
            </View>
          </View>
        </Card>

        {/* Fee Recovery Donut Gauge Card */}
        <Card style={styles.gaugeCard}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeTitle}>Tuition Collection Efficiency</Text>
            <Badge text={`${collectionEfficiency}% RECOVERED`} tone="success" dot />
          </View>

          <View style={styles.gaugeContent}>
            {/* SVG Circular Gauge */}
            <View style={styles.gaugeSvgWrap}>
              <Svg width={110} height={110} viewBox="0 0 110 110">
                <Circle
                  cx="55"
                  cy="55"
                  r="44"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                  fill="none"
                />
                <Circle
                  cx="55"
                  cy="55"
                  r="44"
                  stroke={colors.orange}
                  strokeWidth="10"
                  strokeDasharray={`${(collectionEfficiency / 100) * 276.4} 276.4`}
                  strokeLinecap="round"
                  fill="none"
                  rotation="-90"
                  origin="55, 55"
                />
                <SvgText
                  x="55"
                  y="60"
                  fontSize={18}
                  fill={colors.navy}
                  textAnchor="middle"
                  fontFamily={fonts.extra}
                >
                  {collectionEfficiency}%
                </SvgText>
              </Svg>
            </View>

            <View style={styles.gaugeStats}>
              <View style={styles.gaugeStatRow}>
                <Text style={styles.gaugeStatLabel}>Total Invoiced Fees</Text>
                <Text style={styles.gaugeStatValue}>{money(totalBilled)}</Text>
              </View>
              <View style={styles.gaugeStatRow}>
                <Text style={styles.gaugeStatLabel}>Collected to Date</Text>
                <Text style={styles.gaugeStatValueGreen}>{money(totalCollected)}</Text>
              </View>
              <View style={styles.gaugeStatRow}>
                <Text style={styles.gaugeStatLabel}>Outstanding Arrears</Text>
                <Text style={styles.gaugeStatValueRed}>{money(totalOutstanding)}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Actionable Recommendations Card */}
        <Card style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>OPERATIONAL RECOMMENDATIONS</Text>
          <View style={styles.actionsList}>
            {totalOutstanding > 0 && (
              <Pressable
                style={styles.actionItem}
                onPress={() => router.push("/defaulters" as any)}
              >
                <View style={[styles.actionIconTile, { backgroundColor: colors.orangeLight }]}>
                  <Icon name="sms" size={18} color={colors.orange} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionItemTitle}>Disseminate Fee Reminders</Text>
                  <Text style={styles.actionItemDesc}>
                    {money(totalOutstanding)} uncollected across indebted students. Trigger automated notice circulars.
                  </Text>
                </View>
                <Icon name="forward" size={16} color={colors.slate400} />
              </Pressable>
            )}

            <Pressable
              style={styles.actionItem}
              onPress={() => router.push("/transaction-history" as any)}
            >
              <View style={[styles.actionIconTile, { backgroundColor: colors.slate100 }]}>
                <Icon name="receipt" size={18} color={colors.navy} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionItemTitle}>Audit Institutional Ledger</Text>
                <Text style={styles.actionItemDesc}>
                  Examine detailed NIP wire transfers, card transactions, and salary settlements.
                </Text>
              </View>
              <Icon name="forward" size={16} color={colors.slate400} />
            </Pressable>

            <Pressable
              style={styles.actionItem}
              onPress={() => router.push("/dedicated-account" as any)}
            >
              <View style={[styles.actionIconTile, { backgroundColor: colors.greenLight }]}>
                <Icon name="card" size={18} color={colors.greenDark} filled />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionItemTitle}>Configure Settlement Account</Text>
                <Text style={styles.actionItemDesc}>
                  Verify {school.name}&apos;s dedicated NUBAN destination for instant Paystack clearing.
                </Text>
              </View>
              <Icon name="forward" size={16} color={colors.slate400} />
            </Pressable>
          </View>
        </Card>
      </View>

      {/* Financial Insights Filter Sheet */}
      <FinancialInsightsFilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        onApply={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  topFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    ...shadows.sm,
  },
  activeHorizonWrap: {
    gap: 2,
  },
  horizonLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  horizonValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.slate100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  filterBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  surplusHero: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.navyBorder,
  },
  surplusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  surplusLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.5,
  },
  surplusAmount: {
    fontFamily: fonts.extra,
    fontSize: 32,
    color: "#ffffff",
    letterSpacing: 1,
    marginTop: 4,
  },
  surplusSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
  },
  chartCard: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radii.xl,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chartTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  chartSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate600,
  },
  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  kpiRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: spacing.sm,
  },
  kpiCol: {
    flex: 1,
    gap: 2,
  },
  kpiLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
  },
  kpiValInflow: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.greenDark,
  },
  kpiValOutflow: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.red,
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.slate200,
    marginHorizontal: spacing.sm,
  },
  gaugeCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    gap: spacing.md,
  },
  gaugeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gaugeTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  gaugeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  gaugeSvgWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeStats: {
    flex: 1,
    gap: 6,
  },
  gaugeStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gaugeStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate600,
  },
  gaugeStatValue: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  gaugeStatValueGreen: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.greenDark,
  },
  gaugeStatValueRed: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.red,
  },
  actionCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    gap: spacing.sm,
  },
  actionCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  actionsList: {
    gap: spacing.xs,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    gap: 12,
  },
  actionIconTile: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextCol: {
    flex: 1,
    gap: 2,
  },
  actionItemTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.navy,
  },
  actionItemDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 16,
  },
});
