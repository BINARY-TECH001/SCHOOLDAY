import { Role, Staff } from "../../domain/model";

export type StaffFilterTab = "all" | "present" | "not_in" | "leave" | "pending";

export type StaffPresenceState =
  | "present"       // Clocked in today, not yet out
  | "clocked_out"   // Clocked in and clocked out today
  | "on_leave"      // Approved leave covers today
  | "not_in";       // Active staff, not on leave, no punch today

export interface StaffComputedStatus {
  presence: StaffPresenceState;
  statusLabel: string;
  timeIn?: string;
  timeOut?: string;
  locationName?: string;
  arrivalStatus?: "on_time" | "late";
  leaveType?: string;
  pendingLeavesCount: number;
  hasMissedClockOut: boolean;
}

export interface StaffWithComputedStatus {
  staff: Staff;
  computed: StaffComputedStatus;
}

export interface StaffTask {
  id: string;
  schoolId: string;
  staffId: string;
  staffUserId: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority: "low" | "medium" | "high";
  locationOrClass?: string;
  status: "pending" | "in_progress" | "completed";
  completionNotes?: string;
  assignedByUserId: string;
  assignedByName?: string;
  createdAt: string;
  completedAt?: string;
}

export type StaffProfileTab =
  | "overview"
  | "attendance"
  | "tasks"
  | "leave"
  | "payroll"
  | "activity";

export interface StaffActivityEvent {
  id: string;
  timestamp: string;
  type: "attendance" | "leave" | "payroll" | "task" | "status";
  title: string;
  description: string;
  badgeTone: "success" | "warning" | "danger" | "purple" | "blue" | "neutral";
  actorName?: string;
}
