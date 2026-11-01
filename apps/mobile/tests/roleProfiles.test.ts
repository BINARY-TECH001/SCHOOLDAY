import { describe, expect, it } from "vitest";
import {
  getStaffVisibility,
  getStudentVisibility,
  ViewerContext,
} from "../src/features/profiles/utils/visibilityRules";
import { Staff, Student } from "../src/domain/model";

describe("Role-Based Profiles & Privacy Enforcement (Phase 3)", () => {
  const dummyStudent: Student = {
    id: "STU-2026-001",
    schoolId: "cedar",
    name: "Tobi Adeleke",
    className: "Basic 4A",
    guardianId: "parent-1",
    guardianPhone: "+234 802 111 2233",
  };

  const dummyStaff: Staff = {
    id: "STF-2026-010",
    userId: "staff-1",
    schoolId: "cedar",
    name: "Amina Adeleke",
    title: "Class teacher · Primary 4",
    email: "amina@cedar.sch.ng",
    phone: "+234 803 444 5566",
    role: "teacher",
    assignedClasses: ["Basic 4A"],
    status: "active",
  };

  describe("Student Profile Visibility (Minors Protection)", () => {
    it("allows the student's own registered guardian full view of contact & financials", () => {
      const parentViewer: ViewerContext = {
        schoolId: "cedar",
        userId: "parent-1",
        role: "parent",
      };

      const visibility = getStudentVisibility(parentViewer, dummyStudent);
      expect(visibility.canViewRecord).toBe(true);
      expect(visibility.canViewPrivateContact).toBe(true);
      expect(visibility.canViewFinancials).toBe(true);
      expect(visibility.canViewAcademicRecords).toBe(true);
    });

    it("restricts another parent from viewing another pupil's contact & financials", () => {
      const otherParentViewer: ViewerContext = {
        schoolId: "cedar",
        userId: "parent-99", // Different guardian
        role: "parent",
      };

      const visibility = getStudentVisibility(otherParentViewer, dummyStudent);
      expect(visibility.canViewRecord).toBe(true);
      expect(visibility.canViewPrivateContact).toBe(false);
      expect(visibility.canViewFinancials).toBe(false);
      expect(visibility.canViewAcademicRecords).toBe(false);
    });

    it("allows class teachers to inspect academic records but conceals tuition financials", () => {
      const teacherViewer: ViewerContext = {
        schoolId: "cedar",
        userId: "teacher-1",
        role: "teacher",
      };

      const visibility = getStudentVisibility(teacherViewer, dummyStudent);
      expect(visibility.canViewRecord).toBe(true);
      expect(visibility.canViewAcademicRecords).toBe(true);
      expect(visibility.canViewFinancials).toBe(false);
      expect(visibility.canViewPrivateContact).toBe(false);
    });

    it("blocks cross-tenant student lookups completely", () => {
      const crossTenantViewer: ViewerContext = {
        schoolId: "horizon", // Different school
        userId: "parent-1",
        role: "parent",
      };

      const visibility = getStudentVisibility(crossTenantViewer, dummyStudent);
      expect(visibility.canViewRecord).toBe(false);
      expect(visibility.canViewPrivateContact).toBe(false);
      expect(visibility.canViewFinancials).toBe(false);
    });

    it("returns all false when student is undefined (Zero Mock Fallback)", () => {
      const viewer: ViewerContext = {
        schoolId: "cedar",
        userId: "admin-1",
        role: "owner",
      };

      const visibility = getStudentVisibility(viewer, undefined);
      expect(visibility.canViewRecord).toBe(false);
      expect(visibility.canViewPrivateContact).toBe(false);
    });
  });

  describe("Staff Profile Visibility (Compensation & Privacy)", () => {
    it("allows staff members to inspect their own private mobile and compensation", () => {
      const selfViewer: ViewerContext = {
        schoolId: "cedar",
        userId: "staff-1", // Self
        role: "teacher",
      };

      const visibility = getStaffVisibility(selfViewer, dummyStaff);
      expect(visibility.canViewRecord).toBe(true);
      expect(visibility.canViewPrivatePhone).toBe(true);
      expect(visibility.canViewCompensation).toBe(true);
      expect(visibility.canManagePermissions).toBe(false);
    });

    it("allows proprietors to manage permissions and view private contact and salary", () => {
      const ownerViewer: ViewerContext = {
        schoolId: "cedar",
        userId: "proprietor-1",
        role: "owner",
      };

      const visibility = getStaffVisibility(ownerViewer, dummyStaff);
      expect(visibility.canViewRecord).toBe(true);
      expect(visibility.canViewPrivatePhone).toBe(true);
      expect(visibility.canViewCompensation).toBe(true);
      expect(visibility.canManagePermissions).toBe(true);
    });

    it("conceals private mobile number and compensation from peer colleagues", () => {
      const peerViewer: ViewerContext = {
        schoolId: "cedar",
        userId: "colleague-2",
        role: "teacher",
      };

      const visibility = getStaffVisibility(peerViewer, dummyStaff);
      expect(visibility.canViewRecord).toBe(true);
      expect(visibility.canViewPrivatePhone).toBe(false);
      expect(visibility.canViewCompensation).toBe(false);
      expect(visibility.canManagePermissions).toBe(false);
    });

    it("blocks cross-tenant staff lookups completely", () => {
      const crossTenantViewer: ViewerContext = {
        schoolId: "horizon",
        userId: "proprietor-1",
        role: "owner",
      };

      const visibility = getStaffVisibility(crossTenantViewer, dummyStaff);
      expect(visibility.canViewRecord).toBe(false);
      expect(visibility.canViewCompensation).toBe(false);
      expect(visibility.canViewPrivatePhone).toBe(false);
    });

    it("returns all false when staff is undefined (Zero Mock Fallback)", () => {
      const viewer: ViewerContext = {
        schoolId: "cedar",
        userId: "proprietor-1",
        role: "owner",
      };

      const visibility = getStaffVisibility(viewer, undefined);
      expect(visibility.canViewRecord).toBe(false);
      expect(visibility.canViewCompensation).toBe(false);
    });
  });
});
