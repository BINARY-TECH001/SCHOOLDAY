import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radius, shadows } from "../../theme/tokens";
import { Icon, IconName } from "../Icon";

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "elevated" | "flat" | "outlined" | "accent" | "dark";
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  padding = "md",
  variant = "outlined",
  onPress,
  accessibilityLabel,
}: CardProps) {
  const paddingStyle =
    padding === "none"
      ? { padding: 0 }
      : padding === "sm"
      ? { padding: 12 }
      : padding === "lg"
      ? { padding: 22 }
      : { padding: 16 };

  const variantStyle: ViewStyle =
    variant === "flat"
      ? { backgroundColor: colors.surfaceSubtle, borderWidth: 0 }
      : variant === "elevated"
      ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm }
      : variant === "accent"
      ? { backgroundColor: colors.orangeLight, borderWidth: 1, borderColor: "#fed7aa" }
      : variant === "dark"
      ? { backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.navyBorder }
      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          styles.baseCard,
          paddingStyle,
          variantStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.baseCard, paddingStyle, variantStyle, style]}>
      {children}
    </View>
  );
}

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: IconName;
  iconColor?: string;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  iconColor = colors.navy,
  trend,
  trendTone = "neutral",
  style,
  onPress,
}: StatCardProps) {
  const trendColor =
    trendTone === "positive"
      ? colors.greenDark
      : trendTone === "negative"
      ? colors.redDark
      : colors.muted;

  const content = (
    <View style={{ gap: 6 }}>
      <View style={styles.statHeaderRow}>
        <Text style={styles.statLabel}>{label}</Text>
        {icon ? (
          <View style={styles.statIconWrap}>
            <Icon name={icon} size={16} color={iconColor} />
          </View>
        ) : null}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {hint || trend ? (
        <View style={styles.statFooterRow}>
          {trend ? (
            <Text style={[styles.statTrend, { color: trendColor }]}>
              {trend}
            </Text>
          ) : null}
          {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Card style={style} onPress={onPress}>
      {content}
    </Card>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.88,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.muted,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: fonts.extra,
    fontSize: 22,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  statFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  statTrend: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  statHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
});
