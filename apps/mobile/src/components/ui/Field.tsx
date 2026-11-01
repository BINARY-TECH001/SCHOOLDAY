import React, { useState } from "react";
import {
  KeyboardTypeOptions,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radius } from "../../theme/tokens";
import { Icon, IconName } from "../Icon";

export interface FieldProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  icon?: IconName;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  numeric?: boolean;
  email?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  hint?: string;
  helper?: string;
  editable?: boolean;
  clearable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Field({
  label,
  value = "",
  onChangeText,
  placeholder,
  icon,
  secureTextEntry = false,
  keyboardType = "default",
  numeric = false,
  email = false,
  autoCapitalize = "none",
  error,
  hint,
  helper,
  editable = true,
  clearable = false,
  multiline = false,
  numberOfLines = 1,
  rightElement,
  children,
  style,
  inputStyle,
}: FieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const resolvedKeyboardType = numeric
    ? "numeric"
    : email
    ? "email-address"
    : keyboardType;
  const resolvedAutoCapitalize = email ? "none" : autoCapitalize;
  const resolvedHint = hint ?? helper;

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {children ? (
        children
      ) : (

      <View
        style={[
          styles.inputWrap,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
          multiline && { minHeight: 80, alignItems: "flex-start", paddingTop: 10 },
        ]}
      >
        {icon ? (
          <View style={styles.leftIcon}>
            <Icon
              name={icon}
              size={18}
              color={isFocused ? colors.orange : colors.muted}
            />
          </View>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={resolvedKeyboardType}
          autoCapitalize={resolvedAutoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.textInput,
            !editable && { color: colors.muted },
            inputStyle,
          ]}
        />

        {clearable && value.length > 0 && editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear text"
            onPress={() => onChangeText?.("")}
            hitSlop={8}
            style={styles.rightAction}
          >
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        ) : null}

        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
            onPress={() => setIsPasswordVisible((v) => !v)}
            hitSlop={8}
            style={styles.rightAction}
          >
            <Icon
              name={isPasswordVisible ? "eyeSlash" : "eye"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
        ) : null}

        {rightElement ? <View style={styles.rightAction}>{rightElement}</View> : null}
      </View>
      )}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : resolvedHint ? (
        <Text style={styles.hintText}>{resolvedHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputFocused: {
    borderColor: colors.orange,
    backgroundColor: colors.card,
  },
  inputError: {
    borderColor: colors.red,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
  },
  leftIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 10,
  },
  rightAction: {
    padding: 4,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.red,
    marginTop: 2,
  },
  hintText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
