import { z } from "zod";

export const roles = [
  "parent",
  "teacher",
  "staff",
  "finance",
  "hr",
  "admin",
  "owner",
] as const;
export const RoleSchema = z.enum(roles);
export type Role = z.infer<typeof RoleSchema>;
export const permissions = {
  parent: ["children", "fees", "payments", "profile"],
  teacher: ["profile", "attendance", "lessons", "leave", "payroll", "students", "classes"],
  staff: ["profile", "attendance", "leave", "payroll"],
  finance: ["students", "fees", "payments", "finance", "profile"],
  hr: ["directory", "approvals", "attendanceReview", "payroll", "profile"],
  admin: [
    "students",
    "directory",
    "approvals",
    "finance",
    "payments",
    "fees",
    "settings",
    "profile",
    "classes",
    "calendar",
    "staffManage",
    "payroll",
    "attendance",
    "attendanceReview",
    "lessons",
    "leave",
    "children",
  ],
  owner: [
    "students",
    "directory",
    "approvals",
    "finance",
    "payments",
    "fees",
    "payroll",
    "settings",
    "profile",
    "classes",
    "calendar",
    "staffManage",
    "attendance",
    "attendanceReview",
    "lessons",
    "leave",
    "children",
  ],
} satisfies Record<Role, string[]>;
export type Permission = (typeof permissions)[Role][number];
export const can = (role: Role, action: string, customPermissions?: string[]) => {
  if (role === "owner" || role === "admin") return true;
  if (customPermissions && customPermissions.includes(action)) return true;
  return permissions[role]?.some((p) => p === action) ?? false;
};
export const ContextSchema = z.object({
  schoolId: z.string(),
  userId: z.string(),
  role: RoleSchema,
});
export type Context = z.infer<typeof ContextSchema>;
export const DayScheduleSchema = z.object({
  day: z.string(),
  short: z.string(),
  open: z.string(),
  close: z.string(),
  enabled: z.boolean(),
});
export type DaySchedule = z.infer<typeof DayScheduleSchema>;

export const personTitles = [
  "Mr.",
  "Mrs.",
  "Ms.",
  "Miss",
  "Dr.",
  "Prof.",
  "Engr.",
  "Barr.",
  "Chief",
  "Pastor",
  "Rev.",
  "Alhaji",
  "Alhaja",
] as const;
export const PersonTitleSchema = z.enum(personTitles);
export type PersonTitle = z.infer<typeof PersonTitleSchema>;

export function formatFullName(parts: {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}): string {
  return [parts.title, parts.firstName, parts.middleName, parts.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  color: z.string(),
  address: z.string(),
  term: z.string(),
  motto: z.string().optional(),
  coverPhoto: z.string().optional(),
  openTime: z.string().optional().default("07:30"),
  closeTime: z.string().optional().default("15:30"),
  schedule: z.array(DayScheduleSchema).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  proprietorTitle: PersonTitleSchema.optional(),
  proprietorFirstName: z.string().optional(),
  proprietorMiddleName: z.string().optional(),
  proprietorLastName: z.string().optional(),
});
export type School = z.infer<typeof SchoolSchema>;
export const MembershipSchema = z.object({
  schoolId: z.string(),
  userId: z.string(),
  name: z.string(),
  roles: z.array(RoleSchema),
  avatar: z.string().optional(),
});
export const StudentSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string(),
  className: z.string(),
  classes: z.array(z.string()).optional(),
  guardianId: z.string(),
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
  avatar: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().optional(),
  gender: z.string().optional(),
});
export type Student = z.infer<typeof StudentSchema>;
export const StaffSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  titlePrefix: PersonTitleSchema.optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string(),
  title: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  status: z.enum(["active", "invited", "suspended"]).optional(),
  role: RoleSchema.optional(),
  rank: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  assignedClass: z.string().optional(),
  assignedClasses: z.array(z.string()).optional(),
});
export type Staff = z.infer<typeof StaffSchema>;
export const InvoiceSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  studentId: z.string(),
  due: z.string(),
  items: z.array(
    z.object({ label: z.string(), amount: z.number().int().nonnegative() }),
  ),
  paid: z.number().int().nonnegative(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;
export const total = (i: Invoice) =>
  i.items.reduce((s, item) => s + item.amount, 0);
export const balance = (i: Invoice) => total(i) - i.paid;
export const invoiceStatus = (
  i: Invoice,
  today = new Date().toISOString().slice(0, 10),
) =>
  balance(i) === 0
    ? "Paid"
    : i.due < today
      ? "Overdue"
      : i.paid > 0
        ? "Partially paid"
        : "Due";
export const money = (kobo: number) =>
  "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
export const PaymentSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  invoiceIds: z.array(z.string()),
  amount: z.number().int().positive(),
  method: z.enum(["card", "transfer", "ussd"]),
  state: z.enum(["awaiting confirmation", "failed", "settled"]),
  createdAt: z.string(),
  key: z.string(),
  type: z.enum(["income", "payout"]).optional(),
  recipientName: z.string().optional(),
  note: z.string().optional(),
});
export const AttendanceSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  inAt: z.string(),
  outAt: z.string().optional(),
  state: z.enum([
    "Waiting to sync",
    "Verification pending",
    "Demo verified",
    "Needs attention",
  ]),
  photoVerified: z.boolean().optional(),
  locationVerified: z.boolean().optional(),
  locationName: z.string().optional(),
  arrivalStatus: z.string().optional(),
});
export type Attendance = z.infer<typeof AttendanceSchema>;
export const StudentAttendanceSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  studentId: z.string(),
  classId: z.string().optional(),
  className: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  session: z.enum(["morning", "afternoon", "full_day"]).default("morning"),
  status: z.enum(["present", "absent", "late"]).default("present"),
  markedByUserId: z.string().optional(),
  markedAt: z.string(),
  term: z.string().optional(),
  remark: z.string().optional(),
});
export type StudentAttendance = z.infer<typeof StudentAttendanceSchema>;
export const LessonInputSchema = z.object({
  subject: z.string().trim().min(2),
  className: z.string().trim().min(2),
  topic: z.string().trim().min(3),
  date: z.iso.date(),
  objectives: z.string().trim().min(5),
  content: z.string().trim().min(10),
});
export const LessonSchema = LessonInputSchema.extend({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  status: z.literal("Saved on device"),
});
export const LeaveInputSchema = z
  .object({
    type: z.enum(["Annual", "Medical", "Family"]),
    start: z.iso.date(),
    end: z.iso.date(),
    reason: z.string().trim().min(10),
  })
  .refine((x) => x.end >= x.start, "End date must follow start date");
