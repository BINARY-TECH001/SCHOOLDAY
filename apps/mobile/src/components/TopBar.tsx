import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, fonts, radii } from "../theme/tokens";
import { Icon, IconName } from "./Icon";

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  back?: boolean | (() => void);
  onBack?: () => void;
  backIcon?: IconName;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  transparent?: boolean;
  border?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Universal Inline TopBar:
 * [Back Icon]  Screen Title                          [Optional Action]
 * Vertically aligned, compact height, respecting safe areas.
 */
export function TopBar({
  title,
  subtitle,
  back = true,
  onBack,
  backIcon = "back",
  rightAction,
  children,
  transparent = false,
  border = true,
  style,
}: TopBarProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof back === "function") {
      back();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/home" as any);
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10),
          backgroundColor: transparent ? "transparent" : colors.surface,
          borderBottomWidth: border && !transparent ? 1 : 0,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {/* Inline Left Group: Back Button + Screen Title */}
        <View style={styles.leftGroup}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backIcon === "close" ? "Close screen" : "Go back"}
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={8}
            >
              <Icon name={backIcon} size={20} color={colors.navy} />
            </Pressable>
          ) : null}

          {/* Title and optional contextual subtitle */}
          <View style={styles.titleContainer}>
            {children ? (
              children
            ) : (
              <>
                {title ? (
                  <Text style={styles.titleText} numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text style={styles.subtitleText} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* Right Side: Action pill, filter button, or menu */}
        {rightAction ? (
          <View style={styles.rightContainer}>{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderColor: colors.border,
    zIndex: 50,
  },
  contentRow: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  leftGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 1,
  },
  titleText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
});
