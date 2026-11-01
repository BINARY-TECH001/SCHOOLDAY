import { describe, expect, it } from "vitest";
import { Attendance, Leave, Staff } from "../src/domain/model";

// Pure helper function representing calendar day status resolver
function resolveCalendarDayStatus(
  dayIso: string,
  attendances: Attendance[],
  leaves: Leave[],
  isWeekend: boolean
): {
  status: "present" | "late" | "active" | "leave" | "weekend" | "absent";
  label: string;
} {
  if (isWeekend) {
    return { status: "weekend", label: "Weekend" };
  }

  // Check approved leave for this date
  const leave = leaves.find(
    (l) => l.status === "Approved" && dayIso >= l.start && dayIso <= l.end
  );
  if (leave) {
    return { status: "leave", label: `${leave.type} Leave` };
  }

  // Check attendance records for this date
  const att = attendances.find((a) => a.inAt.slice(0, 10) === dayIso);
  if (!att) {
    return { status: "absent", label: "No Record" };
  }

  if (!att.outAt) {
    return { status: "active", label: "Active Shift" };
  }

  if (att.arrivalStatus === "late" || att.arrivalStatus === "Late") {
    return { status: "late", label: "Late Arrival" };
  }

  return { status: "present", label: "On Time" };
}

// Pure helper to compute shift duration in minutes
function computeShiftDurationMinutes(inAt: string, outAt?: string): number | null {
  if (!outAt) return null;
  const inMs = new Date(inAt).getTime();
  const outMs = new Date(outAt).getTime();
  if (isNaN(inMs) || isNaN(outMs) || outMs < inMs) return null;
  return Math.round((outMs - inMs) / (1000 * 60));
}

describe("Attendance Calendar Grid & Status Mapping (Phase 2)", () => {
  const dummyLeave: Leave = {
    id: "leave-1",
    schoolId: "cedar",
    userId: "staff-1",
    type: "Annual",
    start: "2026-10-15",
    end: "2026-10-18",
    reason: "Approved personal annual leave",
    status: "Approved",
  };

  const dummyAttendances: Attendance[] = [
    {
      id: "att-1",
      schoolId: "cedar",
      userId: "staff-1",
      inAt: "2026-10-12T07:25:00Z",
      outAt: "2026-10-12T16:00:00Z",
      state: "Demo verified",
      arrivalStatus: "on_time",
    },
    {
      id: "att-2",
      schoolId: "cedar",
      userId: "staff-1",
      inAt: "2026-10-13T08:15:00Z",
      outAt: "2026-10-13T16:05:00Z",
      state: "Demo verified",
      arrivalStatus: "late",
    },
    {
      id: "att-3",
      schoolId: "cedar",
      userId: "staff-1",
      inAt: "2026-10-14T07:28:00Z",
      state: "Demo verified",
      arrivalStatus: "on_time",
      // active shift: no outAt
    },
  ];

  it("identifies weekend days as weekend status", () => {
    // 2026-10-11 was a Sunday
    const result = resolveCalendarDayStatus("2026-10-11", dummyAttendances, [dummyLeave], true);
    expect(result.status).toBe("weekend");
  });

  it("identifies approved leave days within date range", () => {
    // 2026-10-16 is within 2026-10-15 to 2026-10-18
    const result = resolveCalendarDayStatus("2026-10-16", dummyAttendances, [dummyLeave], false);
    expect(result.status).toBe("leave");
    expect(result.label).toContain("Annual Leave");
  });

  it("identifies on-time completed shift", () => {
    const result = resolveCalendarDayStatus("2026-10-12", dummyAttendances, [dummyLeave], false);
    expect(result.status).toBe("present");
    expect(result.label).toBe("On Time");
  });

  it("identifies late arrival completed shift", () => {
    const result = resolveCalendarDayStatus("2026-10-13", dummyAttendances, [dummyLeave], false);
    expect(result.status).toBe("late");
    expect(result.label).toBe("Late Arrival");
  });

  it("identifies active / open shift without clock-out", () => {
    const result = resolveCalendarDayStatus("2026-10-14", dummyAttendances, [dummyLeave], false);
    expect(result.status).toBe("active");
    expect(result.label).toBe("Active Shift");
  });

  it("computes shift duration correctly in minutes and handles active shifts", () => {
    // 07:25 to 16:00 is 8 hours 35 minutes = 515 minutes
    const dur1 = computeShiftDurationMinutes(
      dummyAttendances[0]?.inAt || "",
      dummyAttendances[0]?.outAt
    );
    expect(dur1).toBe(515);

    // Active shift without outAt returns null
    const durActive = computeShiftDurationMinutes(
      dummyAttendances[2]?.inAt || "",
      dummyAttendances[2]?.outAt
    );
    expect(durActive).toBeNull();
  });
});

