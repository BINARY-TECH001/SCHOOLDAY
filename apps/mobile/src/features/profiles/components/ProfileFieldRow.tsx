import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Icon, IconName } from "../../../components/Icon";

export interface ProfileFieldRowProps {
  label: string;
  value?: string | number | null;
  icon?: IconName;
  copyable?: boolean;
  isProtected?: boolean;
  isLast?: boolean;
}

export function ProfileFieldRow({
  label,
  value,
  icon,
  copyable = false,
  isProtected = false,
  isLast = false,
}: ProfileFieldRowProps) {
  const displayValue = isProtected ? "Protected Record" : value || "Not specified";

  const handleCopy = async () => {
    if (!value || isProtected) return;
    try {
      await Clipboard.setStringAsync(String(value));
      toast.success(`${label} copied to clipboard!`);
    } catch {
      // Ignored
    }
  };

  return (
    <View style={[styles.container, !isLast && styles.borderBottom]}>
      {icon ? (
        <View style={styles.iconBox}>
          <Icon name={icon} size={16} color={colors.navy} />
        </View>
      ) : null}

      <View style={styles.textGroup}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[
            styles.value,
            isProtected && styles.valueProtected,
            !value && !isProtected && styles.valueEmpty,
          ]}
          numberOfLines={2}
        >
          {displayValue}
        </Text>
      </View>

      {copyable && value && !isProtected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy ${label}`}
          onPress={handleCopy}
          hitSlop={8}
          style={styles.copyBtn}
        >
          <Icon name="document" size={14} color={colors.muted} />
        </Pressable>
      ) : null}

      {isProtected ? (
        <View style={styles.protectedBadge}>
          <Icon name="lock" size={11} color={colors.slate500} />
          <Text style={styles.protectedText}>Restricted</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },
  value: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  valueProtected: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontStyle: "italic",
  },
  valueEmpty: {
    color: colors.muted,
    fontStyle: "italic",
  },
  copyBtn: {
    padding: 6,
  },
  protectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.slate100,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radii.xs,
  },
  protectedText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.slate600,
  },
});
