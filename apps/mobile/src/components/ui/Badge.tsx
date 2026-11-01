import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radius } from "../../theme/tokens";
import { Icon, IconName } from "../Icon";

export interface BadgeProps {
  text: string;
  tone?: "success" | "warning" | "danger" | "purple" | "blue" | "neutral" | "brand" | "info" | "dark";
  variant?: "success" | "warning" | "danger" | "purple" | "blue" | "neutral" | "brand" | "info" | "dark";
  dot?: boolean;
  icon?: IconName;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  text,
  tone,
  variant,
  dot = false,
  icon,
  size = "sm",
  style,
}: BadgeProps) {
  const activeTone = tone || variant || "neutral";
  const getToneStyles = (): { bg: string; text: string; dot: string } => {
    switch (activeTone) {
      case "success":
        return { bg: colors.greenLight, text: colors.greenText, dot: colors.greenDark };
      case "warning":
        return { bg: colors.amberLight, text: colors.amberText, dot: colors.amberDark };
      case "danger":
        return { bg: colors.redLight, text: colors.redText, dot: colors.redDark };
      case "purple":
        return { bg: colors.purpleLight, text: colors.purpleText, dot: colors.purpleDark };
      case "blue":
      case "info":
        return { bg: colors.blueLight, text: colors.blueText, dot: colors.blueText };
      case "brand":
        return { bg: colors.orangeLight, text: colors.orange, dot: colors.orange };
      case "dark":
        return { bg: colors.navy, text: "#ffffff", dot: colors.orange };
      case "neutral":
      default:
        return { bg: colors.surfaceSubtle, text: colors.slate700, dot: colors.muted };
    }
  };

  const t = getToneStyles();
  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.badgeContainer,
        { backgroundColor: t.bg },
        isSm ? styles.size_sm : styles.size_md,
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: t.dot }]} /> : null}
      {icon ? <Icon name={icon} size={isSm ? 11 : 13} color={t.text} /> : null}
      <Text
        style={[
          styles.badgeText,
          { color: t.text },
          isSm ? styles.text_sm : styles.text_md,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

export function StatusDot({
  status = "online",
  size = 8,
}: {
  status?: "online" | "warning" | "offline";
  size?: number;
}) {
  const color =
    status === "online"
      ? colors.greenDark
      : status === "warning"
      ? colors.amberDark
      : colors.muted;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );
}

export function OfflineIndicator({
  message = "Offline Mode · Local device persistence active",
  style,
}: {
  message?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Badge
      text={message}
      tone="warning"
      dot
      size="md"
      style={[{ alignSelf: "flex-start" }, style]}
    />
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
  size_sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  size_md: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 11,
  },
});
