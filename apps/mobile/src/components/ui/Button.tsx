import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radius } from "../../theme/tokens";
import { Icon, IconName } from "../Icon";

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "accent";
  secondary?: boolean;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName | string;
  iconPosition?: "left" | "right";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant,
  secondary,
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
  fullWidth = false,
  accessibilityLabel,
}: ButtonProps) {
  const resolvedVariant = variant ?? (secondary ? "secondary" : "primary");
  const chosenVariant = resolvedVariant === "accent" ? "primary" : resolvedVariant;
  const resolvedIcon = icon === "add-outline" ? "add" : (icon as IconName | undefined);

  const getVariantStyles = (): { btn: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (chosenVariant) {
      case "primary":
        return {
          btn: { backgroundColor: colors.navy, borderColor: colors.navy },
          text: { color: colors.white },
          iconColor: colors.white,
        };
      case "secondary":
        return {
          btn: { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
          text: { color: colors.navy },
          iconColor: colors.navy,
        };
      case "outline":
        return {
          btn: { backgroundColor: colors.card, borderColor: colors.border },
          text: { color: colors.navy },
          iconColor: colors.navy,
        };
      case "danger":
        return {
          btn: { backgroundColor: colors.red, borderColor: colors.red },
          text: { color: colors.white },
          iconColor: colors.white,
        };
      case "ghost":
        return {
          btn: { backgroundColor: "transparent", borderColor: "transparent", elevation: 0 },
          text: { color: colors.navy },
          iconColor: colors.navy,
        };
      default:
        return {
          btn: { backgroundColor: colors.navy, borderColor: colors.navy },
          text: { color: colors.white },
          iconColor: colors.white,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.baseButton,
        styles[`size_${size}`],
        vStyles.btn,
        fullWidth && { width: "100%" },
        disabled && styles.disabledButton,
        pressed && !disabled && !loading && styles.pressedButton,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={vStyles.text.color}
        />
      ) : (
        <View style={styles.contentRow}>
          {resolvedIcon && iconPosition === "left" ? (
            <Icon
              name={resolvedIcon}
              size={size === "sm" ? 16 : 18}
              color={vStyles.iconColor}
            />
          ) : null}
          <Text
            style={[
              styles.baseText,
              styles[`textSize_${size}`],
              vStyles.text,
              disabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {resolvedIcon && iconPosition === "right" ? (
            <Icon
              name={resolvedIcon}
              size={size === "sm" ? 16 : 18}
              color={vStyles.iconColor}
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "subtle" | "outline" | "ghost";
  color?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = "md",
  variant = "subtle",
  color,
  accessibilityLabel,
  disabled = false,
  style,
}: IconButtonProps) {
  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;
  const buttonDimension = size === "sm" ? 36 : size === "md" ? 44 : 52;

  const getBgStyle = (): ViewStyle => {
    switch (variant) {
      case "solid":
        return { backgroundColor: colors.navy };
      case "subtle":
        return { backgroundColor: colors.surfaceSubtle };
      case "outline":
        return { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
      case "ghost":
        return { backgroundColor: "transparent" };
    }
  };

  const defaultIconColor =
    variant === "solid" ? colors.white : color || colors.navy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButtonBase,
        {
          width: buttonDimension,
          height: buttonDimension,
          borderRadius: buttonDimension / 2,
        },
        getBgStyle(),
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.75 },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={defaultIconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44, // Touch target guideline
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  baseText: {
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  size_sm: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  size_md: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  size_lg: {
    height: 54,
    paddingHorizontal: 22,
    borderRadius: radius.lg,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  disabledText: {
    color: colors.muted,
  },
  pressedButton: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  iconButtonBase: {
    alignItems: "center",
    justifyContent: "center",
  },
});
