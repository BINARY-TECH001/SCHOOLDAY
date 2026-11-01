import React from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { useApp } from "../../providers/AppProvider";
import { Icon, IconName } from "../Icon";
import { Txt } from "./Typography";

export interface HeaderAction {
  label: string;
  icon?: IconName;
  onPress: () => void;
}

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  back?: () => void;
  headerAction?: HeaderAction;
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  headerAction,
}: ScreenHeaderProps) {
  if (!title && !back && !headerAction) return null;

  return (
    <View style={styles.headerBlock}>
      <View style={styles.headerNavRow}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={back}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Icon name="back" size={20} color={colors.navy} />
          </Pressable>
        ) : null}

        <View style={styles.inlineTitleGroup}>
          {title ? (
            <Text style={styles.inlineTitleText} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.inlineSubtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {headerAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={headerAction.onPress}
            style={({ pressed }) => [
              styles.headerActionPill,
              pressed && { opacity: 0.8 },
            ]}
          >
            {headerAction.icon ? (
              <Icon name={headerAction.icon} size={15} color={colors.navy} />
            ) : null}
            <Text style={styles.headerActionPillText}>{headerAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  coverPhoto?: string;
  children: React.ReactNode;
  back?: () => void;
  headerAction?: HeaderAction;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard Screen component with safe-area handling, keyboard avoidance,
 * consistent header and feedback/busy overlays.
 */
export function Screen({
  title,
  subtitle,
  coverPhoto,
  children,
  back,
  headerAction,
  scrollable = true,
  contentContainerStyle,
  style,
}: ScreenProps) {
  const { feedback, busy, setFeedback } = useApp();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, style]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scrollable ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.pageContent, contentContainerStyle]}
          >
            {coverPhoto ? (
              <View style={styles.heroCoverContainer}>
                <Image source={{ uri: coverPhoto }} style={styles.heroCoverImage} />
                <View style={styles.heroCoverOverlay} />
              </View>
            ) : null}

            <ScreenHeader
              title={title}
              subtitle={subtitle}
              back={back}
              headerAction={headerAction}
            />

            {feedback !== "" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss message"
                onPress={() => setFeedback("")}
                accessibilityLiveRegion="polite"
                style={styles.feedbackBanner}
              >
                <View style={styles.feedbackDot} />
                <View style={{ flex: 1 }}>
                  <Txt tone="muted">{feedback}</Txt>
                </View>
                <Icon name="close" size={16} color={colors.muted} />
              </Pressable>
            ) : null}

            {busy ? (
              <View style={styles.busyOverlay}>
                <ActivityIndicator
                  accessibilityLabel="Processing"
                  size="large"
                  color={colors.orange}
                />
                <Text style={styles.busyText}>Processing update…</Text>
              </View>
            ) : null}

            {children}
          </ScrollView>
        ) : (
          <View style={[styles.pageFixed, contentContainerStyle]}>
            <ScreenHeader
              title={title}
              subtitle={subtitle}
              back={back}
              headerAction={headerAction}
            />
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ScreenContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardContainer: {
    flex: 1,
  },
  pageContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 140,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  pageFixed: {
    flex: 1,
    padding: spacing.md,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBlock: {
    marginBottom: spacing.xs,
  },
  headerNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    gap: 12,
  },
  inlineTitleGroup: {
    flex: 1,
    justifyContent: "center",
    gap: 1,
  },
  inlineTitleText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  inlineSubtitleText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionPillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  heroCoverContainer: {
    width: "100%",
    height: 140,
    borderRadius: radii.lg,
    overflow: "hidden",
    position: "relative",
    marginBottom: spacing.xs,
  },
  heroCoverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroCoverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20, 33, 61, 0.25)",
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
  },
  busyOverlay: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.xs,
  },
  busyText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
  },
});