export const LeaveSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  type: z.string(),
  start: z.string(),
  end: z.string(),
  reason: z.string(),
  status: z.enum([
    "Draft",
    "Waiting to sync",
    "Submitted",
    "Approved",
    "Rejected",
  ]),
});
export type Leave = z.infer<typeof LeaveSchema>;
export const NoticeSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string().optional(),
  title: z.string(),
  body: z.string(),
  at: z.string(),
  read: z.boolean(),
  readBy: z.array(z.string()).optional(),
  target: z.enum(["fees", "attendance", "leave", "lessons", "home"]),
  recordId: z.string().optional(),
});
export type Notice = z.infer<typeof NoticeSchema>;
export const PayrollSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  period: z.string(),
  basic: z.number().int().nonnegative(),
  allowances: z.number().int().nonnegative(),
  deductions: z.number().int().nonnegative(),
  status: z.enum(["Draft", "Approved", "Paid"]).default("Draft"),
  mode: z.enum(["automatic", "manual"]).optional(),
  disbursedAt: z.string().optional(),
});
export type Payroll = z.infer<typeof PayrollSchema>;

export const SchoolClassSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  code: z.string(),
  teacherUserId: z.string().optional(),
  termFee: z.number().int().nonnegative().default(15000000),
  studentCount: z.number().int().nonnegative().default(0),
});
export type SchoolClass = z.infer<typeof SchoolClassSchema>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  title: z.string(),
  date: z.string(),
  endDate: z.string().optional(),
  type: z.enum(["term", "holiday", "exam", "event", "break"]),
  description: z.string().optional(),
  source: z.string().optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const DatabaseSchema = z.object({
  version: z.literal(1),
  schools: z.array(SchoolSchema),
  memberships: z.array(MembershipSchema),
  students: z.array(StudentSchema),
  staff: z.array(StaffSchema),
  invoices: z.array(InvoiceSchema),
  payments: z.array(PaymentSchema),
  payroll: z.array(PayrollSchema),
  attendance: z.array(AttendanceSchema),
  lessons: z.array(LessonSchema),
  leaves: z.array(LeaveSchema),
  notices: z.array(NoticeSchema),
  classes: z.array(SchoolClassSchema).optional().default([]),
  calendar: z.array(CalendarEventSchema).optional().default([]),
  studentAttendance: z.array(StudentAttendanceSchema).optional().default([]),
});
export type Database = z.infer<typeof DatabaseSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type LessonInput = z.infer<typeof LessonInputSchema>;
export type LeaveInput = z.infer<typeof LeaveInputSchema>;
export type Snapshot = Database;
