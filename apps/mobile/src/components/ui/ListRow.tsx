import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts } from "../../theme/tokens";
import { Icon, IconName } from "../Icon";
import { Badge } from "./Badge";
import { Avatar } from "./Avatar";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: IconName;
  iconColor?: string;
  avatarNode?: React.ReactNode;
  avatarUri?: string;
  rightNode?: React.ReactNode;
  trailing?: string;
  badge?: string;
  badgeText?: string;
  badgeTone?: "success" | "warning" | "danger" | "neutral" | "brand" | "purple";
  chevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  destructive?: boolean;
}

export function ListItem({
  title,
  subtitle,
  meta,
  icon,
  iconColor = colors.navy,
  avatarNode,
  avatarUri,
  rightNode,
  trailing,
  badge,
  badgeText,
  badgeTone = "neutral",
  chevron = true,
  onPress,
  style,
  destructive = false,
}: ListItemProps) {
  const displayBadge = badge ?? badgeText;
  const resolvedBadgeTone = badgeTone === "purple" ? "brand" : badgeTone;

  const content = (
    <View style={[styles.listItemRow, style]}>
      {avatarNode ? (
        avatarNode
      ) : avatarUri ? (
        <Avatar uri={avatarUri} name={title} size={40} />
      ) : icon ? (
        <View style={[styles.iconBox, destructive && { backgroundColor: colors.redLight }]}>
          <Icon name={icon} size={18} color={destructive ? colors.red : iconColor} />
        </View>
      ) : null}

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={[styles.title, destructive && { color: colors.red }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {displayBadge ? (
            <Badge text={displayBadge} tone={resolvedBadgeTone} size="sm" />
          ) : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      {trailing ? <Text style={styles.trailingText}>{trailing}</Text> : null}

      {rightNode ? <View style={styles.rightWrap}>{rightNode}</View> : null}

      {chevron && onPress ? (
        <Icon name="chevron" size={16} color={colors.muted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export interface RowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  align?: "center" | "flex-start" | "flex-end";
  justify?: "space-between" | "flex-start" | "flex-end" | "center";
  gap?: number;
}

export function Row({
  children,
  style,
  align = "center",
  justify = "space-between",
  gap = 8,
}: RowProps) {
  return (
    <View
      style={[
        styles.rowBase,
        { alignItems: align, justifyContent: justify, gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface SeparatorProps {
  style?: StyleProp<ViewStyle>;
  inset?: number;
}

export function Separator({ style, inset = 0 }: SeparatorProps) {
  return (
    <View
      style={[
        styles.separator,
        inset > 0 && { marginLeft: inset },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.faint,
  },
  trailingText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  rightWrap: {
    alignItems: "flex-end",
  },
  pressed: {
    opacity: 0.72,
  },
  rowBase: {
    flexDirection: "row",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
