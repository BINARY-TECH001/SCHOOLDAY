import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Button, ModalSheet } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { SchoolClass } from "../../../domain/model";

export interface ManageClassesSheetProps {
  visible: boolean;
  onClose: () => void;
  staffName: string;
  allClasses: SchoolClass[];
  currentAssigned: string[];
  onSaveClasses: (selected: string[]) => Promise<void>;
}

export function ManageClassesSheet({
  visible,
  onClose,
  staffName,
  allClasses,
  currentAssigned,
  onSaveClasses,
}: ManageClassesSheetProps) {
  const [selected, setSelected] = useState<string[]>(currentAssigned);
  const [saving, setSaving] = useState(false);

  const toggleClass = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveClasses(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Classroom Allocation"
      subtitle={`Manage assigned streams for ${staffName}`}
    >
      <View style={styles.container}>
        <Text style={styles.instructionText}>
          Select all classes and student cohorts where this educator is assigned as homeroom tutor or subject specialist.
        </Text>

        <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
          {allClasses.map((cls) => {
            const isSelected = selected.includes(cls.name);
            return (
              <Pressable
                key={cls.id}
                style={[styles.classItem, isSelected && styles.classItemActive]}
                onPress={() => toggleClass(cls.name)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Icon name="check" size={13} color="#ffffff" />}
                </View>

                <View style={styles.classInfo}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.classCode}>
                    Code: {cls.code} · {cls.studentCount || 0} Students
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          title={saving ? "Saving Changes…" : `Confirm ${selected.length} Allocated Classes`}
          variant="primary"
          size="lg"
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: 4,
    maxHeight: 460,
  },
  instructionText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  classList: {
    maxHeight: 280,
  },
  classItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 12,
  },
  classItemActive: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  classInfo: {
    flex: 1,
    gap: 2,
  },
  className: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  classCode: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
});
