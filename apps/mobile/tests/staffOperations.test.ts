import { describe, expect, it } from "vitest";
import { computeStaffStatus } from "../src/features/staff/utils/staffStatus";
import { Attendance, Leave, Staff } from "../src/domain/model";

describe("Staff Operations & Status Computation (Phase 1)", () => {
  const dummyStaff: Staff = {
    id: "staff-1",
    userId: "user-1",
    schoolId: "cedar",
    name: "Amina Adeleke",
    title: "Class teacher · Primary 4",
    email: "amina@test.invalid",
    role: "teacher",
    assignedClasses: ["Basic 4A"],
    status: "active",
  };

  const today = "2026-10-27";

  it("identifies present staff when clocked in today and not yet out", () => {
    const attendances: Attendance[] = [
      {
        id: "att-1",
        schoolId: "cedar",
        userId: "user-1",
        inAt: "2026-10-27T07:45:00Z",
        state: "Demo verified",
        arrivalStatus: "on_time",
      },
    ];

    const status = computeStaffStatus(dummyStaff, attendances, [], today);
    expect(status.presence).toBe("present");
    expect(status.arrivalStatus).toBe("on_time");
    expect(status.timeIn).toBeDefined();
    expect(status.timeOut).toBeUndefined();
    expect(status.statusLabel).toContain("Present");
  });

  it("identifies late arrival when arrivalStatus is marked late", () => {
    const attendances: Attendance[] = [
      {
        id: "att-2",
        schoolId: "cedar",
        userId: "user-1",
        inAt: "2026-10-27T08:25:00Z",
        state: "Demo verified",
        arrivalStatus: "late",
      },
    ];

    const status = computeStaffStatus(dummyStaff, attendances, [], today);
    expect(status.presence).toBe("present");
    expect(status.arrivalStatus).toBe("late");
  });

  it("identifies clocked_out staff when today record has outAt", () => {
    const attendances: Attendance[] = [
      {
        id: "att-3",
        schoolId: "cedar",
        userId: "user-1",
        inAt: "2026-10-27T07:50:00Z",
        outAt: "2026-10-27T16:00:00Z",
        state: "Demo verified",
      },
    ];

    const status = computeStaffStatus(dummyStaff, attendances, [], today);
    expect(status.presence).toBe("clocked_out");
    expect(status.timeOut).toBeDefined();
    expect(status.statusLabel).toContain("Clocked Out");
  });

  it("identifies on_leave staff when an approved leave spans today", () => {
    const leaves: Leave[] = [
      {
        id: "leave-1",
        schoolId: "cedar",
        userId: "user-1",
        type: "Medical",
        start: "2026-10-26",
        end: "2026-10-28",
        reason: "Medical recovery",
        status: "Approved",
      },
    ];

    const status = computeStaffStatus(dummyStaff, [], leaves, today);
    expect(status.presence).toBe("on_leave");
    expect(status.leaveType).toBe("Medical");
    expect(status.statusLabel).toContain("On Leave · Medical");
  });

  it("distinguishes not_in from on_leave and counts pending leaves", () => {
    const leaves: Leave[] = [
      {
        id: "leave-2",
        schoolId: "cedar",
        userId: "user-1",
        type: "Annual",
        start: "2026-11-01",
        end: "2026-11-05",
        reason: "Holiday trip",
        status: "Submitted",
      },
    ];

    // No attendance today, leave is submitted for future
    const status = computeStaffStatus(dummyStaff, [], leaves, today);
    expect(status.presence).toBe("not_in");
    expect(status.pendingLeavesCount).toBe(1);
    expect(status.statusLabel).toBe("Not Clocked In");
  });

  it("detects missed clock-outs from prior days", () => {
    const attendances: Attendance[] = [
      {
        id: "att-old",
        schoolId: "cedar",
        userId: "user-1",
        inAt: "2026-10-25T07:45:00Z", // prior day without outAt
        state: "Demo verified",
      },
    ];

    const status = computeStaffStatus(dummyStaff, attendances, [], today);
    expect(status.hasMissedClockOut).toBe(true);
  });
});
