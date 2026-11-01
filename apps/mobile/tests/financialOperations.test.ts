import { describe, expect, it } from "vitest";
import { MockSchoolServices } from "../src/services/mock/service";
import { MemoryStorage } from "../src/storage/adapter";
import { createTestFixture } from "./testFixtures";
import { balance, total, Context, Invoice, Student } from "../src/domain/model";

describe("Financial Operations & Defaulters (Phase 5)", () => {
  const initServices = async () => {
    const fixture = createTestFixture();
    const storage = new MemoryStorage();
    const service = new MockSchoolServices(storage, () => new Date("2026-10-27T12:00:00Z"), fixture);
    await service.initialize();
    return { service, storage, fixture };
  };

  const ownerCtx: Context = {
    schoolId: "cedar",
    userId: "demo-owner",
    role: "owner",
  };

  const financeCtx: Context = {
    schoolId: "cedar",
    userId: "demo-finance",
    role: "finance",
  };

  const teacherCtx: Context = {
    schoolId: "cedar",
    userId: "demo-teacher",
    role: "teacher",
  };

  const parentCtx: Context = {
    schoolId: "cedar",
    userId: "demo-parent",
    role: "parent",
  };

  describe("Defaulter Identification & Balance Aggregation", () => {
    it("accurately detects students with unpaid invoice balances", async () => {
      const { fixture } = await initServices();

      const cedarInvoices = fixture.invoices.filter((i) => i.schoolId === "cedar");
      const cedarStudents = fixture.students.filter((s) => s.schoolId === "cedar");

      // Group unpaid invoices by studentId
      const unpaidInvoices = cedarInvoices.filter((i) => balance(i) > 0);
      expect(unpaidInvoices.length).toBeGreaterThan(0);

      const indebtedStudentIds = new Set(unpaidInvoices.map((i) => i.studentId));

      // Chinonso Okafor (cedar-STU-001) has cedar-INV-100 (partially paid) and cedar-INV-200 (partially paid)
      expect(indebtedStudentIds.has("cedar-STU-001")).toBe(true);

      // Yusuf Ibrahim (cedar-STU-003) has cedar-INV-102 with paid=0 (100% unpaid)
      expect(indebtedStudentIds.has("cedar-STU-003")).toBe(true);

      // Amara Okafor (cedar-STU-002) has cedar-INV-101 with paid=13,000,000 (fully cleared)
      const amaraInvoices = cedarInvoices.filter((i) => i.studentId === "cedar-STU-002");
      const amaraBalance = amaraInvoices.reduce((sum, i) => sum + balance(i), 0);
      expect(amaraBalance).toBe(0);
      expect(indebtedStudentIds.has("cedar-STU-002")).toBe(false);
    });

    it("correctly calculates overdue days based on invoice due date", async () => {
      const { fixture } = await initServices();
      const testToday = new Date("2026-10-27T12:00:00Z");

      const overdueInvoice = fixture.invoices.find((i) => i.id === "cedar-INV-100");
      expect(overdueInvoice).toBeDefined();

      if (overdueInvoice) {
        expect(overdueInvoice.due).toBe("2026-09-28");
        const dueTime = new Date(overdueInvoice.due).getTime();
        const daysPastDue = Math.floor(
          (testToday.getTime() - dueTime) / (1000 * 3600 * 24),
        );
        expect(daysPastDue).toBeGreaterThan(25);
      }
    });

    it("distinguishes between partially paid and fully unpaid invoices", () => {
      const partialInvoice: Invoice = {
        id: "INV-P",
        schoolId: "cedar",
        studentId: "STU-1",
        due: "2026-11-01",
        items: [{ label: "Tuition", amount: 10000000 }],
        paid: 4000000,
      };
      expect(total(partialInvoice)).toBe(10000000);
      expect(balance(partialInvoice)).toBe(6000000);
      expect(partialInvoice.paid > 0 && balance(partialInvoice) > 0).toBe(true);

      const unpaidInvoice: Invoice = {
        id: "INV-U",
        schoolId: "cedar",
        studentId: "STU-2",
        due: "2026-11-01",
        items: [{ label: "Tuition", amount: 10000000 }],
        paid: 0,
      };
      expect(unpaidInvoice.paid).toBe(0);
      expect(balance(unpaidInvoice)).toBe(10000000);
    });
  });

  describe("Reminder Dispatch (services.remind)", () => {
    it("allows finance role to dispatch fee reminders for outstanding invoices", async () => {
      const { service } = await initServices();

      // Invoice cedar-INV-100 belongs to student cedar-STU-001 (guardian: demo-parent)
      await service.remind(financeCtx, "cedar-INV-100");

      // Notice is scoped to the student's guardian
      const parentData = service.snapshot(parentCtx);
      const reminderNotice = parentData.notices.find(
        (n) => n.target === "fees" && n.title.includes("Fee reminder"),
      );
      expect(reminderNotice).toBeDefined();
      expect(reminderNotice?.userId).toBe("demo-parent");
      expect(reminderNotice?.recordId).toBe("cedar-STU-001");
    });

    it("allows owner role to dispatch fee reminders and stores notice in database", async () => {
      const { service, storage } = await initServices();

      await service.remind(ownerCtx, "cedar-INV-102");

      const raw = await storage.read("schoolday.database.v1");
      const db = JSON.parse(raw || "{}");
      const notice = db.notices.find(
        (n: any) =>
          n.target === "fees" &&
          n.recordId === "cedar-STU-003" &&
          n.title.includes("Fee reminder"),
      );
      expect(notice).toBeDefined();
      expect(notice?.schoolId).toBe("cedar");
    });

    it("blocks unauthorized roles (teacher, parent) from calling remind", async () => {
      const { service } = await initServices();

      await expect(service.remind(teacherCtx, "cedar-INV-100")).rejects.toThrow();
      await expect(service.remind(parentCtx, "cedar-INV-100")).rejects.toThrow();
    });

    it("rejects reminder when invoice has zero outstanding balance", async () => {
      const { service } = await initServices();

      // cedar-INV-101 is fully paid (paid = total)
      await expect(service.remind(financeCtx, "cedar-INV-101")).rejects.toThrow(
        "No outstanding balance to remind.",
      );
    });

    it("rejects reminder when invoice does not exist", async () => {
      const { service } = await initServices();

      await expect(
        service.remind(financeCtx, "non-existent-invoice-id"),
      ).rejects.toThrow();
    });
  });

  describe("Treasury Calculations & Settlement Settings", () => {
    it("correctly computes total collected, total disbursed, and net available balance", async () => {
      const { service } = await initServices();
      const data = service.snapshot(financeCtx);

      const totalCollected = data.payments
        .filter((p) => p.state === "settled" && p.type !== "payout")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalDisbursed = data.payments
        .filter((p) => p.state === "settled" && p.type === "payout")
        .reduce((sum, p) => sum + p.amount, 0);

      const availableBalance = Math.max(0, totalCollected - totalDisbursed);

      expect(totalCollected).toBeGreaterThanOrEqual(5000000);
      expect(availableBalance).toBe(totalCollected - totalDisbursed);
    });

    it("allows owner to configure and persist official settlement bank account details", async () => {
      const { service, storage } = await initServices();

      await service.updateSchool(ownerCtx, {
        bankName: "Providus Bank",
        accountNumber: "0123456789",
        accountName: "Cedar Grove Academy Official",
      });

      const updatedData = service.snapshot(ownerCtx);
      const updatedSchool = updatedData.schools.find((s) => s.id === ownerCtx.schoolId);
      expect(updatedSchool?.bankName).toBe("Providus Bank");
      expect(updatedSchool?.accountNumber).toBe("0123456789");
      expect(updatedSchool?.accountName).toBe("Cedar Grove Academy Official");

      // Verify persistent storage
      const raw = await storage.read("schoolday.database.v1");
      const db = JSON.parse(raw || "{}");
      const school = db.schools.find((s: any) => s.id === "cedar");
      expect(school?.accountNumber).toBe("0123456789");
      expect(school?.bankName).toBe("Providus Bank");
    });

    it("batches multiple automated reminders across indebted students", async () => {
      const { service, storage } = await initServices();
      const data = service.snapshot(ownerCtx);

      const unpaidInvoices = data.invoices.filter((i) => balance(i) > 0);
      expect(unpaidInvoices.length).toBeGreaterThanOrEqual(2);

      let dispatched = 0;
      for (const inv of unpaidInvoices) {
        await service.remind(ownerCtx, inv.id);
        dispatched++;
      }

      expect(dispatched).toBe(unpaidInvoices.length);

      const raw = await storage.read("schoolday.database.v1");
      const db = JSON.parse(raw || "{}");
      const reminderNotices = db.notices.filter(
        (n: any) => n.target === "fees" && n.title.includes("Fee reminder"),
      );
      expect(reminderNotices.length).toBeGreaterThanOrEqual(2);
    });

    it("strictly blocks disbursements exceeding available balance to prevent negative balances", async () => {
      const { service } = await initServices();
      const data = service.snapshot(financeCtx);

      const totalCollected = data.payments
        .filter((p) => p.state === "settled" && p.type !== "payout")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalDisbursed = data.payments
        .filter((p) => p.state === "settled" && p.type === "payout")
        .reduce((sum, p) => sum + p.amount, 0);

      const availableBalance = Math.max(0, totalCollected - totalDisbursed);

      // Attempt to disburse more than available
      const excessAmount = availableBalance + 1000000;
      await expect(
        service.disburse(financeCtx, {
          amount: excessAmount,
          recipientName: "Test Contractor",
          note: "Invalid Overdraw",
        }),
      ).rejects.toThrow("Insufficient treasury balance");
    });

    it("strictly protects school name as immutable and rejects attempts to edit it", async () => {
      const { service } = await initServices();

      await expect(
        service.updateSchool(ownerCtx, {
          name: "Hacked School Name Institute",
        }),
      ).rejects.toThrow("School name is accredited and cannot be edited.");
    });

    it("updates profile personal details including title prefix, names, and contact", async () => {
      const { service } = await initServices();

      await service.updateProfile(ownerCtx, {
        titlePrefix: "Dr.",
        firstName: "Al-Mubarak",
        middleName: "Sani",
        lastName: "Danjuma",
        phone: "+234 803 999 8888",
        email: "proprietor@cedargrove.edu.ng",
      });

      const updated = service.snapshot(ownerCtx);
      const membership = updated.memberships.find(
        (m) => m.schoolId === ownerCtx.schoolId && m.userId === ownerCtx.userId,
      );
      expect(membership?.name).toBe("Dr. Al-Mubarak Sani Danjuma");

      const staff = updated.staff.find(
        (s) => s.schoolId === ownerCtx.schoolId && s.userId === ownerCtx.userId,
      );
      expect(staff?.titlePrefix).toBe("Dr.");
      expect(staff?.firstName).toBe("Al-Mubarak");
      expect(staff?.name).toBe("Dr. Al-Mubarak Sani Danjuma");
      expect(staff?.phone).toBe("+234 803 999 8888");
    });
  });
});
