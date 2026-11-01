import {
  ContextSchema,
  LessonInputSchema,
  LeaveInputSchema,
  DatabaseSchema,
  Context,
  Database,
  can,
  balance,
  money,
  LessonInput,
  LeaveInput,
  Payment,
  Role,
  School,
  CalendarEvent,
  DaySchedule,
  PersonTitle,
  formatFullName,
  StudentAttendance,
} from "../../domain/model";
import { settlePayment } from "../../domain/payments";
import { z } from "zod";
import { StorageAdapter } from "../../storage/adapter";
import { PaymentRequest, SchoolServices } from "../contracts";
import { env } from "../../config/env";
import { sendOtpEmail, sendStaffInvitationEmail } from "../integrations";
import { emptyDatabase, seed } from "./seed";

const KEY = "schoolday.database.v1";
export class MockSchoolServices implements SchoolServices {
  private db: Database;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: StorageAdapter,
    private now = () => new Date(),
    private initialDatabase?: Database,
  ) {
    this.db = this.initialDatabase || emptyDatabase();
  }
  async initialize() {
    const raw = await this.storage.read(KEY);
    if (!raw) {
      await this.storage.write(KEY, JSON.stringify(this.db));
      return null;
    }
    try {
      this.db = DatabaseSchema.parse(JSON.parse(raw));
      return null;
    } catch {
      throw new Error(
        "Saved data is invalid or from an unsupported version. Reset data to recover.",
      );
    }
  }
  catalog() {
    const { schools, memberships } = DatabaseSchema.parse(this.db);
    return { schools, memberships };
  }
  private authorize(c: Context, permission?: string) {
    ContextSchema.parse(c);
    if (
      !this.db.memberships.some(
        (m) =>
          m.schoolId === c.schoolId &&
          m.userId === c.userId &&
          m.roles.includes(c.role),
      )
    )
      throw new Error("This school membership is not available.");
    const currentStaff = this.db.staff.find(
      (s) => s.schoolId === c.schoolId && s.userId === c.userId,
    );
    if (permission) {
      const isDisburseAllowed = permission === "finance" && currentStaff?.permissions?.includes("disburse");
      if (!can(c.role, permission, currentStaff?.permissions) && !isDisburseAllowed) {
        throw new Error("Your active role cannot perform this action.");
      }
    }
  }
  snapshot(c: Context): Database {
    this.authorize(c);
    const scoped = <T extends { schoolId: string }>(rows: T[]) =>
      rows.filter((r) => r.schoolId === c.schoolId);
    const students =
      can(c.role, "students") || can(c.role, "fees")
        ? scoped(this.db.students).filter(
            (s) => c.role !== "parent" || s.guardianId === c.userId,
          )
        : [];
    const invoices =
      can(c.role, "fees") || can(c.role, "finance") || c.role === "teacher" || c.role === "student"
        ? scoped(this.db.invoices).filter(
            (i) =>
              c.role !== "parent" || students.some((s) => s.id === i.studentId),
          )
        : [];
    return DatabaseSchema.parse({
      version: 1,
      schools: this.db.schools.filter((s) => s.id === c.schoolId),
      memberships: scoped(this.db.memberships).filter(
        (m) => m.userId === c.userId,
      ),
      students,
      invoices,
      staff: scoped(this.db.staff).filter(
        (s) => can(c.role, "directory") || s.userId === c.userId,
      ),
      payroll: can(c.role, "payroll")
        ? scoped(this.db.payroll).filter(
            (p) =>
              c.role === "hr" || c.role === "owner" || p.userId === c.userId,
          )
        : [],
      payments: scoped(this.db.payments).filter(
        (p) =>
          can(c.role, "finance") ||
          can(c.role, "payments") ||
          c.role === "teacher" ||
          c.role === "student" ||
          (c.role === "parent" &&
            p.invoiceIds.every((id) => invoices.some((i) => i.id === id))),
      ),
      attendance: scoped(this.db.attendance).filter(
        (a) => can(c.role, "attendanceReview") || a.userId === c.userId,
      ),
      studentAttendance: scoped(this.db.studentAttendance || []),
      lessons: can(c.role, "lessons")
        ? scoped(this.db.lessons).filter((l) => l.userId === c.userId)
        : [],
      leaves: scoped(this.db.leaves).filter(
        (l) => can(c.role, "approvals") || l.userId === c.userId,
      ),
      notices: scoped(this.db.notices)
        .filter((n) => !n.userId || n.userId === c.userId)
        .map((n) => ({ ...n, read: (n.readBy ?? []).includes(c.userId) })),
      classes: scoped(this.db.classes || []),
      calendar: scoped(this.db.calendar || []),
    });
  }
  private mutate<T>(fn: (db: Database) => T): Promise<T> {
    const next = this.queue.then(async () => {
      const draft = DatabaseSchema.parse(this.db);
      const result = fn(draft);
      DatabaseSchema.parse(draft);
      await this.storage.write(KEY, JSON.stringify(draft));
      this.db = draft;
      return result;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }
  private id(prefix: string) {
    return (
      prefix +
      "-" +
      this.now().getTime() +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );
  }
  async pay(c: Context, req: PaymentRequest, offline: boolean) {
    this.authorize(c, "payments");
    if (offline)
      throw new Error(
        "Payments need a connection, even in demo mode. No payment was taken.",
      );
    z.object({
      amount: z.number().int().positive(),
      invoiceIds: z.array(z.string()).min(1),
      method: z.enum(["card", "transfer", "ussd"]),
      key: z.string().min(1),
      fail: z.boolean(),
    }).parse(req);
    return this.mutate((db) => {
      const old = db.payments.find(
        (p) =>
          p.schoolId === c.schoolId &&
          p.userId === c.userId &&
          p.key === req.key,
      );
      if (old) return old;
      if (new Set(req.invoiceIds).size !== req.invoiceIds.length)
        throw new Error("An invoice can only be selected once.");
      const allowed = this.snapshot(c).invoices;
      const invoices = req.invoiceIds.map((id) => {
        const i = allowed.find((i) => i.id === id);
        if (!i) throw new Error("Invoice is not available to this membership.");
        return i;
      });
      if (req.amount > invoices.reduce((sum, i) => sum + balance(i), 0))
        throw new Error("Amount exceeds the selected outstanding balance.");
      const p: Payment = {
        id: this.id("RCT"),
        schoolId: c.schoolId,
        userId: c.userId,
        invoiceIds: req.invoiceIds,
        amount: req.amount,
        method: req.method,
        state: req.fail
          ? "failed"
          : req.method === "transfer"
            ? "awaiting confirmation"
            : "settled",
        key: req.key,
        createdAt: this.now().toISOString(),
      };
      if (p.state === "settled") settlePayment(db, p);
      db.payments.push(p);
      db.notices.push({
        id: this.id("N"),
        schoolId: c.schoolId,
        userId: c.userId,
        title: "Tuition Payment Settled: " + p.id,
        body: "Payment of " + money(p.amount) + " verified via Paystack.",
        at: p.createdAt,
        read: false,
        target: "fees",
        recordId: invoices[0]?.studentId,
      });
      return p;
    });
  }
  async confirmTransfer(c: Context, id: string, approve: boolean) {
    this.authorize(c, "finance");
    await this.mutate((db) => {
      const p = db.payments.find(
        (p) =>
          p.id === id &&
          p.schoolId === c.schoolId &&
          p.state === "awaiting confirmation",
      );
      if (!p) throw new Error("Pending transfer not found.");
      if (approve) settlePayment(db, p);
      else p.state = "failed";
    });
  }
  async disburse(
    c: Context,
    req: {
      amount: number;
      recipientName: string;
      note?: string;
    },
  ): Promise<Payment> {
    this.authorize(c, "finance");
    return this.mutate((db) => {
      if (req.amount <= 0) {
        throw new Error("Disbursement amount must be greater than zero.");
      }
      const totalInflows = db.payments
        .filter((p) => p.schoolId === c.schoolId && p.state === "settled" && p.type !== "payout")
        .reduce((sum, p) => sum + p.amount, 0);
      const totalOutflows = db.payments
        .filter((p) => p.schoolId === c.schoolId && p.state === "settled" && p.type === "payout")
        .reduce((sum, p) => sum + p.amount, 0);
      const availableBalance = Math.max(0, totalInflows - totalOutflows);

      if (req.amount > availableBalance) {
        throw new Error(
          `Insufficient treasury balance. Available balance is ${money(availableBalance)}. You cannot disburse funds without sufficient settled funds.`
        );
      }

      const p: Payment = {
        id: this.id("DIS"),
        schoolId: c.schoolId,
        userId: c.userId,
        invoiceIds: [],
        amount: req.amount,
        method: "transfer",
        state: "settled",
        key: `DIS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        createdAt: this.now().toISOString(),
        type: "payout",
        recipientName: req.recipientName,
        note: req.note || "Treasury Disburse / Operational Payout",
      };
      db.payments.unshift(p);
      db.notices.push({
        id: this.id("N"),
        schoolId: c.schoolId,
        userId: c.userId,
        title: "Treasury Disbursed: " + p.id,
        body: `Disbursed ${money(p.amount)} to ${p.recipientName}.`,
        at: p.createdAt,
        read: false,
        target: "home",
      });
      return p;
    });
  }
  async attendance(
    c: Context,
    action: "in" | "out",
    offline: boolean,
    details?: {
      photoVerified?: boolean;
      locationName?: string;
      targetUserId?: string;
      method?: string;
    },
  ) {
    this.authorize(c, "attendance");
    const targetId = details?.targetUserId || c.userId;
    if (targetId !== c.userId) {
      const currentStaff = this.db.staff.find(
        (s) => s.schoolId === c.schoolId && s.userId === c.userId,
      );
      const canClockOthers =
        c.role === "owner" ||
        c.role === "admin" ||
        currentStaff?.permissions?.includes("clock_others") ||
        currentStaff?.permissions?.includes("attendance");
      if (!canClockOthers) {
        throw new Error("You do not have permission to clock in/out other staff members.");
      }
    }
    await this.mutate((db) => {
      const now = this.now().toISOString();
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos",
      }).format(this.now());

      if ((details as any)?.date && (details as any).date > today) {
        throw new Error("Cannot clock in or record attendance for future dates.");
      }
      if ((details as any)?.timestamp && new Date((details as any).timestamp).getTime() > this.now().getTime()) {
        throw new Error("Cannot clock in or out ahead of current time.");
      }

      const rows = db.attendance.filter(
        (a) => a.schoolId === c.schoolId && a.userId === targetId,
      );
      const open = rows.find((a) => !a.outAt);
      if (action === "in") {
        if (
          open ||
          rows.some(
            (a) =>
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Africa/Lagos",
              }).format(new Date(a.inAt)) === today,
          )
        )
          throw new Error(
            "You have already clocked in today or have an open attendance record.",
          );
        db.attendance.push({
          id: this.id("ATT"),
          schoolId: c.schoolId,
          userId: targetId,
          inAt: now,
          state: offline ? "Waiting to sync" : "Verification pending",
          photoVerified: details?.photoVerified ?? true,
          locationVerified: true,
          locationName: details?.locationName ?? "Main Campus Lekki",
          arrivalStatus: "On Time",
        });
      } else {
        if (!open) throw new Error("Clock in before clocking out.");
        open.outAt = now;
        open.state = offline ? "Waiting to sync" : "Verification pending";
      }
    });
  }
  async saveLesson(c: Context, input: LessonInput, id?: string) {
    this.authorize(c, "lessons");
    const data = LessonInputSchema.parse(input);
    await this.mutate((db) => {
      const old = id
        ? db.lessons.find(
            (l) =>
              l.id === id && l.schoolId === c.schoolId && l.userId === c.userId,
          )
        : undefined;
      if (id && !old) throw new Error("Lesson not found.");
      if (old) Object.assign(old, data);
      else
        db.lessons.push({
          ...data,
          id: this.id("LES"),
          schoolId: c.schoolId,
          userId: c.userId,
          status: "Saved on device",
        });
    });
  }
  async leave(
    c: Context,
    input: LeaveInput,
    draft: boolean,
    offline: boolean,
    id?: string,
  ) {
    this.authorize(c, "leave");
    const data = LeaveInputSchema.parse(input);
    await this.mutate((db) => {
      const status = draft
        ? "Draft"
        : offline
          ? "Waiting to sync"
          : "Submitted";
      if (id) {
        const old = db.leaves.find(
          (l) =>
            l.id === id &&
            l.schoolId === c.schoolId &&
            l.userId === c.userId &&
            l.status === "Draft",
        );
        if (!old) throw new Error("Only your draft requests can be edited.");
        Object.assign(old, data, { status });
      } else
        db.leaves.push({
          ...data,
          id: this.id("LEV"),
          schoolId: c.schoolId,
          userId: c.userId,
          status,
        });
    });
  }
  async decideLeave(c: Context, id: string, approve: boolean) {
    this.authorize(c, "approvals");
    await this.mutate((db) => {
      const l = db.leaves.find(
        (l) =>
          l.id === id && l.schoolId === c.schoolId && l.status === "Submitted",
      );
      if (!l) throw new Error("Submitted request not found.");
      l.status = approve ? "Approved" : "Rejected";
    });
  }
  async markRead(c: Context, id: string) {
    this.authorize(c);
    await this.mutate((db) => {
      const n = db.notices.find(
        (n) =>
          n.id === id &&
          n.schoolId === c.schoolId &&
          (!n.userId || n.userId === c.userId),
      );
      if (!n) throw new Error("Notification not found.");
      n.readBy = [...new Set([...(n.readBy ?? []), c.userId])];
    });
  }
  async remind(c: Context, invoiceId: string) {
    this.authorize(c, "finance");
    await this.mutate((db) => {
      const i = db.invoices.find(
        (i) => i.schoolId === c.schoolId && i.id === invoiceId,
      );
      const student = db.students.find(
        (s) => s.schoolId === c.schoolId && s.id === i?.studentId,
      );
      if (!i || !student || balance(i) <= 0)
        throw new Error("No outstanding balance to remind.");
      db.notices.push({
        id: this.id("N"),
        schoolId: c.schoolId,
        userId: student.guardianId,
        title: "Fee reminder · simulated delivery",
        body: "Please review your outstanding school fees.",
        at: this.now().toISOString(),
        read: false,
        target: "fees",
        recordId: student.id,
      });
    });
  }
  async sync(c: Context, offline: boolean, reject: boolean) {
    this.authorize(c);
    if (offline)
      throw new Error("Turn off offline simulation to run demo sync.");
    await this.mutate((db) => {
      db.attendance
        .filter(
          (a) =>
            a.schoolId === c.schoolId &&
            a.userId === c.userId &&
            a.state !== "Demo verified",
        )
        .forEach(
          (a) => (a.state = reject ? "Needs attention" : "Demo verified"),
        );
      db.leaves
        .filter(
          (l) =>
            l.schoolId === c.schoolId &&
            l.userId === c.userId &&
            l.status === "Waiting to sync",
        )
        .forEach((l) => (l.status = "Submitted"));
    });
  }
  async reset() {
    await this.mutate((db) => Object.assign(db, this.initialDatabase || emptyDatabase()));
  }

  private otpStore = new Map<string, { code: string; expiresAt: number }>();

  async findUserByEmail(email: string) {
    const rawDb = this.db;
    if (!rawDb) return null;
    const clean = email.trim().toLowerCase();

    // 1. Check in staff
    const staffMatch = rawDb.staff.find(
      (s) => s.email && s.email.trim().toLowerCase() === clean,
    );
    if (staffMatch) {
      const school = rawDb.schools.find((sc) => sc.id === staffMatch.schoolId);
      return {
        schoolId: staffMatch.schoolId,
        userId: staffMatch.userId,
        role: (staffMatch.role as Role) || "staff",
        name: staffMatch.name,
        schoolName: school?.name || "Campus Workspace",
      };
    }

    // 2. Check in memberships
    const memberMatch = rawDb.memberships.find(
      (m) =>
        m.userId.toLowerCase() === clean ||
        m.name.toLowerCase().includes(clean) ||
        (clean.includes("owner") && m.roles.includes("owner")) ||
        (clean.includes("proprietor") && m.roles.includes("owner")),
    );
    if (memberMatch) {
      const school = rawDb.schools.find((sc) => sc.id === memberMatch.schoolId);
      return {
        schoolId: memberMatch.schoolId,
        userId: memberMatch.userId,
        role: memberMatch.roles[0] || "owner",
        name: memberMatch.name,
        schoolName: school?.name || "Campus Workspace",
      };
    }

    // 3. Check in students (for guardian / parent)
    const studentMatch = rawDb.students.find(
      (st) =>
        (st.guardianEmail && st.guardianEmail.trim().toLowerCase() === clean) ||
        (st.guardianPhone && st.guardianPhone.trim().toLowerCase() === clean),
    );
    if (studentMatch) {
      const school = rawDb.schools.find((sc) => sc.id === studentMatch.schoolId);
      return {
        schoolId: studentMatch.schoolId,
        userId: studentMatch.guardianId || "guardian-1",
        role: "parent" as Role,
        name: "Parent of " + studentMatch.name,
        schoolName: school?.name || "Campus Workspace",
      };
    }

    // 4. Default known aliases
    if (
      clean === "proprietor@cedargrove.ng" ||
      clean === "owner@example.invalid" ||
      clean.includes("proprietor")
    ) {
      const school = rawDb.schools[0]!;
      return {
        schoolId: school.id,
        userId: "demo-owner",
        role: "owner" as Role,
        name: "School Proprietor",
        schoolName: school.name,
      };
    }
    if (clean === "teacher@example.invalid" || clean.includes("teacher")) {
      const school = rawDb.schools[0]!;
      return {
        schoolId: school.id,
        userId: "demo-teacher",
        role: "teacher" as Role,
        name: "Tomi Adebayo",
        schoolName: school.name,
      };
    }
    if (clean === "parent@example.invalid" || clean.includes("parent")) {
      const school = rawDb.schools[0]!;
      return {
        schoolId: school.id,
        userId: "demo-parent",
        role: "parent" as Role,
        name: "Ada Okafor",
        schoolName: school.name,
      };
    }

    return null;
  }

  async requestOtp(email: string, isSignUp = false) {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      return {
        success: false,
        message: "Please provide a valid email address.",
        otpCode: "",
      };
    }

    // 1. Delegate to Backend API (dispatches via Resend from hello@padeespace.com)
    try {
      const res = await fetch(`${env.backendUrl}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean, isSignUp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message || `Verification code sent to ${email}`,
          otpCode: "",
        };
      }
      if (!res.ok && data.message) {
        return {
          success: false,
          message: data.message,
          otpCode: "",
        };
      }
    } catch {
      // Backend offline or local fallback for unit tests
    }

    if (!isSignUp) {
      const user = await this.findUserByEmail(clean);
      if (!user) {
        return {
          success: false,
          message: `No active account found for "${email}". If you are a staff member, please ask your School Proprietor to invite you.`,
          otpCode: "",
        };
      }
    }

    // Fallback: Dispatches real email directly via Resend from hello@padeespace.com
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(clean, {
      code: otpCode,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    try {
      await sendOtpEmail({
        to: clean,
        otpCode,
        isSignUp,
      });
    } catch (sendErr) {
      console.warn("[Direct Resend Dispatch Error]", sendErr);
    }

    return {
      success: true,
      message: `Verification code dispatched to ${email}`,
      otpCode,
    };
  }

  async verifyOtp(email: string, code: string, isSignUp = false) {
    const clean = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    // 1. Delegate to Backend API
    try {
      const res = await fetch(`${env.backendUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean, code: trimmedCode, isSignUp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (isSignUp) {
          return {
            schoolId: "",
            userId: "new-owner",
            role: "owner" as Role,
            name: "Verified Proprietor",
          };
        }
        if (data.user) {
          return {
            schoolId: data.user.schoolId,
            userId: data.user.userId,
            role: data.user.role as Role,
            name: data.user.name,
          };
        }
      }
    } catch {
      // Backend offline or local fallback
    }

    // Local fallback for offline/unit tests
    const stored = this.otpStore.get(clean);
    const isValid = Boolean(
      stored &&
      stored.code === trimmedCode &&
      stored.expiresAt > Date.now()
    );

    if (!isValid) {
      return null;
    }

    if (isSignUp) {
      return {
        schoolId: "",
        userId: "new-owner",
        role: "owner" as Role,
        name: "Verified Proprietor",
      };
    }

    const user = await this.findUserByEmail(clean);
    return user;
  }

  async registerSchoolWithProprietor(input: {
    proprietorTitle?: PersonTitle;
    proprietorFirstName?: string;
    proprietorMiddleName?: string;
    proprietorLastName?: string;
    proprietorName?: string;
    email: string;
    phone?: string;
    schoolName: string;
    address: string;
    term?: string;
    motto?: string;
    coverPhoto?: string;
    openTime?: string;
    closeTime?: string;
    schedule?: DaySchedule[];
  }) {
    const schoolId = "sch-" + Math.random().toString(36).slice(2, 8);
    const userId = "usr-" + Math.random().toString(36).slice(2, 8);
    const role: Role = "owner";

    const proprietorFullName =
      input.proprietorName ||
      formatFullName({
        title: input.proprietorTitle,
        firstName: input.proprietorFirstName,
        middleName: input.proprietorMiddleName,
        lastName: input.proprietorLastName,
      }) ||
      "School Proprietor";

    await this.mutate((db) => {
      const school = {
        id: schoolId,
        name: input.schoolName,
        short: input.schoolName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 3)
          .toUpperCase(),
        color: "#0f172a",
        address: input.address,
        term: input.term || "First Term · 2026/27",
        motto: input.motto || "Excellence, Wisdom & Innovation",
        coverPhoto:
          input.coverPhoto ||
          "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
        openTime: input.openTime || "07:30",
        closeTime: input.closeTime || "15:30",
        schedule: input.schedule,
        bankName: "Wema Bank (Paystack Dedicated NUBAN)",
        accountNumber: `02${Math.abs(schoolId.split("").reduce((a, b) => a + b.charCodeAt(0), 0) % 90000000 + 10000000)}`,
        accountName: `${input.schoolName} - SchoolDay Treasury`,
        proprietorTitle: input.proprietorTitle,
        proprietorFirstName: input.proprietorFirstName,
        proprietorMiddleName: input.proprietorMiddleName,
        proprietorLastName: input.proprietorLastName,
      };
      db.schools.unshift(school);
      db.memberships.push({
        schoolId,
        userId,
        name: proprietorFullName,
        roles: ["owner", "admin"],
      });
      db.staff.push({
        id: schoolId + "-STF-01",
        schoolId,
        userId,
        titlePrefix: input.proprietorTitle,
        firstName: input.proprietorFirstName,
        middleName: input.proprietorMiddleName,
        lastName: input.proprietorLastName,
        name: proprietorFullName,
        title: "School Proprietor / Director",
        email: input.email.trim().toLowerCase(),
        phone: input.phone || "",
        role: "owner",
        rank: "Proprietor & Chancellor",
        status: "active",
      });
      db.classes = db.classes || [];
      db.classes.push(
        {
          id: schoolId + "-CLS-01",
          schoolId,
          name: "Primary 1 - Gold Eagles",
          code: "PRI-1G",
          termFee: 15000000,
          studentCount: 0,
        },
        {
          id: schoolId + "-CLS-02",
          schoolId,
          name: "Primary 2 - Diamond",
          code: "PRI-2D",
          termFee: 15000000,
          studentCount: 0,
        },
      );
      db.calendar = db.calendar || [];
      db.calendar.push(
        {
          id: schoolId + "-CAL-01",
          schoolId,
          title: "First Term Resumption",
          date: "2026-09-14",
          type: "term",
          description: "New academic session commencement.",
        },
        {
          id: schoolId + "-CAL-02",
          schoolId,
          title: "Mid-Term Assessment Week",
          date: "2026-10-26",
          type: "exam",
          description: "Mid-term examinations & progress reviews.",
        },
      );
    });

    return { schoolId, userId, role, name: proprietorFullName };
  }

  async createSchool(input: {
    name: string;
    address: string;
    term?: string;
    motto?: string;
    coverPhoto?: string;
    openTime?: string;
    closeTime?: string;
    ownerTitle?: PersonTitle;
    ownerFirstName?: string;
    ownerMiddleName?: string;
    ownerLastName?: string;
    ownerName?: string;
  }) {
    const schoolId = "sch-" + Math.random().toString(36).slice(2, 8);
    const userId = "demo-owner";
    const role: Role = "owner";
    const ownerFullName =
      input.ownerName ||
      formatFullName({
        title: input.ownerTitle,
        firstName: input.ownerFirstName,
        middleName: input.ownerMiddleName,
        lastName: input.ownerLastName,
      }) ||
      "School Proprietor";
    await this.mutate((db) => {
      const school = {
        id: schoolId,
        name: input.name,
        short: input.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 3)
          .toUpperCase(),
        color: "#0f172a",
        address: input.address,
        term: input.term || "First term · 2026/27",
        motto: input.motto || "Excellence, Wisdom & Innovation",
        coverPhoto:
          input.coverPhoto ||
          "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
        openTime: input.openTime || "07:30",
        closeTime: input.closeTime || "15:30",
        bankName: "Wema Bank (Paystack Dedicated NUBAN)",
        accountNumber: `02${Math.abs(schoolId.split("").reduce((a, b) => a + b.charCodeAt(0), 0) % 90000000 + 10000000)}`,
        accountName: `${input.name} - SchoolDay Treasury`,
        proprietorTitle: input.ownerTitle,
        proprietorFirstName: input.ownerFirstName,
        proprietorMiddleName: input.ownerMiddleName,
        proprietorLastName: input.ownerLastName,
      };
      db.schools.push(school);
      db.memberships.push({
        schoolId,
        userId,
        name: ownerFullName,
        roles: ["owner", "admin"],
      });
      db.staff.push({
        id: schoolId + "-STF-01",
        schoolId,
        userId,
        titlePrefix: input.ownerTitle,
        firstName: input.ownerFirstName,
        middleName: input.ownerMiddleName,
        lastName: input.ownerLastName,
        name: ownerFullName,
        title: "School Proprietor / Director",
        email:
          "proprietor@" +
          input.name.toLowerCase().replace(/[^a-z0-9]/g, "") +
          ".edu.ng",
        status: "active",
      });
      db.classes = db.classes || [];
      db.classes.push(
        {
          id: schoolId + "-CLS-01",
          schoolId,
          name: "Primary 1 Gold",
          code: "PR1-G",
          termFee: 15000000,
          studentCount: 0,
        },
        {
          id: schoolId + "-CLS-02",
          schoolId,
          name: "Primary 2 Emerald",
          code: "PR2-E",
          termFee: 15000000,
          studentCount: 0,
        },
      );
      db.calendar = db.calendar || [];
      db.calendar.push(
        {
          id: schoolId + "-CAL-01",
          schoolId,
          title: "First Term Resumption",
          date: "2026-09-14",
          type: "term",
          description: "School Resumption for Term 1",
          source: "State Ministry of Education",
        },
        {
          id: schoolId + "-CAL-02",
          schoolId,
          title: "Mid-Term Assessment Week",
          date: "2026-10-26",
          endDate: "2026-10-30",
          type: "exam",
          description: "Mid-term tests and evaluation",
          source: "School Academic Board",
        },
      );
    });
    return { schoolId, userId, role };
  }

  async updateSchool(c: Context, patch: Partial<School>) {
    this.authorize(c, "settings");
    await this.mutate((db) => {
      const school = db.schools.find((s) => s.id === c.schoolId);
      if (!school) throw new Error("School not found.");
      if (patch.name && patch.name.trim() !== school.name.trim()) {
        throw new Error("School name is accredited and cannot be edited.");
      }
      Object.assign(school, patch);
    });
  }

  async updateProfile(
    c: Context,
    patch: {
      titlePrefix?: PersonTitle;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      name?: string;
      phone?: string;
      email?: string;
      avatar?: string;
    },
  ) {
    this.authorize(c);
    await this.mutate((db) => {
      const computedName =
        patch.name ||
        (patch.firstName || patch.lastName
          ? formatFullName({
              title: patch.titlePrefix,
              firstName: patch.firstName,
              middleName: patch.middleName,
              lastName: patch.lastName,
            })
          : undefined);

      const membership = db.memberships.find(
        (m) => m.schoolId === c.schoolId && m.userId === c.userId,
      );
      if (membership) {
        if (computedName) membership.name = computedName;
        if (patch.avatar !== undefined) membership.avatar = patch.avatar;
      }
      const staff = db.staff.find(
        (s) => s.schoolId === c.schoolId && s.userId === c.userId,
      );
      if (staff) {
        if (patch.titlePrefix) staff.titlePrefix = patch.titlePrefix;
        if (patch.firstName) staff.firstName = patch.firstName;
        if (patch.middleName) staff.middleName = patch.middleName;
        if (patch.lastName) staff.lastName = patch.lastName;
        if (computedName) staff.name = computedName;
        if (patch.phone) staff.phone = patch.phone;
        if (patch.email) staff.email = patch.email;
        if (patch.avatar !== undefined) staff.avatar = patch.avatar;
      }
    });
  }

  async inviteStaff(
    c: Context,
    staff: {
      titlePrefix?: PersonTitle;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      name?: string;
      email: string;
      role: Role;
      title: string;
      rank?: string;
      assignedClass?: string;
      assignedClasses?: string[];
      phone?: string;
    },
  ) {
    this.authorize(c, "directory");
    const cleanEmail = staff.email.trim().toLowerCase();
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    const staffFullName =
      staff.name ||
      formatFullName({
        title: staff.titlePrefix,
        firstName: staff.firstName,
        middleName: staff.middleName,
        lastName: staff.lastName,
      }) ||
      "Faculty Staff";

    // Store active OTP credential for 24h login access
    this.otpStore.set(cleanEmail, {
      code: otpCode,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    let schoolName = "Your School";
    await this.mutate((db) => {
      const currentSchool = db.schools.find((s) => s.id === c.schoolId);
      if (currentSchool) schoolName = currentSchool.name;
      const newUserId = "stf-" + Math.random().toString(36).slice(2, 7);
      const newStaffId =
        c.schoolId +
        "-STF-" +
        (db.staff.filter((s) => s.schoolId === c.schoolId).length + 1);
      db.memberships.push({
        schoolId: c.schoolId,
        userId: newUserId,
        name: staffFullName,
        roles: [staff.role],
      });
      const resolvedClasses =
        staff.assignedClasses && staff.assignedClasses.length > 0
          ? staff.assignedClasses
          : staff.assignedClass
            ? [staff.assignedClass]
            : [];
      db.staff.push({
        id: newStaffId,
        schoolId: c.schoolId,
        userId: newUserId,
        titlePrefix: staff.titlePrefix,
        firstName: staff.firstName,
        middleName: staff.middleName,
        lastName: staff.lastName,
        name: staffFullName,
        title: staff.title,
        email: cleanEmail,
        phone: staff.phone,
        role: staff.role,
        rank: staff.rank || "Staff Member",
        assignedClass: resolvedClasses[0] || staff.assignedClass,
        assignedClasses: resolvedClasses,
        status: "active",
      });
      db.payroll.push({
        id: c.schoolId + "-PAY-" + newUserId,
        schoolId: c.schoolId,
        userId: newUserId,
        period: "October 2026",
        basic: 18000000,
        allowances: 2500000,
        deductions: 1500000,
        status: "Draft",
        mode: "automatic",
      });
    });

    // 1. Backend API synchronization for PostgreSQL otps & staff table
    try {
      await fetch(`${env.backendUrl}/api/staff/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: c.schoolId,
          name: staff.name,
          email: cleanEmail,
          role: staff.role,
          title: staff.title,
          rank: staff.rank,
          phone: staff.phone,
          assignedClasses: staff.assignedClasses,
        }),
      });
    } catch {
      // Backend offline fallback handled below
    }

    // 2. Direct Resend Dispatch Fallback with Login OTP
    try {
      await sendStaffInvitationEmail({
        to: cleanEmail,
        recipientName: staff.name,
        schoolName,
        role: staff.role,
        title: staff.title,
        otpCode,
      });
    } catch (e) {
      console.warn("[Staff Invitation Email Notice]", e);
    }
  }

  async updateStaff(
    c: Context,
    staffId: string,
    patch: {
      name?: string;
      title?: string;
      role?: Role;
      rank?: string;
      assignedClasses?: string[];
      assignedClass?: string;
      status?: "active" | "invited" | "suspended";
      permissions?: string[];
    },
  ) {
    this.authorize(c, "directory");
    await this.mutate((db) => {
      const member = db.staff.find(
        (s) => s.id === staffId && s.schoolId === c.schoolId,
      );
      if (!member) throw new Error("Staff member not found");
      if (patch.name !== undefined) member.name = patch.name;
      if (patch.title !== undefined) member.title = patch.title;
      if (patch.role !== undefined) member.role = patch.role;
      if (patch.rank !== undefined) member.rank = patch.rank;
      if (patch.permissions !== undefined) member.permissions = patch.permissions;
      if (patch.assignedClasses !== undefined) {
        member.assignedClasses = patch.assignedClasses;
        member.assignedClass = patch.assignedClasses[0] || member.assignedClass;
      } else if (patch.assignedClass !== undefined) {
        member.assignedClass = patch.assignedClass;
        member.assignedClasses = [patch.assignedClass];
      }
      if (patch.status !== undefined) member.status = patch.status;

      if (patch.role || patch.name) {
        const mem = db.memberships.find(
          (m) => m.userId === member.userId && m.schoolId === c.schoolId,
        );
        if (mem) {
          if (patch.name) mem.name = patch.name;
          if (patch.role) mem.roles = [patch.role];
        }
      }
    });
  }

  async createClass(
    c: Context,
    cls: {
      name: string;
      code?: string;
      termFee?: number;
      teacherUserId?: string;
    },
  ) {
    this.authorize(c, "settings");
    await this.mutate((db) => {
      db.classes = db.classes || [];
      const code =
        cls.code ||
        cls.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase();
      db.classes.push({
        id:
          c.schoolId +
          "-CLS-" +
          (db.classes.filter((cl) => cl.schoolId === c.schoolId).length + 1),
        schoolId: c.schoolId,
        name: cls.name,
        code,
        teacherUserId: cls.teacherUserId,
        termFee: cls.termFee ?? 15000000,
        studentCount: 0,
      });
    });
  }

  async createClassesBatch(
    c: Context,
    classes: Array<{
      name: string;
      code?: string;
      termFee?: number;
      capacity?: number;
      teacherUserId?: string;
    }>,
  ) {
    this.authorize(c, "settings");
    await this.mutate((db) => {
      db.classes = db.classes || [];
      for (const cls of classes) {
        const cleanName = cls.name.trim();
        const exists = db.classes.some(
          (cl) =>
            cl.schoolId === c.schoolId &&
            cl.name.toLowerCase() === cleanName.toLowerCase(),
        );
        if (exists) continue;
        const code =
          cls.code ||
          cleanName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase();
        db.classes.push({
          id:
            c.schoolId +
            "-CLS-" +
            (db.classes.filter((cl) => cl.schoolId === c.schoolId).length + 1),
          schoolId: c.schoolId,
          name: cleanName,
          code,
          teacherUserId: cls.teacherUserId,
          termFee: cls.termFee ?? 15000000,
          studentCount: 0,
        });
      }
    });
  }

  async updateClass(
    c: Context,
    classId: string,
    patch: {
      name?: string;
      code?: string;
      termFee?: number;
      teacherUserId?: string;
    },
  ) {
    this.authorize(c, "settings");
    await this.mutate((db) => {
      db.classes = db.classes || [];
      const cls = db.classes.find(
        (cl) => cl.id === classId && cl.schoolId === c.schoolId,
      );
      if (!cls) throw new Error("Classroom not found.");
      if (patch.name !== undefined) cls.name = patch.name;
      if (patch.code !== undefined) cls.code = patch.code;
      if (patch.termFee !== undefined) cls.termFee = patch.termFee;
      if (patch.teacherUserId !== undefined) cls.teacherUserId = patch.teacherUserId;
    });
  }

  async addStudentsBatch(
    c: Context,
    students: Array<{
      firstName?: string;
      middleName?: string;
      lastName?: string;
      name?: string;
      className: string;
      classes?: string[];
      guardianName?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      feeAmount?: number;
    }>,
  ) {
    this.authorize(c, "students");
    let addedCount = 0;
    await this.mutate((db) => {
      for (const st of students) {
        const studentIndex =
          db.students.filter((s) => s.schoolId === c.schoolId).length + 1;
        const studentId =
          c.schoolId + "-STU-" + String(studentIndex).padStart(3, "0");
        const guardianId = st.guardianPhone
          ? `gua-${st.guardianPhone.replace(/[^0-9]/g, "").slice(-6)}`
          : "demo-parent";
        const guardianDisplayName =
          st.guardianName || (st.lastName ? `${st.lastName} Family Guardian` : "Parent / Guardian");
        const studentClasses =
          st.classes && st.classes.length > 0
            ? st.classes
            : st.className.includes(" & ")
            ? st.className.split(" & ").map((s) => s.trim())
            : [st.className];

        const studentFullName =
          st.name ||
          formatFullName({
            firstName: st.firstName,
            middleName: st.middleName,
            lastName: st.lastName,
          }) ||
          "Student";

        db.students.push({
          id: studentId,
          schoolId: c.schoolId,
          firstName: st.firstName,
          middleName: st.middleName,
          lastName: st.lastName,
          name: studentFullName,
          className: st.className,
          classes: studentClasses,
          guardianId,
          guardianName: guardianDisplayName,
          guardianRelationship: "Parent / Guardian",
          guardianPhone: st.guardianPhone,
          guardianEmail: st.guardianEmail,
        });

        // Ensure parent membership exists so they appear in parents directory and can log in
        if (!db.memberships.some((m) => m.schoolId === c.schoolId && m.userId === guardianId)) {
          db.memberships.push({
            schoolId: c.schoolId,
            userId: guardianId,
            name: guardianDisplayName,
            roles: ["parent"],
          });
        }
        const termFee = st.feeAmount ?? 15000000;
        db.invoices.push({
          id: c.schoolId + "-INV-" + (db.invoices.length + 100),
          schoolId: c.schoolId,
          studentId,
          due: "2026-11-15",
          items: [
            { label: "Tuition Fee", amount: Math.round(termFee * 0.75) },
            {
              label: "Development Levy & Learning Materials",
              amount: Math.round(termFee * 0.25),
            },
          ],
          paid: 0,
        });
        addedCount++;
      }
      db.classes = db.classes || [];
      for (const cl of db.classes.filter((cl) => cl.schoolId === c.schoolId)) {
        cl.studentCount = db.students.filter(
          (s) =>
            s.schoolId === c.schoolId &&
            (s.className === cl.name ||
              s.classes?.includes(cl.name) ||
              s.className.includes(cl.name)),
        ).length;
      }
    });
    return addedCount;
  }

  async populateCalendar(
    c: Context,
    events: Array<{
      title: string;
      date: string;
      endDate?: string;
      type: CalendarEvent["type"];
      description?: string;
      source?: string;
    }>,
  ) {
    this.authorize(c, "settings");
    let count = 0;
    await this.mutate((db) => {
      db.calendar = db.calendar || [];
      for (const ev of events) {
        db.calendar.push({
          id: c.schoolId + "-CAL-" + Math.random().toString(36).slice(2, 8),
          schoolId: c.schoolId,
          title: ev.title,
          date: ev.date,
          endDate: ev.endDate,
          type: ev.type,
          description: ev.description,
          source: ev.source || "Government Ministry of Education",
        });
        count++;
      }
    });
    return count;
  }

  async updateCalendarEvent(
    c: Context,
    eventId: string,
    patch: {
      title?: string;
      date?: string;
      endDate?: string;
      type?: CalendarEvent["type"];
      description?: string;
    },
  ) {
    this.authorize(c, "settings");
    await this.mutate((db) => {
      const ev = (db.calendar || []).find((e) => e.id === eventId);
      if (ev) {
        if (patch.title !== undefined) ev.title = patch.title;
        if (patch.date !== undefined) ev.date = patch.date;
        if (patch.endDate !== undefined) ev.endDate = patch.endDate;
        if (patch.type !== undefined) ev.type = patch.type;
        if (patch.description !== undefined) ev.description = patch.description;
      }
    });
  }

  async deleteCalendarEvent(c: Context, eventId: string) {
    this.authorize(c, "settings");
    await this.mutate((db) => {
      db.calendar = (db.calendar || []).filter((e) => e.id !== eventId);
    });
  }

  async postNotice(
    c: Context,
    notice: {
      title: string;
      body: string;
      target: "fees" | "attendance" | "leave" | "lessons" | "home";
      recordId?: string;
    },
  ) {
    this.authorize(c);
    await this.mutate((db) => {
      db.notices.push({
        id: this.id("N"),
        schoolId: c.schoolId,
        title: notice.title,
        body: notice.body,
        at: this.now().toISOString(),
        read: false,
        target: notice.target,
        recordId: notice.recordId,
      });
    });
  }

  async updatePayroll(
    c: Context,
    payrollId: string,
    patch: {
      basic?: number;
      allowances?: number;
      deductions?: number;
      status?: "Draft" | "Approved" | "Paid";
    },
  ) {
    this.authorize(c, "payroll");
    await this.mutate((db) => {
      const record = db.payroll.find(
        (p) => p.id === payrollId && p.schoolId === c.schoolId,
      );
      if (!record) throw new Error("Payroll record not found.");
      if (patch.basic !== undefined) record.basic = patch.basic;
      if (patch.allowances !== undefined) record.allowances = patch.allowances;
      if (patch.deductions !== undefined) record.deductions = patch.deductions;
      if (patch.status !== undefined) {
        record.status = patch.status;
        if (patch.status === "Paid") {
          record.disbursedAt = this.now().toISOString();
        }
      }
    });
  }

  async processAutomaticPayroll(c: Context) {
    this.authorize(c, "payroll");
    let count = 0;
    await this.mutate((db) => {
      const now = this.now().toISOString();
      const records = db.payroll.filter((p) => p.schoolId === c.schoolId);
      for (const r of records) {
        r.status = "Paid";
        r.mode = "automatic";
        r.disbursedAt = now;
        count++;
      }
    });
    return count;
  }

  async recordDirectPayment(
    c: Context,
    input: {
      studentId: string;
      amount: number;
      method: "card" | "transfer" | "ussd";
      category?: string;
      reference?: string;
      invoiceId?: string;
    },
  ): Promise<Payment> {
    if (
      !can(c.role, "finance") &&
      !can(c.role, "payments") &&
      c.role !== "teacher" &&
      c.role !== "student" &&
      c.role !== "parent"
    ) {
      this.authorize(c, "finance");
    }
    return this.mutate((db) => {
      const student = db.students.find(
        (s) => s.id === input.studentId && s.schoolId === c.schoolId,
      );
      if (!student) throw new Error("Student not found.");

      let remainingToAllocate = input.amount;
      const targetInvoiceIds: string[] = [];

      let candidateInvoices = db.invoices.filter(
        (inv) =>
          inv.studentId === student.id &&
          inv.schoolId === c.schoolId &&
          balance(inv) > 0,
      );

      if (input.invoiceId) {
        const spec = candidateInvoices.find((i) => i.id === input.invoiceId);
        if (spec) {
          candidateInvoices = [spec, ...candidateInvoices.filter((i) => i.id !== input.invoiceId)];
        }
      }

      for (const inv of candidateInvoices) {
        if (remainingToAllocate <= 0) break;
        targetInvoiceIds.push(inv.id);
        const alloc = Math.min(balance(inv), remainingToAllocate);
        remainingToAllocate -= alloc;
      }

      // If user is paying more than current invoice balance or making an advance payment
      if (remainingToAllocate > 0) {
        const advInvoice = {
          id: this.id("INV"),
          schoolId: c.schoolId,
          studentId: student.id,
          due: this.now().toISOString().split("T")[0]!,
          items: [
            {
              label: input.category || "Tuition / Advance Fees",
              amount: remainingToAllocate,
            },
          ],
          paid: 0,
        };
        db.invoices.push(advInvoice);
        targetInvoiceIds.push(advInvoice.id);
      }

      const p: Payment = {
        id: input.reference || this.id("RCT"),
        schoolId: c.schoolId,
        userId: c.userId,
        invoiceIds: targetInvoiceIds,
        amount: input.amount,
        method: input.method,
        state: "settled",
        key: this.id("KEY"),
        createdAt: this.now().toISOString(),
      };
      (p as any).studentId = student.id;

      settlePayment(db, p);
      db.payments.push(p);

      db.notices.push({
        id: this.id("N"),
        schoolId: c.schoolId,
        userId: c.userId,
        title: `Payment Received: ${student.name}`,
        body: `₦${(input.amount / 100).toLocaleString("en-NG")} recorded via ${input.method.toUpperCase()} for ${input.category || "Tuition"}.`,
        at: p.createdAt,
        read: false,
        target: "fees",
        recordId: student.id,
      });

      return p;
    });
  }

  async recordWithdrawal(
    c: Context,
    input: {
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
      narration?: string;
    },
  ): Promise<{ id: string; amount: number; reference: string; at: string }> {
    this.authorize(c, "finance");
    return this.mutate((db) => {
      const now = this.now().toISOString();
      const ref = "WDL-" + Math.floor(100000 + Math.random() * 900000);
      const id = this.id("WDL");

      db.notices.push({
        id: this.id("N"),
        schoolId: c.schoolId,
        userId: c.userId,
        title: "Treasury Withdrawal Dispatched",
        body: `₦${(input.amount / 100).toLocaleString("en-NG")} sent to ${input.bankName} (${input.accountNumber}). Ref: ${ref}`,
        at: now,
        read: false,
        target: "fees",
      });

      return {
        id,
        amount: input.amount,
        reference: ref,
        at: now,
      };
    });
  }

  async markStudentAttendance(
    c: Context,
    input: {
      studentId: string;
      date: string;
      session: "morning" | "afternoon" | "full_day";
      status: "present" | "absent" | "late";
      classId?: string;
      className?: string;
      remark?: string;
    },
  ): Promise<StudentAttendance> {
    this.authorize(c, "attendance");
    const today = this.now().toISOString().slice(0, 10);
    if (input.date > today) {
      throw new Error("Cannot record attendance for future dates.");
    }
    return this.mutate((db) => {
      if (!db.studentAttendance) db.studentAttendance = [];
      const now = this.now().toISOString();
      const existingIdx = db.studentAttendance.findIndex(
        (a) =>
          a.schoolId === c.schoolId &&
          a.studentId === input.studentId &&
          a.date === input.date &&
          (a.session === input.session || input.session === "full_day" || a.session === "full_day"),
      );

      const targetStudent = db.students.find((s) => s.id === input.studentId);
      const studentClass = input.className || targetStudent?.className;

      if (existingIdx >= 0) {
        const record = db.studentAttendance[existingIdx]!;
        record.status = input.status;
        record.session = input.session;
        record.markedByUserId = c.userId;
        record.markedAt = now;
        if (input.remark) record.remark = input.remark;
        if (studentClass) record.className = studentClass;
        return record;
      }

      const newRecord: StudentAttendance = {
        id: this.id("SATT"),
        schoolId: c.schoolId,
        studentId: input.studentId,
        classId: input.classId,
        className: studentClass,
        date: input.date,
        session: input.session,
        status: input.status,
        markedByUserId: c.userId,
        markedAt: now,
        term: db.schools[0]?.term || "First Term",
        remark: input.remark,
      };

      db.studentAttendance.push(newRecord);
      return newRecord;
    });
  }

  async submitClassRollCall(
    c: Context,
    input: {
      classId: string;
      className: string;
      date: string;
      session: "morning" | "afternoon";
      records: Array<{
        studentId: string;
        status: "present" | "absent" | "late";
        remark?: string;
      }>;
    },
  ): Promise<number> {
    this.authorize(c, "attendance");
    const today = this.now().toISOString().slice(0, 10);
    if (input.date > today) {
      throw new Error("Cannot record attendance for future dates.");
    }
    return this.mutate((db) => {
      if (!db.studentAttendance) db.studentAttendance = [];
      const now = this.now().toISOString();
      let updatedCount = 0;

      for (const rec of input.records) {
        const existingIdx = db.studentAttendance.findIndex(
          (a) =>
            a.schoolId === c.schoolId &&
            a.studentId === rec.studentId &&
            a.date === input.date &&
            a.session === input.session,
        );

        if (existingIdx >= 0) {
          const row = db.studentAttendance[existingIdx]!;
          row.status = rec.status;
          row.markedByUserId = c.userId;
          row.markedAt = now;
          row.className = input.className;
          if (rec.remark) row.remark = rec.remark;
          updatedCount++;
        } else {
          db.studentAttendance.push({
            id: this.id("SATT"),
            schoolId: c.schoolId,
            studentId: rec.studentId,
            classId: input.classId,
            className: input.className,
            date: input.date,
            session: input.session,
            status: rec.status,
            markedByUserId: c.userId,
            markedAt: now,
            term: db.schools[0]?.term || "First Term",
            remark: rec.remark,
          });
          updatedCount++;
        }
      }

      return updatedCount;
    });
  }
}
