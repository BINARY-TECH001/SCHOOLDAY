import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts, radius, shadows } from "../../theme/tokens";
import { Icon } from "../Icon";
import { Button } from "./Button";

export interface ModalSheetProps {
  visible?: boolean;
  open?: boolean; // Backward compatibility alias
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: any;
  maxHeight?: any;
  style?: StyleProp<ViewStyle>;
}

export function ModalSheet({
  visible,
  open,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = "85%",
  style,
}: ModalSheetProps) {
  const isVisible = visible ?? open ?? false;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal backdrop"
          style={styles.backdropPressable}
          onPress={onClose}
        />

        <View style={[styles.sheetCard, { maxHeight }, style]}>
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandleBar} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.titleText}>{title}</Text>
              {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Icon name="close" size={18} color={colors.navy} />
            </Pressable>
          </View>

          {/* Sheet Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.contentWrap}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface ConfirmationDialogProps {
  visible?: boolean;
  open?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  highlightAmount?: string;
  recipientName?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
}

export function ConfirmationDialog({
  visible,
  open,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  highlightAmount,
  recipientName,
  confirmLabel = "Confirm",
  confirmText,
  cancelLabel = "Cancel",
  cancelText,
  confirmVariant = "primary",
  loading = false,
}: ConfirmationDialogProps) {
  const handleClose = onClose ?? onCancel ?? (() => {});
  const resolvedConfirmLabel = confirmText ?? confirmLabel;
  const resolvedCancelLabel = cancelText ?? cancelLabel;

  return (
    <ModalSheet visible={visible ?? open} onClose={handleClose} title={title}>
      <View style={{ gap: 16, paddingVertical: 4 }}>
        {highlightAmount ? (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightLabel}>Amount</Text>
            <Text style={styles.highlightAmount}>{highlightAmount}</Text>
            {recipientName ? (
              <Text style={styles.highlightRecipient}>For: {recipientName}</Text>
            ) : null}
          </View>
        ) : null}

        {message ? <Text style={styles.noticeMessage}>{message}</Text> : null}

        <View style={styles.actionBtnRow}>
          <Button
            title={resolvedCancelLabel}
            variant="secondary"
            size="lg"
            onPress={handleClose}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            title={resolvedConfirmLabel}
            variant={confirmVariant}
            size="lg"
            onPress={onConfirm}
            loading={loading}
            style={{ flex: 1.4 }}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: 10,
    ...shadows.lg,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDark,
    alignSelf: "center",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.navy,
  },
  subtitleText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: {
    padding: 20,
    paddingBottom: 36,
  },
  highlightBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  highlightAmount: {
    fontFamily: fonts.extra,
    fontSize: 26,
    color: colors.navy,
  },
  highlightRecipient: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
  },
  noticeMessage: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  actionBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
