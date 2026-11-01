import { describe, expect, it } from "vitest";
import { MockSchoolServices } from "../src/services/mock/service";
import { MemoryStorage } from "../src/storage/adapter";
import { createTestFixture } from "./testFixtures";
import { can, Context, CalendarEvent } from "../src/domain/model";

describe("School Calendar & Date/Time Consistency (Phase 6)", () => {
  const initServices = async () => {
    const fixture = createTestFixture();
    const storage = new MemoryStorage();
    const service = new MockSchoolServices(
      storage,
      () => new Date("2026-10-27T12:00:00Z"),
      fixture,
    );
    await service.initialize();
    return { service, storage, fixture };
  };

  const ownerCtx: Context = {
    schoolId: "cedar",
    userId: "demo-owner",
    role: "owner",
  };

  const adminCtx: Context = {
    schoolId: "cedar",
    userId: "demo-admin",
    role: "admin",
  };

  const parentCtx: Context = {
    schoolId: "cedar",
    userId: "demo-parent",
    role: "parent",
  };

  describe("Calendar Event Operations", () => {
    it("allows owner to populate new calendar milestones", async () => {
      const { service } = await initServices();

      const newEvents: Array<{
        title: string;
        date: string;
        endDate?: string;
        type: CalendarEvent["type"];
        description?: string;
      }> = [
        {
          title: "Second Term Resumption",
          date: "2027-01-11",
          type: "term",
          description: "All students resume for the second term",
        },
        {
          title: "Mid-Term Examination Week",
          date: "2027-02-15",
          endDate: "2027-02-19",
          type: "exam",
          description: "Standardized testing across all grades",
        },
      ];

      await service.populateCalendar(ownerCtx, newEvents);

      const snapshot = service.snapshot(ownerCtx);
      const addedTerm = snapshot.calendar.find(
        (e) => e.title === "Second Term Resumption",
      );
      expect(addedTerm).toBeDefined();
      expect(addedTerm?.date).toBe("2027-01-11");
      expect(addedTerm?.type).toBe("term");

      const addedExam = snapshot.calendar.find(
        (e) => e.title === "Mid-Term Examination Week",
      );
      expect(addedExam).toBeDefined();
      expect(addedExam?.endDate).toBe("2027-02-19");
      expect(addedExam?.type).toBe("exam");
    });

    it("allows admin to update an existing calendar milestone", async () => {
      const { service } = await initServices();

      // Populate an initial milestone
      await service.populateCalendar(ownerCtx, [
        {
          title: "Sports Day Preliminary",
          date: "2026-11-20",
          type: "event",
          description: "Inter-house athletic qualifiers",
        },
      ]);

      const snapshot = service.snapshot(adminCtx);
      const event = snapshot.calendar.find(
        (e) => e.title === "Sports Day Preliminary",
      );
      expect(event).toBeDefined();

      if (event) {
        await service.updateCalendarEvent(adminCtx, event.id, {
          title: "Inter-House Sports Finals",
          date: "2026-11-25",
          description: "Grand finals at the main campus stadium",
        });

        const updatedSnapshot = service.snapshot(adminCtx);
        const updated = updatedSnapshot.calendar.find((e) => e.id === event.id);
        expect(updated?.title).toBe("Inter-House Sports Finals");
        expect(updated?.date).toBe("2026-11-25");
      }
    });

    it("allows owner to delete/cancel a calendar milestone", async () => {
      const { service } = await initServices();

      await service.populateCalendar(ownerCtx, [
        {
          title: "Temporary Teacher Training",
          date: "2026-11-05",
          type: "event",
        },
      ]);

      const initialSnapshot = service.snapshot(ownerCtx);
      const event = initialSnapshot.calendar.find(
        (e) => e.title === "Temporary Teacher Training",
      );
      expect(event).toBeDefined();

      if (event) {
        await service.deleteCalendarEvent(ownerCtx, event.id);

        const afterSnapshot = service.snapshot(ownerCtx);
        const exists = afterSnapshot.calendar.some((e) => e.id === event.id);
        expect(exists).toBe(false);
      }
    });

    it("blocks unauthorized roles (e.g. parent) from mutating calendar events", async () => {
      const { service } = await initServices();

      expect(can(parentCtx.role, "calendar")).toBe(false);

      await expect(
        service.populateCalendar(parentCtx, [
          {
            title: "Unauthorized Event",
            date: "2026-12-01",
            type: "event",
          },
        ]),
      ).rejects.toThrow();
    });
  });

  describe("Chronological Timeline Grouping & Range Calculations", () => {
    it("correctly checks if a date falls within a multi-day event range", () => {
      const multiDayEvent: CalendarEvent = {
        id: "EV-01",
        schoolId: "cedar",
        title: "Mid-Term Break",
        date: "2026-10-24",
        endDate: "2026-11-01",
        type: "break",
      };

      const isInRange = (d: string) =>
        d >= multiDayEvent.date && (!multiDayEvent.endDate || d <= multiDayEvent.endDate);

      expect(isInRange("2026-10-23")).toBe(false);
      expect(isInRange("2026-10-24")).toBe(true);
      expect(isInRange("2026-10-28")).toBe(true);
      expect(isInRange("2026-11-01")).toBe(true);
      expect(isInRange("2026-11-02")).toBe(false);
    });

    it("groups events into chronological months", () => {
      const events: CalendarEvent[] = [
        { id: "1", schoolId: "c", title: "Oct Event", date: "2026-10-15", type: "event" },
        { id: "2", schoolId: "c", title: "Sep Event", date: "2026-09-14", type: "term" },
        { id: "3", schoolId: "c", title: "Dec Event", date: "2026-12-01", type: "exam" },
      ];

      const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
      expect(sorted[0]?.date).toBe("2026-09-14");
      expect(sorted[1]?.date).toBe("2026-10-15");
      expect(sorted[2]?.date).toBe("2026-12-01");
    });
  });
});
