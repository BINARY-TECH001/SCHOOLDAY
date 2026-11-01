import { Attendance, Leave, Staff } from "../../../domain/model";
import { StaffComputedStatus, StaffPresenceState } from "../types";

/**
 * Computes live operational presence, today's attendance details,
 * and pending reviews for a staff member.
 * Strictly uses real attendance and leave domain records.
 */
export function computeStaffStatus(
  staff: Staff,
  allAttendance: Attendance[],
  allLeaves: Leave[],
  todayStr: string = new Date().toISOString().slice(0, 10)
): StaffComputedStatus {
  const staffAttendance = allAttendance.filter((a) => a.userId === staff.userId);
  const staffLeaves = allLeaves.filter((l) => l.userId === staff.userId);

  // 1. Check approved leave covering today
  const activeLeave = staffLeaves.find(
    (l) =>
      l.status === "Approved" &&
      l.start.slice(0, 10) <= todayStr &&
      l.end.slice(0, 10) >= todayStr
  );

  // 2. Pending leaves awaiting proprietor decision
  const pendingLeaves = staffLeaves.filter(
    (l) => l.status === "Submitted" || l.status === "Waiting to sync"
  );

  // 3. Today's attendance punch
  const todayPunch = staffAttendance.find(
    (a) => a.inAt.slice(0, 10) === todayStr
  );

  // 4. Check for missed clock-outs in past attendance records
  const hasMissedClockOut = staffAttendance.some(
    (a) => a.inAt.slice(0, 10) < todayStr && !a.outAt
  );

  let presence: StaffPresenceState = "not_in";
  let statusLabel = "Not Clocked In";
  let timeIn: string | undefined;
  let timeOut: string | undefined;
  let locationName: string | undefined;
  let arrivalStatus: "on_time" | "late" | undefined;
  let leaveType: string | undefined;

  if (activeLeave) {
    presence = "on_leave";
    leaveType = activeLeave.type;
    statusLabel = `On Leave · ${activeLeave.type}`;
  } else if (todayPunch) {
    locationName = todayPunch.locationName;
    const inDate = new Date(todayPunch.inAt);
    timeIn = inDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (todayPunch.outAt) {
      presence = "clocked_out";
      const outDate = new Date(todayPunch.outAt);
      timeOut = outDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      statusLabel = `Clocked Out (${timeOut})`;
    } else {
      presence = "present";
      arrivalStatus = todayPunch.arrivalStatus === "late" ? "late" : "on_time";
      statusLabel = `Present (In at ${timeIn})`;
    }
  }

  return {
    presence,
    statusLabel,
    timeIn,
    timeOut,
    locationName,
    arrivalStatus,
    leaveType,
    pendingLeavesCount: pendingLeaves.length,
    hasMissedClockOut,
  };
}