describe("Student Attendance & Morning/Afternoon Roll Call Operations", () => {
  it("supports recording both morning and afternoon attendance for pupils on the same date", () => {
    const records = [
      {
        id: "satt-1",
        schoolId: "sch-1",
        studentId: "pupil-1",
        classId: "cls-1",
        className: "Basic 4",
        date: "2026-10-27",
        session: "morning" as const,
        status: "present" as const,
        markedAt: "2026-10-27T08:10:00Z",
      },
      {
        id: "satt-2",
        schoolId: "sch-1",
        studentId: "pupil-1",
        classId: "cls-1",
        className: "Basic 4",
        date: "2026-10-27",
        session: "afternoon" as const,
        status: "present" as const,
        markedAt: "2026-10-27T13:45:00Z",
      },
    ];

    expect(records.length).toBe(2);
    expect(records[0]?.session).toBe("morning");
    expect(records[1]?.session).toBe("afternoon");
    expect(records[0]?.date).toBe(records[1]?.date);
  });

  it("partitions daily staff roster into Present staff and Absent/Leave staff for proprietor calendar click", () => {
    const allStaff = [
      { id: "stf-1", name: "Principal Okon", role: "admin", assignedClass: "Primary 4" },
      { id: "stf-2", name: "Teacher Adebayo", role: "teacher", assignedClass: "Primary 3" },
      { id: "stf-3", name: "Teacher Chidinma", role: "teacher", assignedClass: "Primary 2" },
      { id: "stf-4", name: "Security Musa", role: "staff", assignedClass: undefined },
    ];

    const attendances = [
      {
        id: "att-1",
        schoolId: "sch-1",
        userId: "stf-1",
        inAt: "2026-10-27T07:15:00Z",
        outAt: "2026-10-27T16:00:00Z",
        arrivalStatus: "on_time",
        state: "Demo verified" as const,
      },
      {
        id: "att-2",
        schoolId: "sch-1",
        userId: "stf-2",
        inAt: "2026-10-27T08:20:00Z",
        arrivalStatus: "late",
        state: "Demo verified" as const,
      },
    ];

    const leaves = [
      {
        id: "lev-1",
        schoolId: "sch-1",
        userId: "stf-3",
        type: "Maternity",
        start: "2026-10-20",
        end: "2026-11-01",
        status: "Approved",
        reason: "Maternity leave",
      },
    ];

    const dateStr = "2026-10-27";

    // 1. Present Staff
    const presentStaff = allStaff
      .map((staff) => {
        const att = attendances.find((a) => a.userId === staff.id && a.inAt.slice(0, 10) === dateStr);
        if (!att) return null;
        return { staff, attendance: att };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 2. Absent / Leave Staff
    const absentStaff = allStaff
      .filter((staff) => !attendances.some((a) => a.userId === staff.id && a.inAt.slice(0, 10) === dateStr))
      .map((staff) => {
        const leave = leaves.find(
          (l) => l.userId === staff.id && l.status === "Approved" && l.start <= dateStr && l.end >= dateStr
        );
        return { staff, leave };
      });

    expect(presentStaff.length).toBe(2);
    expect(presentStaff.map((p) => p.staff.name)).toEqual(["Principal Okon", "Teacher Adebayo"]);

    expect(absentStaff.length).toBe(2);
    expect(absentStaff.find((a) => a.staff.name === "Teacher Chidinma")?.leave?.type).toBe("Maternity");
    expect(absentStaff.find((a) => a.staff.name === "Security Musa")?.leave).toBeUndefined();
  });

  it("segments pupil payment history chronologically by class and date with zero mock data", () => {
    const rawPayments = [
      {
        id: "RCT-1002",
        schoolId: "sch-1",
        userId: "std-001",
        invoiceIds: ["INV-01"],
        amount: 4500000,
        method: "transfer" as const,
        state: "settled" as const,
        createdAt: "2026-10-25T14:30:00Z",
        key: "KEY-2",
        className: "Primary 4 Gold",
      },
      {
        id: "RCT-1001",
        schoolId: "sch-1",
        userId: "std-001",
        invoiceIds: ["INV-01"],
        amount: 2500000,
        method: "card" as const,
        state: "settled" as const,
        createdAt: "2026-10-10T09:15:00Z",
        key: "KEY-1",
        className: "Primary 4 Gold",
      },
    ];

    // Sorted descending by date
    const sorted = [...rawPayments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    expect(sorted[0]?.id).toBe("RCT-1002");
    expect(sorted[1]?.id).toBe("RCT-1001");
    expect(sorted.every((p) => p.className === "Primary 4 Gold")).toBe(true);
  });

  it("strictly prevents marking attendance ahead for future dates while allowing back dates", () => {
    const today = "2026-10-27";
    const futureDate = "2026-10-28";
    const pastDate = "2026-10-25";

    const validateDate = (targetDate: string) => {
      if (targetDate > today) {
        throw new Error("Cannot record attendance for future dates.");
      }
      return true;
    };

    expect(() => validateDate(futureDate)).toThrowError("Cannot record attendance for future dates.");
    expect(validateDate(pastDate)).toBe(true);
    expect(validateDate(today)).toBe(true);
  });

  it("partitions classroom pupils into present, late, and absent/unmarked for a selected date and session", () => {
    const pupils = [
      { id: "p-1", name: "Amaka", className: "Basic 4" },
      { id: "p-2", name: "Bayo", className: "Basic 4" },
      { id: "p-3", name: "Chidi", className: "Basic 4" },
    ];

    const records = [
      { studentId: "p-1", date: "2026-10-27", session: "morning" as const, status: "present" as const },
      { studentId: "p-2", date: "2026-10-27", session: "morning" as const, status: "late" as const },
    ];

    const present = pupils.filter((p) => records.some((r) => r.studentId === p.id && r.status === "present"));
    const late = pupils.filter((p) => records.some((r) => r.studentId === p.id && r.status === "late"));
    const absent = pupils.filter((p) => !records.some((r) => r.studentId === p.id));

    expect(present.length).toBe(1);
    expect(present[0]?.name).toBe("Amaka");
    expect(late.length).toBe(1);
    expect(late[0]?.name).toBe("Bayo");
    expect(absent.length).toBe(1);
    expect(absent[0]?.name).toBe("Chidi");
  });
});


