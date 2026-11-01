import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Clean, accessible segmented control bar for filtering views and switching tabs.
 */
export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.container, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.label}${
              opt.count !== undefined ? `, ${opt.count} items` : ""
            }`}
            onPress={() => onSelect(opt.key)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {opt.label}
            </Text>
            {opt.count !== undefined ? (
              <View
                style={[
                  styles.countBadge,
                  active && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    active && styles.countTextActive,
                  ]}
                >
                  {opt.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    gap: 6,
    minHeight: 36,
  },
  itemActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  textActive: {
    fontFamily: fonts.semibold,
    color: colors.navy,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeActive: {
    backgroundColor: colors.navy,
  },
  countText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.slate600,
  },
  countTextActive: {
    color: "#ffffff",
  },
});
