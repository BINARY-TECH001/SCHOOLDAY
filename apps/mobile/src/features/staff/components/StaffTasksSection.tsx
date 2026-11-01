import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../../../theme/tokens";
import { Badge, Card, EmptyState } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { StaffTask } from "../types";

export interface StaffTasksSectionProps {
  tasks: StaffTask[];
  isOwnerOrAdmin: boolean;
  onOpenAssignTask: () => void;
  onToggleStatus: (taskId: string, newStatus: StaffTask["status"]) => void;
}

export function StaffTasksSection({
  tasks,
  isOwnerOrAdmin,
  onOpenAssignTask,
  onToggleStatus,
}: StaffTasksSectionProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return t.status !== "completed";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.topHeaderRow}>
        <View style={styles.filterPills}>
          <Pressable
            style={[styles.pill, filter === "all" && styles.pillActive]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.pillText, filter === "all" && styles.pillTextActive]}>
              All ({tasks.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.pill, filter === "pending" && styles.pillActive]}
            onPress={() => setFilter("pending")}
          >
            <Text style={[styles.pillText, filter === "pending" && styles.pillTextActive]}>
              Pending ({tasks.filter((t) => t.status !== "completed").length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.pill, filter === "completed" && styles.pillActive]}
            onPress={() => setFilter("completed")}
          >
            <Text style={[styles.pillText, filter === "completed" && styles.pillTextActive]}>
              Done ({tasks.filter((t) => t.status === "completed").length})
            </Text>
          </Pressable>
        </View>

        {isOwnerOrAdmin && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Assign new task"
            style={({ pressed }) => [
              styles.assignTaskBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={onOpenAssignTask}
          >
            <Icon name="add" size={14} color="#ffffff" />
            <Text style={styles.assignTaskBtnText}>Assign Task</Text>
          </Pressable>
        )}
      </View>

      {filteredTasks.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            title="No Tasks Found"
            subtitle={
              tasks.length === 0
                ? "No operational duties or tasks currently assigned to this staff member."
                : "No tasks match the selected filter."
            }
            actionLabel={isOwnerOrAdmin ? "Assign First Task" : undefined}
            onAction={isOwnerOrAdmin ? onOpenAssignTask : undefined}
            icon="document"
          />
        </Card>
      ) : (
        <View style={styles.taskList}>
          {filteredTasks.map((task) => {
            const isDone = task.status === "completed";
            return (
              <Card key={task.id} style={[styles.taskCard, isDone && styles.taskCardDone]}>
                <View style={styles.taskTopRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={isDone ? "Mark task pending" : "Mark task complete"}
                    style={[styles.checkbox, isDone && styles.checkboxDone]}
                    onPress={() => onToggleStatus(task.id, isDone ? "pending" : "completed")}
                  >
                    {isDone && <Icon name="check" size={12} color="#ffffff" />}
                  </Pressable>

                  <View style={styles.taskTitleCol}>
                    <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                      {task.title}
                    </Text>

                    {task.description ? (
                      <Text style={styles.taskDesc} numberOfLines={2}>
                        {task.description}
                      </Text>
                    ) : null}
                  </View>

                  <Badge
                    tone={
                      task.priority === "high"
                        ? "danger"
                        : task.priority === "medium"
                        ? "warning"
                        : "neutral"
                    }
                    text={`${task.priority.toUpperCase()} PRIORITY`}
                    size="sm"
                  />
                </View>

                <View style={styles.taskFooter}>
                  <View style={styles.dueWrap}>
                    <Icon name="calendar" size={12} color={colors.muted} />
                    <Text style={styles.dueText}>
                      Due: {task.dueDate} {task.dueTime ? `· ${task.dueTime}` : ""}
                    </Text>
                  </View>

                  {task.locationOrClass ? (
                    <Text style={styles.locationText} numberOfLines={1}>
                      {task.locationOrClass}
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  filterPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.slate700,
  },
  pillTextActive: {
    color: "#ffffff",
  },
  assignTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.orange,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
  },
  assignTaskBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#ffffff",
  },
  emptyCard: {
    padding: spacing.md,
  },
  taskList: {
    gap: spacing.sm,
  },
  taskCard: {
    padding: spacing.md,
    gap: 10,
    backgroundColor: colors.surface,
  },
  taskCardDone: {
    backgroundColor: colors.surfaceSubtle,
    opacity: 0.8,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  taskTitleCol: {
    flex: 1,
    gap: 3,
  },
  taskTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.navy,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  taskDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
    paddingTop: 8,
  },
  dueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
  },
  locationText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate600,
  },
});
