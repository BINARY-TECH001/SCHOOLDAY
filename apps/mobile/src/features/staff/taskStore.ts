import { useEffect, useState, useCallback } from "react";
import { deviceStorage } from "../../storage/device";
import { StaffTask } from "./types";

const getStorageKey = (schoolId: string) => `schoolday:tasks:${schoolId}`;

export function useStaffTasks(schoolId: string, staffId?: string, staffUserId?: string) {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await deviceStorage.read(getStorageKey(schoolId));
      if (raw) {
        const parsed: StaffTask[] = JSON.parse(raw);
        setTasks(parsed);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = async (newTaskInput: Omit<StaffTask, "id" | "createdAt">) => {
    const newTask: StaffTask = {
      ...newTaskInput,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    await deviceStorage.write(getStorageKey(schoolId), JSON.stringify(updated));
    return newTask;
  };

  const updateTaskStatus = async (
    taskId: string,
    status: StaffTask["status"],
    completionNotes?: string
  ) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status,
          completionNotes: completionNotes !== undefined ? completionNotes : t.completionNotes,
          completedAt: status === "completed" ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    setTasks(updated);
    await deviceStorage.write(getStorageKey(schoolId), JSON.stringify(updated));
  };

  const deleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    await deviceStorage.write(getStorageKey(schoolId), JSON.stringify(updated));
  };

  const toggleTaskStatus = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const nextStatus = target.status === "completed" ? "pending" : "completed";
    await updateTaskStatus(taskId, nextStatus);
  };

  const filteredTasks = staffId
    ? tasks.filter(
        (t) =>
          t.staffId === staffId ||
          t.staffUserId === staffId ||
          (staffUserId && (t.staffUserId === staffUserId || t.staffId === staffUserId))
      )
    : tasks;

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    loading,
    addTask,
    updateTaskStatus,
    toggleTaskStatus,
    deleteTask,
    refreshTasks: loadTasks,
  };
}
