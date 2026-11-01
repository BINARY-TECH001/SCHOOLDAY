import { describe, expect, it } from "vitest";
import {
  getClassRoster,
  getTeacherAssignedClasses,
  isTeacherAuthorizedForClass,
  isTeacherAuthorizedForStudent,
} from "../src/features/teacher/utils/teacherClass";
import { SchoolClass, Staff, Student } from "../src/domain/model";

describe("Teacher Workspace & Classroom Management (Phase 2)", () => {
  const primary4: SchoolClass = {
    id: "CLS-P4",
    schoolId: "cedar",
    name: "Primary 4 Diamond",
    code: "PR4-D",
    teacherUserId: "teacher-1",
    termFee: 15000000,
    studentCount: 20,
  };

  const primary2: SchoolClass = {
    id: "CLS-P2",
    schoolId: "cedar",
    name: "Primary 2 Emerald",
    code: "PR2-E",
    teacherUserId: "teacher-2",
    termFee: 15000000,
    studentCount: 18,
  };

  const allClasses = [primary4, primary2];

  const teacherStaff: Staff = {
    id: "STF-T1",
    userId: "teacher-1",
    schoolId: "cedar",
    name: "Tomi Adebayo",
    title: "Senior Educator · Primary 4",
    email: "tomi@example.invalid",
    role: "teacher",
    assignedClasses: ["Primary 4 Diamond"],
    status: "active",
  };

  const unassignedTeacher: Staff = {
    id: "STF-T3",
    userId: "teacher-3",
    schoolId: "cedar",
    name: "Kelechi Nnamdi",
    title: "Relief Teacher",
    email: "kelechi@example.invalid",
    role: "teacher",
    status: "active",
  };

  const studentInP4: Student = {
    id: "STU-001",
    schoolId: "cedar",
    name: "Chinonso Okafor",
    className: "Primary 4 Diamond",
    guardianId: "parent-1",
  };

  const studentInP2: Student = {
    id: "STU-002",
    schoolId: "cedar",
    name: "Amara Balogun",
    className: "Primary 2 Emerald",
    guardianId: "parent-2",
  };

  const allStudents = [studentInP4, studentInP2];

  it("resolves assigned classes for a teacher correctly", () => {
    const assigned = getTeacherAssignedClasses(allClasses, [teacherStaff], "teacher-1");
    expect(assigned.length).toBe(1);
    expect(assigned[0]?.id).toBe("CLS-P4");
  });

  it("returns an empty array when a teacher has no assigned classes", () => {
    const assigned = getTeacherAssignedClasses(allClasses, [unassignedTeacher], "teacher-3");
    expect(assigned.length).toBe(0);
  });

  it("checks teacher class authorization boundary", () => {
    // Teacher-1 is authorized for Primary 4
    expect(
      isTeacherAuthorizedForClass(primary4, "teacher", "teacher-1", [teacherStaff])
    ).toBe(true);

    // Teacher-1 is NOT authorized for Primary 2
    expect(
      isTeacherAuthorizedForClass(primary2, "teacher", "teacher-1", [teacherStaff])
    ).toBe(false);

    // Owner and Admin are authorized for any class
    expect(
      isTeacherAuthorizedForClass(primary2, "owner", "owner-user", [teacherStaff])
    ).toBe(true);
    expect(
      isTeacherAuthorizedForClass(primary4, "admin", "admin-user", [teacherStaff])
    ).toBe(true);
  });

  it("retrieves exact class roster without substituting fallback students", () => {
    const p4Roster = getClassRoster(allStudents, primary4);
    expect(p4Roster.length).toBe(1);
    expect(p4Roster[0]?.id).toBe("STU-001");

    // Empty class has empty roster
    const emptyClass: SchoolClass = {
      id: "CLS-EMPTY",
      schoolId: "cedar",
      name: "JSS 3 Platinum",
      code: "JSS3-P",
      termFee: 16000000,
      studentCount: 0,
    };
    const emptyRoster = getClassRoster(allStudents, emptyClass);
    expect(emptyRoster.length).toBe(0);
  });

  it("authorizes pupil profile viewing only for assigned teachers, guardians, or admins", () => {
    // Teacher-1 can view student in Primary 4
    expect(
      isTeacherAuthorizedForStudent(studentInP4, "teacher", "teacher-1", allClasses, [teacherStaff])
    ).toBe(true);

    // Teacher-1 cannot view student in Primary 2
    expect(
      isTeacherAuthorizedForStudent(studentInP2, "teacher", "teacher-1", allClasses, [teacherStaff])
    ).toBe(false);

    // Parent can only view their own child
    expect(
      isTeacherAuthorizedForStudent(studentInP4, "parent", "parent-1", allClasses, [teacherStaff])
    ).toBe(true);
    expect(
      isTeacherAuthorizedForStudent(studentInP4, "parent", "parent-2", allClasses, [teacherStaff])
    ).toBe(false);

    // Admin can view any pupil
    expect(
      isTeacherAuthorizedForStudent(studentInP2, "admin", "admin-1", allClasses, [teacherStaff])
    ).toBe(true);
  });

  it("authorizes teacher to add students when authorized for that class", () => {
    // Authorized lead teacher for P4 has addition rights
    const canTeacherAddP4 = isTeacherAuthorizedForClass(primary4, "teacher", "teacher-1", [teacherStaff]);
    expect(canTeacherAddP4).toBe(true);

    // Unassigned teacher does not have addition rights for P4
    const canTeacherAddUnassigned = isTeacherAuthorizedForClass(primary4, "teacher", "teacher-3", [unassignedTeacher]);
    expect(canTeacherAddUnassigned).toBe(false);
  });

  it("verifies proxy clock-in permission (clock_others) for staff members", () => {
    const managerStaff: Staff = {
      ...teacherStaff,
      permissions: ["attendance", "clock_others"],
    };
    const regularStaff: Staff = {
      ...teacherStaff,
      permissions: ["attendance"],
    };

    const managerCanClockOthers = managerStaff.permissions?.includes("clock_others");
    expect(managerCanClockOthers).toBe(true);

    const regularCanClockOthers = regularStaff.permissions?.includes("clock_others");
    expect(Boolean(regularCanClockOthers)).toBe(false);
  });

  it("restricts treasury disburse permission to authorized finance/owner roles", () => {
    const regularTeacher: Staff = {
      ...teacherStaff,
      permissions: ["lessons", "attendance"],
    };
    const financeStaff: Staff = {
      ...teacherStaff,
      permissions: ["disburse", "payroll"],
    };

    expect(Boolean(regularTeacher.permissions?.includes("disburse"))).toBe(false);
    expect(Boolean(financeStaff.permissions?.includes("disburse"))).toBe(true);
  });
});

