import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts } from "../../theme/tokens";

export interface TxtProps {
  children: React.ReactNode;
  tone?:
    | "display"
    | "hero"
    | "title"
    | "heading"
    | "subheading"
    | "body"
    | "label"
    | "caption"
    | "muted"
    | "amount"
    | "accent";
  inverse?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: "left" | "center" | "right";
  weight?: "regular" | "medium" | "semibold" | "semi" | "bold" | "extra";
  size?: "xs" | "sm" | "base" | "md" | "lg" | "xl" | number;
}

export function Txt({
  children,
  tone = "body",
  inverse = false,
  color,
  style,
  numberOfLines,
  align,
  weight,
  size,
}: TxtProps) {
  const fontStyle: TextStyle | undefined = weight
    ? {
        fontFamily:
          weight === "bold"
            ? fonts.bold
            : weight === "semi" || weight === "semibold"
            ? fonts.semibold
            : weight === "medium"
            ? fonts.medium
            : weight === "extra"
            ? fonts.extra
            : fonts.regular,
      }
    : undefined;

  const sizeStyle: TextStyle | undefined = size
    ? {
        fontSize:
          size === "xs"
            ? 11
            : size === "sm"
            ? 13
            : size === "base" || size === "md"
            ? 15
            : size === "lg"
            ? 18
            : size === "xl"
            ? 22
            : typeof size === "number"
            ? size
            : 14,
      }
    : undefined;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.text,
        styles[tone],
        fontStyle,
        sizeStyle,
        inverse && { color: colors.white },
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, subtitle, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeaderRow, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
    </View>
  );
}

export interface SectionProps {
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}

export function Section({
  title,
  subtitle,
  action,
  onPress,
}: SectionProps) {
  return (
    <View style={styles.sectionContainer}>
      <View style={{ gap: 2, flex: 1 }}>
        <Text style={styles.sectionTitleText}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitleText}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={styles.sectionActionBtn}
        >
          <Text style={styles.sectionActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.regular,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  display: {
    fontFamily: fonts.extra,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: colors.navy,
  },
  hero: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.navy,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.navy,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.navy,
  },
  subheading: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSecondary,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.muted,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  amount: {
    fontFamily: fonts.extra,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  accent: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.orange,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  sectionAction: {
    marginLeft: 8,
  },
  sectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  sectionTitleText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.navy,
  },
  sectionSubtitleText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  sectionActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sectionActionText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.orange,
  },
});
