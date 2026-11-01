import React from "react";
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts } from "../../theme/tokens";
import { Icon } from "../Icon";

export interface AvatarProps {
  name?: string;
  source?: string | null;
  uri?: string | null;
  size?: number;
  role?: string;
  badge?: "verified" | "online" | "pending";
  style?: StyleProp<ViewStyle>;
}

export function Avatar({
  name = "User",
  source,
  uri,
  size = 40,
  role,
  badge,
  style,
}: AvatarProps) {
  const imageSource = uri ?? source;
  const getInitials = (str: string): string => {
    if (!str) return "U";
    const parts = str.trim().split(" ");
    const first = parts[0]?.charAt(0) ?? "";
    const second = parts[1]?.charAt(0) ?? "";
    if (first && second) {
      return (first + second).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const getRoleBg = (r?: string): string => {
    switch (r) {
      case "owner":
      case "admin":
        return colors.navy;
      case "teacher":
        return colors.indigo;
      case "parent":
        return colors.greenDark;
      case "finance":
        return colors.orange;
      default:
        return colors.slate700;
    }
  };

  const initials = getInitials(name);
  const bgColor = getRoleBg(role);
  const fontSize = Math.max(10, Math.floor(size * 0.38));

  return (
    <View style={[{ width: size, height: size }, style]}>
      {imageSource ? (
        <Image
          source={{ uri: imageSource }}
          style={[
            styles.avatarImg,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallbackWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
            },
          ]}
        >
          <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
        </View>
      )}

      {badge === "verified" ? (
        <View style={[styles.badgeWrap, { bottom: -1, right: -1 }]}>
          <Icon name="verify" size={Math.max(12, size * 0.35)} color={colors.orange} filled />
        </View>
      ) : badge === "online" ? (
        <View style={[styles.statusDot, { bottom: 0, right: 0 }]} />
      ) : null}
    </View>
  );
}

export interface IdentityRowProps {
  name: string;
  subtitle?: string;
  meta?: string;
  avatarUrl?: string | null;
  role?: string;
  badgeText?: string;
  badgeTone?: "success" | "warning" | "danger" | "neutral" | "brand";
  rightAccessory?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function IdentityRow({
  name,
  subtitle,
  meta,
  avatarUrl,
  role,
  rightAccessory,
  onPress,
  style,
}: IdentityRowProps) {
  const content = (
    <View style={[styles.identityRow, style]}>
      <Avatar name={name} source={avatarUrl} size={44} role={role} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.nameText} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.metaText} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {rightAccessory ? <View style={styles.accessoryWrap}>{rightAccessory}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [pressed && { opacity: 0.8 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  avatarImg: {
    backgroundColor: colors.surfaceMuted,
  },
  fallbackWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontFamily: fonts.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  badgeWrap: {
    position: "absolute",
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  statusDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.greenDark,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  subtitleText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.indigoText,
  },
  accessoryWrap: {
    alignItems: "flex-end",
  },
});
