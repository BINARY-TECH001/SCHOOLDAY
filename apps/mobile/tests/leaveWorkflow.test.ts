import { describe, expect, it } from "vitest";
import {
  calculateLeaveDuration,
  formatLeaveDateRange,
  validateLeaveInput,
} from "../src/features/leave/utils/leaveValidation";
import { MockSchoolServices } from "../src/services/mock/service";
import { MemoryStorage } from "../src/storage/adapter";
import { createTestFixture } from "./testFixtures";
import { Context } from "../src/domain/model";

describe("Leave Workflow & Validation (Phase 2)", () => {
  describe("validateLeaveInput", () => {
    it("rejects missing or empty start and end dates", () => {
      const res = validateLeaveInput({
        type: "Annual",
        start: "",
        end: "",
        reason: "Valid reason for personal leave",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.start).toBeDefined();
      expect(res.errors.end).toBeDefined();
    });

    it("rejects reversed date ranges where end date precedes start date", () => {
      const res = validateLeaveInput({
        type: "Annual",
        start: "2026-11-10",
        end: "2026-11-05",
        reason: "Taking family annual leave trip",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.end).toContain("End date cannot be earlier than start date");
    });

    it("rejects reasons shorter than 10 characters", () => {
      const res = validateLeaveInput({
        type: "Medical",
        start: "2026-11-02",
        end: "2026-11-03",
        reason: "Sick day", // 8 chars
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.reason).toContain("at least 10 characters");
    });

    it("accepts valid leave input meeting all criteria", () => {
      const res = validateLeaveInput({
        type: "Medical",
        start: "2026-11-02",
        end: "2026-11-04",
        reason: "Doctor appointment and post-op recovery",
      });
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });
  });

  describe("calculateLeaveDuration", () => {
    it("returns 0 days when dates are invalid or reversed", () => {
      const res = calculateLeaveDuration("2026-11-05", "2026-11-01");
      expect(res.calendarDays).toBe(0);
      expect(res.workingDays).toBe(0);
    });

    it("calculates 1 day correctly for same-day leave on a weekday", () => {
      // 2026-11-02 is a Monday
      const res = calculateLeaveDuration("2026-11-02", "2026-11-02");
      expect(res.calendarDays).toBe(1);
      expect(res.workingDays).toBe(1);
      expect(res.formatted).toBe("1 working day");
    });

    it("excludes Saturdays and Sundays from working days count", () => {
      // 2026-10-30 is Friday, 2026-10-31 is Saturday, 2026-11-01 is Sunday, 2026-11-02 is Monday
      const res = calculateLeaveDuration("2026-10-30", "2026-11-02");
      expect(res.calendarDays).toBe(4);
      expect(res.workingDays).toBe(2); // Friday and Monday
      expect(res.formatted).toBe("2 working days (4 total)");
    });
  });

  describe("formatLeaveDateRange", () => {
    it("formats human-readable date range", () => {
      const str = formatLeaveDateRange("2026-11-02", "2026-11-06");
      expect(str).toContain("Nov");
      expect(str).toContain("2026");
    });
  });

  describe("Service Integration (leave & decideLeave)", () => {
    const hrContext: Context = {
      schoolId: "cedar",
      userId: "demo-hr",
      role: "hr",
    };

    const teacherContext: Context = {
      schoolId: "cedar",
      userId: "demo-teacher",
      role: "teacher",
    };

    const createService = async () => {
      const storage = new MemoryStorage();
      const service = new MockSchoolServices(
        storage,
        () => new Date("2026-10-24T07:00:00Z"),
        createTestFixture()
      );
      await service.initialize();
      return service;
    };

    it("submits a leave request and transitions to Approved via HR/proprietor decision", async () => {
      const service = await createService();

      // Submit leave as teacher
      await service.leave(
        teacherContext,
        {
          type: "Annual",
          start: "2026-11-16",
          end: "2026-11-20",
          reason: "Attending annual educational leadership conference",
        },
        false, // not draft
        false // online
      );

      const stateAfterSubmit = service.snapshot(teacherContext);
      const createdLeave = stateAfterSubmit.leaves.find(
        (l) => l.userId === "demo-teacher" && l.reason.includes("leadership conference")
      );

      expect(createdLeave).toBeDefined();
      expect(createdLeave?.status).toBe("Submitted");

      // HR approves leave
      await service.decideLeave(hrContext, createdLeave!.id, true);

      const stateAfterApprove = service.snapshot(teacherContext);
      const approvedLeave = stateAfterApprove.leaves.find((l) => l.id === createdLeave!.id);
      expect(approvedLeave?.status).toBe("Approved");
    });

    it("submits a draft leave that can be saved on device without approval", async () => {
      const service = await createService();

      await service.leave(
        teacherContext,
        {
          type: "Family",
          start: "2026-12-01",
          end: "2026-12-05",
          reason: "Family milestone celebration",
        },
        true, // draft
        false
      );

      const state = service.snapshot(teacherContext);
      const draftLeave = state.leaves.find(
        (l) => l.userId === "demo-teacher" && l.reason.includes("Family milestone")
      );

      expect(draftLeave).toBeDefined();
      expect(draftLeave?.status).toBe("Draft");
    });

    it("rejects a leave request with appropriate status update", async () => {
      const service = await createService();

      await service.leave(
        teacherContext,
        {
          type: "Annual",
          start: "2026-11-23",
          end: "2026-11-27",
          reason: "Vacation during exam grading period",
        },
        false,
        false
      );

      const stateAfterSubmit = service.snapshot(teacherContext);
      const createdLeave = stateAfterSubmit.leaves.find(
        (l) => l.userId === "demo-teacher" && l.reason.includes("exam grading period")
      );

      expect(createdLeave).toBeDefined();

      // HR rejects leave
      await service.decideLeave(hrContext, createdLeave!.id, false);

      const stateAfterReject = service.snapshot(teacherContext);
      const rejectedLeave = stateAfterReject.leaves.find((l) => l.id === createdLeave!.id);
      expect(rejectedLeave?.status).toBe("Rejected");
    });
  });
});
