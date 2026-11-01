import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Button, ModalSheet } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { Database } from "../../../domain/model";

export interface ManualCodeEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  data: Database;
}

export function ManualCodeEntrySheet({
  visible,
  onClose,
  onSubmit,
  data,
}: ManualCodeEntrySheetProps) {
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) return;
    const submitted = code.trim();
    setCode("");
    onClose();
    onSubmit(submitted);
  };

  // Sample actual IDs from the school database for easy one-tap testing
  const sampleStaff = data.staff.slice(0, 2);
  const sampleStudents = data.students.slice(0, 2);
  const sampleInvoices = data.invoices.slice(0, 2);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Manual Code Entry"
      subtitle="Type student ID, staff badge, or invoice reference"
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="e.g. STU-001 or INV-001"
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />
          {code.length > 0 && (
            <Pressable onPress={() => setCode("")}>
              <Icon name="close" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <Button
          title="Verify & Resolve Code"
          variant="primary"
          disabled={!code.trim()}
          onPress={handleSubmit}
        />

        {/* Quick Sample Chips from Real Database */}
        {(sampleStaff.length > 0 || sampleStudents.length > 0 || sampleInvoices.length > 0) && (
          <View style={styles.sampleSection}>
            <Text style={styles.sampleTitle}>QUICK SAMPLES IN THIS SCHOOL</Text>
            <View style={styles.sampleGrid}>
              {sampleStudents.map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.sampleChip}
                  onPress={() => {
                    setCode(s.id);
                  }}
                >
                  <Text style={styles.sampleChipText}>Pupil: {s.id}</Text>
                </Pressable>
              ))}
              {sampleStaff.map((st) => (
                <Pressable
                  key={st.id}
                  style={styles.sampleChip}
                  onPress={() => {
                    setCode(st.id);
                  }}
                >
                  <Text style={styles.sampleChipText}>Staff: {st.id}</Text>
                </Pressable>
              ))}
              {sampleInvoices.map((inv) => (
                <Pressable
                  key={inv.id}
                  style={styles.sampleChip}
                  onPress={() => {
                    setCode(inv.id);
                  }}
                >
                  <Text style={styles.sampleChipText}>Inv: {inv.id}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  sampleSection: {
    gap: 8,
    paddingTop: 8,
  },
  sampleTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  sampleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sampleChip: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sampleChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
});
