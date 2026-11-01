import React from "react";
import { Modal } from "react-native";
import { ScannerScreen } from "./scanner/ScannerScreen";
import { ScanMode } from "./scanner/types";

export interface FullscreenScannerModalProps {
  visible: boolean;
  onClose: () => void;
  defaultMode?: "face" | "staff" | "student" | "any";
  onScanComplete?: (code: string) => void;
}

export function FullscreenScannerModal({
  visible,
  onClose,
  defaultMode = "any",
  onScanComplete,
}: FullscreenScannerModalProps) {
  if (!visible) return null;

  const mappedMode: ScanMode =
    defaultMode === "face"
      ? "attendance"
      : defaultMode === "staff" || defaultMode === "student"
      ? "badges"
      : "all";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScannerScreen
        onClose={onClose}
        defaultMode={mappedMode}
        onScanComplete={onScanComplete}
      />
    </Modal>
  );
}
