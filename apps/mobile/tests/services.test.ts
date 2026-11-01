import { parseNaira } from "../src/domain/payments";
import { beforeEach, describe, expect, it } from "vitest";
import { MockSchoolServices } from "../src/services/mock/service";
import { MemoryStorage } from "../src/storage/adapter";
import { balance, can, Context, invoiceStatus } from "../src/domain/model";
import { createTestFixture } from "./testFixtures";
let storage: MemoryStorage;
let service: MockSchoolServices;
const parent: Context = {
  schoolId: "cedar",
  userId: "demo-parent",
  role: "parent",
};
const teacher: Context = {
  schoolId: "cedar",
  userId: "demo-teacher",
  role: "teacher",
};
const finance: Context = {
  schoolId: "cedar",
  userId: "demo-finance",
  role: "finance",
};
const hr: Context = { schoolId: "cedar", userId: "demo-hr", role: "hr" };
const request = {
  invoiceIds: ["cedar-INV-100"],
  amount: 1000000,
  method: "card" as const,
  fail: false,
  key: "test-payment",
};
beforeEach(async () => {
  storage = new MemoryStorage();
  service = new MockSchoolServices(
    storage,
    () => new Date("2026-10-24T07:00:00Z"),
    createTestFixture(),
  );
  await service.initialize();
});
describe("tenant boundaries and permissions", () => {
  it("returns only active school and linked children", () => {
    const a = service.snapshot(parent);
    const b = service.snapshot({ ...parent, schoolId: "horizon" });
    expect(a.students).toHaveLength(2);
    expect(b.students.every((s) => s.schoolId === "horizon")).toBe(true);
    expect(
      a.students.every((s) => !b.students.some((t) => t.id === s.id)),
    ).toBe(true);
    expect(a.staff).toHaveLength(0);
  });
  it("rejects fabricated role and missing membership", () => {
    expect(() => service.snapshot({ ...parent, role: "owner" })).toThrow();
    expect(() => service.snapshot({ ...parent, schoolId: "royal" })).toThrow();
  });
  it("checks service permission as well as navigation permissions", async () => {
    expect(can("parent", "payroll")).toBe(false);
    expect(can("teacher", "lessons")).toBe(true);
    expect(can("staff", "lessons")).toBe(false);
    await expect(service.pay(teacher, request, false)).rejects.toThrow();
    await expect(
      service.decideLeave(parent, "cedar-LEV-1", true),
    ).rejects.toThrow();
  });
  it("rejects another school invoice and another guardian invoice", async () => {
    await expect(
      service.pay(
        parent,
        { ...request, invoiceIds: ["horizon-INV-100"] },
        false,
      ),
    ).rejects.toThrow();
    await expect(
      service.pay(parent, { ...request, invoiceIds: ["cedar-INV-102"] }, false),
    ).rejects.toThrow();
  });
  it("supports a guardian with no linked children", () => {
    expect(
      service.snapshot({ ...parent, userId: "demo-empty" }).students,
    ).toHaveLength(0);
  });
});
describe("money and payment lifecycle", () => {
  it("calculates balances and invoice status", () => {
    const invoice = service.snapshot(parent).invoices[0]!;
    expect(balance(invoice)).toBe(8000000);
    expect(invoiceStatus(invoice, "2026-10-24")).toBe("Overdue");
    expect(invoiceStatus(service.snapshot(parent).invoices[1]!)).toBe("Paid");
  });
  it("settles a partial payment exactly once, including concurrent retries", async () => {
    const [a, b] = await Promise.all([
      service.pay(parent, request, false),
      service.pay(parent, request, false),
    ]);
    expect(a.id).toBe(b.id);
    expect(balance(service.snapshot(parent).invoices[0]!)).toBe(7000000);
  });
  it("failed and offline payments do not reduce balances", async () => {
    expect(
      (await service.pay(parent, { ...request, fail: true }, false)).state,
    ).toBe("failed");
    await expect(
      service.pay(parent, { ...request, key: "offline" }, true),
    ).rejects.toThrow();
    expect(balance(service.snapshot(parent).invoices[0]!)).toBe(8000000);
  });
  it("keeps transfers pending until authorized confirmation", async () => {
    const p = await service.pay(
      parent,
      { ...request, method: "transfer" },
      false,
    );
    expect(p.state).toBe("awaiting confirmation");
    expect(balance(service.snapshot(parent).invoices[0]!)).toBe(8000000);
    await expect(service.confirmTransfer(parent, p.id, true)).rejects.toThrow();
    await service.confirmTransfer(finance, p.id, true);
    expect(balance(service.snapshot(parent).invoices[0]!)).toBe(7000000);
    await expect(
      service.confirmTransfer(finance, p.id, true),
    ).rejects.toThrow();
  });
  it("rejects invalid and excessive amounts or duplicate invoices", async () => {
    for (const amount of [-1, 0, 1.2, 9000000, NaN])
      await expect(
        service.pay(parent, { ...request, amount }, false),
      ).rejects.toThrow();
    await expect(
      service.pay(
        parent,
        { ...request, invoiceIds: ["cedar-INV-100", "cedar-INV-100"] },
        false,
      ),
    ).rejects.toThrow();
  });
  it("allocates a combined payment without overpaying any invoice", async () => {
    await service.pay(
      finance,
      {
        ...request,
        invoiceIds: ["cedar-INV-100", "cedar-INV-102"],
        amount: 9000000,
      },
      false,
    );
    const rows = service.snapshot(finance).invoices;
    expect(balance(rows[0]!)).toBe(0);
    expect(balance(rows[2]!)).toBe(12000000);
  });
});
describe("attendance and offline sync", () => {
  it("never verifies an offline record simply because it was saved", async () => {
    await service.attendance(teacher, "in", true);
    expect(service.snapshot(teacher).attendance.at(-1)?.state).toBe(
      "Waiting to sync",
    );
    await expect(service.sync(teacher, true, false)).rejects.toThrow();
    await service.sync(teacher, false, true);
    expect(service.snapshot(teacher).attendance.at(-1)?.state).toBe(
      "Needs attention",
    );
    await service.sync(teacher, false, false);
    expect(service.snapshot(teacher).attendance.at(-1)?.state).toBe(
      "Demo verified",
    );
  });
  it("guards invalid transitions and duplicate clock-ins", async () => {
    await expect(service.attendance(teacher, "out", false)).rejects.toThrow();
    await service.attendance(teacher, "in", false);
    await expect(service.attendance(teacher, "in", false)).rejects.toThrow();
    await service.attendance(teacher, "out", true);
    expect(service.snapshot(teacher).attendance.at(-1)?.outAt).toBeDefined();
    expect(service.snapshot(teacher).attendance.at(-1)?.state).toBe(
      "Waiting to sync",
    );
  });
});
describe("drafts, leave, notifications and storage", () => {
  it("persists a lesson edit across a fresh service instance", async () => {
    const lesson = service.snapshot(teacher).lessons[0]!;
    await service.saveLesson(
      teacher,
      { ...lesson, topic: "Adding fractions" },
      lesson.id,
    );
    const restored = new MockSchoolServices(storage);
    await restored.initialize();
    expect(restored.snapshot(teacher).lessons[0]?.topic).toBe(
      "Adding fractions",
    );
  });
  it("keeps offline leave pending then supports HR decision", async () => {
    await service.leave(
      teacher,
      {
        type: "Family",
        start: "2026-11-02",
        end: "2026-11-03",
        reason: "Family appointment scheduled",
      },
      false,
      true,
    );
    const leave = service.snapshot(teacher).leaves.at(-1)!;
    expect(leave.status).toBe("Waiting to sync");
    await expect(service.decideLeave(hr, leave.id, true)).rejects.toThrow();
    await service.sync(teacher, false, false);
    await service.decideLeave(hr, leave.id, true);
    expect(service.snapshot(teacher).leaves.at(-1)?.status).toBe("Approved");
  });
  it("rejects reversed leave dates", async () => {
    await expect(
      service.leave(
        teacher,
        {
          type: "Medical",
          start: "2026-11-04",
          end: "2026-11-01",
          reason: "Medical appointment",
        },
        true,
        false,
      ),
    ).rejects.toThrow();
  });
  it("creates a correctly scoped notification target and persists read status", async () => {
    await service.remind(finance, "cedar-INV-100");
    const n = service.snapshot(parent).notices.at(-1)!;
    expect(n.target).toBe("fees");
    expect(n.recordId).toBe("cedar-STU-001");
    await service.markRead(parent, n.id);
    expect(service.snapshot(parent).notices.at(-1)?.read).toBe(true);
    expect(
      service
        .snapshot({ ...parent, schoolId: "horizon" })
        .notices.some((x) => x.id === n.id),
    ).toBe(false);
  });
  it("does not commit domain changes when device storage fails", async () => {
    storage.write = async () => {
      throw new Error("Device is full");
    };
    await expect(service.pay(parent, request, false)).rejects.toThrow(
      "Device is full",
    );
    expect(balance(service.snapshot(parent).invoices[0]!)).toBe(8000000);
  });
  it("does not silently overwrite invalid cached data", async () => {
    await storage.write("schoolday.database.v1", '{"version":99}');
    await expect(new MockSchoolServices(storage).initialize()).rejects.toThrow(
      "unsupported version",
    );
    expect(await storage.read("schoolday.database.v1")).toBe('{"version":99}');
  });
});

it("parses naira exactly and rejects sub-kobo input", () => {
  expect(parseNaira("10000.25")).toBe(1000025);
  expect(parseNaira("10.005")).toBeNull();
  expect(parseNaira("-1")).toBeNull();
  expect(parseNaira("text")).toBeNull();
});

it("restricts payroll records to authorized roles and ownership", () => {
  expect(service.snapshot(parent).payroll).toHaveLength(0);
  expect(service.snapshot(finance).payroll).toHaveLength(0);
  expect(service.snapshot(teacher).payroll).toHaveLength(1);
  expect(service.snapshot(teacher).payroll[0]?.userId).toBe(teacher.userId);
  expect(service.snapshot(hr).payroll.length).toBeGreaterThan(1);
});

it("keeps announcement read state private to each account", async () => {
  await service.markRead(parent, "cedar-N1");
  expect(
    service.snapshot(parent).notices.find((n) => n.id === "cedar-N1")?.read,
  ).toBe(true);
  expect(
    service.snapshot(teacher).notices.find((n) => n.id === "cedar-N1")?.read,
  ).toBe(false);
});
