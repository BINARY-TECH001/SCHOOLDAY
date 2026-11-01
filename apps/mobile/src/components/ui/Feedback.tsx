import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { Icon, IconName } from "../Icon";
import { Button } from "./Button";
import { Txt } from "./Typography";

export interface EmptyStateProps {
  title: string;
  detail?: string;
  subtitle?: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard empty state component with high-contrast icon tile, clear typography,
 * and optional call-to-action buttons.
 */
export function EmptyState({
  title,
  detail,
  subtitle,
  actionText,
  actionLabel,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  icon = "document",
  style,
}: EmptyStateProps) {
  const primaryText = actionLabel ?? actionText;
  const description = detail ?? subtitle;

  return (
    <View style={[styles.emptyContainer, style]}>
      <View style={styles.emptyIconTile}>
        <Icon name={icon} size={26} color={colors.navy} />
      </View>
      <View style={styles.emptyTextGroup}>
        <Txt tone="heading" align="center">
          {title}
        </Txt>
        {description ? (
          <Txt tone="muted" align="center" style={styles.emptySubtitle}>
            {description}
          </Txt>
        ) : null}
      </View>
      {primaryText && onAction ? (
        <View style={styles.emptyActions}>
          <Button
            title={primaryText}
            size="sm"
            onPress={onAction}
            variant="primary"
          />
          {secondaryActionText && onSecondaryAction ? (
            <Button
              title={secondaryActionText}
              size="sm"
              onPress={onSecondaryAction}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Backward compatibility alias */
export const Empty = EmptyState;

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/**
 * Accessible error state presentation with retry action.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try Again",
  icon = "info",
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.errorContainer, style]} accessibilityRole="alert">
      <View style={styles.errorIconTile}>
        <Icon name={icon} size={24} color={colors.danger} />
      </View>
      <View style={styles.emptyTextGroup}>
        <Txt tone="heading" align="center" style={{ color: colors.navy }}>
          {title}
        </Txt>
        <Txt tone="muted" align="center" style={styles.emptySubtitle}>
          {message}
        </Txt>
      </View>
      {onRetry ? (
        <View style={styles.emptyActions}>
          <Button
            title={retryLabel}
            size="sm"
            onPress={onRetry}
            variant="secondary"
          />
        </View>
      ) : null}
    </View>
  );
}

export interface LoadingIndicatorProps {
  message?: string;
  size?: "small" | "large";
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard loading indicator with brand color and optional status message.
 */
export function LoadingIndicator({
  message,
  size = "small",
  fullScreen = false,
  style,
}: LoadingIndicatorProps) {
  return (
    <View
      style={[
        styles.loadingContainer,
        fullScreen && styles.loadingFullScreen,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? "Loading"}
    >
      <ActivityIndicator size={size} color={colors.navy} />
      {message ? (
        <Text style={styles.loadingMessage}>{message}</Text>
      ) : null}
    </View>
  );
}

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Subtle pulsating skeleton box for content placeholders.
 */
export function SkeletonBox({
  width = "100%",
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Composite skeleton placeholder mimicking a standard card.
 */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.skeletonCard, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <SkeletonBox width={40} height={40} borderRadius={radii.full} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width="60%" height={14} />
          <SkeletonBox width="40%" height={12} />
        </View>
      </View>
      <SkeletonBox width="90%" height={12} style={{ marginTop: 12 }} />
      <SkeletonBox width="75%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    minHeight: 200,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTextGroup: {
    alignItems: "center",
    gap: 4,
    maxWidth: 320,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  emptyActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorIconTile: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingFullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    zIndex: 999,
  },
  loadingMessage: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  skeletonBase: {
    backgroundColor: colors.slate200,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
