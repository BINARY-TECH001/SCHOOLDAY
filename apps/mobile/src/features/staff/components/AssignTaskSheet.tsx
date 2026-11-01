import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { toast } from "sonner-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Button, ModalSheet } from "../../../components/ui";
import { StaffTask } from "../types";

export interface AssignTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  staffName: string;
  staffId: string;
  staffUserId: string;
  currentUserId: string;
  currentUserName: string;
  onSaveTask: (taskInput: Omit<StaffTask, "id" | "createdAt">) => Promise<unknown> | void;
}

export function AssignTaskSheet({
  visible,
  onClose,
  staffName,
  staffId,
  staffUserId,
  currentUserId,
  currentUserName,
  onSaveTask,
}: AssignTaskSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [locationOrClass, setLocationOrClass] = useState("Main Campus");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    setSaving(true);
    try {
      await onSaveTask({
        schoolId: "", // Will be assigned by store
        staffId,
        staffUserId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate,
        locationOrClass: locationOrClass.trim() || undefined,
        status: "pending",
        assignedByUserId: currentUserId,
        assignedByName: currentUserName,
      });

      toast.success(`Task assigned to ${staffName}!`);
      setTitle("");
      setDescription("");
      onClose();
    } catch {
      toast.error("Failed to assign task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Assign Operational Task"
      subtitle={`Assigning duty to ${staffName}`}
    >
      <View style={styles.container}>
        <View style={styles.field}>
          <Text style={styles.label}>Task Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Hallway Inspection & Roll Call"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.priorityRow}>
            {(["low", "medium", "high"] as const).map((p) => (
              <Pressable
                key={p}
                style={[
                  styles.priorityBtn,
                  priority === p && styles.priorityBtnActive,
                  priority === p && p === "high" && styles.priorityBtnHigh,
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === p && styles.priorityTextActive,
                  ]}
                >
                  {p.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            value={dueDate}
            onChangeText={setDueDate}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Assigned Location or Classroom</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Hall 2 / Primary 4 Gold"
            placeholderTextColor={colors.muted}
            value={locationOrClass}
            onChangeText={setLocationOrClass}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Instructions & Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide specific guidelines or completion criteria..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Button
          title={saving ? "Saving Task…" : "Assign Task to Staff"}
          variant="primary"
          size="lg"
          loading={saving}
          onPress={handleSubmit}
        />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: 4,
  },
  field: {
    gap: 4,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  priorityBtnHigh: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  priorityText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate700,
  },
  priorityTextActive: {
    color: "#ffffff",
  },
});
