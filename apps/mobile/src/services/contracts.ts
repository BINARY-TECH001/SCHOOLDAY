import {
  CalendarEvent,
  Context,
  Database,
  DaySchedule,
  LeaveInput,
  LessonInput,
  Payment,
  PersonTitle,
  Role,
  School,
  SchoolClass,
  StudentAttendance,
} from "../domain/model";
export interface PaymentRequest {
  invoiceIds: string[];
  amount: number;
  method: Payment["method"];
  fail: boolean;
  key: string;
}
export interface SchoolServices {
  initialize(): Promise<string | null>;
  catalog(): Pick<Database, "schools" | "memberships">;
  snapshot(context: Context): Database;
  pay(
    context: Context,
    request: PaymentRequest,
    offline: boolean,
  ): Promise<Payment>;
  confirmTransfer(
    context: Context,
    id: string,
    approve: boolean,
  ): Promise<void>;
  disburse(
    context: Context,
    req: {
      amount: number;
      recipientName: string;
      note?: string;
    },
  ): Promise<Payment>;
  attendance(
    context: Context,
    action: "in" | "out",
    offline: boolean,
    details?: {
      photoVerified?: boolean;
      locationName?: string;
      targetUserId?: string;
      method?: string;
    },
  ): Promise<void>;
  saveLesson(context: Context, input: LessonInput, id?: string): Promise<void>;
  leave(
    context: Context,
    input: LeaveInput,
    draft: boolean,
    offline: boolean,
    id?: string,
  ): Promise<void>;
  decideLeave(context: Context, id: string, approve: boolean): Promise<void>;
  markRead(context: Context, id: string): Promise<void>;
  remind(context: Context, invoiceId: string): Promise<void>;
  sync(context: Context, offline: boolean, reject: boolean): Promise<void>;
  reset(): Promise<void>;

  // Authentication & Passwordless OTP Suite
  findUserByEmail(email: string): Promise<{
    schoolId: string;
    userId: string;
    role: Role;
    name: string;
    schoolName: string;
  } | null>;
  requestOtp(email: string, isSignUp?: boolean): Promise<{
    success: boolean;
    message: string;
    otpCode: string;
  }>;
  verifyOtp(email: string, code: string, isSignUp?: boolean): Promise<{
    schoolId: string;
    userId: string;
    role: Role;
    name: string;
  } | null>;
  registerSchoolWithProprietor(input: {
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
  }): Promise<{ schoolId: string; userId: string; role: Role; name: string }>;

  // School Owner & Modern Operational Suite
  createSchool(input: {
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
  }): Promise<{ schoolId: string; userId: string; role: Role }>;
  updateSchool(context: Context, patch: Partial<School>): Promise<void>;
  updateProfile(
    context: Context,
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
  ): Promise<void>;
  inviteStaff(
    context: Context,
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
  ): Promise<void>;
  updateStaff(
    context: Context,
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
  ): Promise<void>;
  createClass(
    context: Context,
    cls: {
      name: string;
      code?: string;
      termFee?: number;
      teacherUserId?: string;
    },
  ): Promise<void>;
  createClassesBatch(
    context: Context,
    classes: Array<{
      name: string;
      code?: string;
      termFee?: number;
      capacity?: number;
      teacherUserId?: string;
    }>,
  ): Promise<void>;
  updateClass(
    context: Context,
    classId: string,
    patch: {
      name?: string;
      code?: string;
      termFee?: number;
      teacherUserId?: string;
    },
  ): Promise<void>;
  addStudentsBatch(
    context: Context,
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
  ): Promise<number>;
  populateCalendar(
    context: Context,
    events: Array<{
      title: string;
      date: string;
      endDate?: string;
      type: CalendarEvent["type"];
      description?: string;
      source?: string;
    }>,
  ): Promise<number>;
  updateCalendarEvent(
    context: Context,
    eventId: string,
    patch: {
      title?: string;
      date?: string;
      endDate?: string;
      type?: CalendarEvent["type"];
      description?: string;
    },
  ): Promise<void>;
  deleteCalendarEvent(context: Context, eventId: string): Promise<void>;
  postNotice(
    context: Context,
    notice: {
      title: string;
      body: string;
      target: "fees" | "attendance" | "leave" | "lessons" | "home";
      recordId?: string;
    },
  ): Promise<void>;
  updatePayroll(
    context: Context,
    payrollId: string,
    patch: {
      basic?: number;
      allowances?: number;
      deductions?: number;
      status?: "Draft" | "Approved" | "Paid";
    },
  ): Promise<void>;
  processAutomaticPayroll(context: Context): Promise<number>;
  recordDirectPayment(
    context: Context,
    input: {
      studentId: string;
      amount: number;
      method: "card" | "transfer" | "ussd";
      category?: string;
      reference?: string;
      invoiceId?: string;
    },
  ): Promise<Payment>;
  recordWithdrawal(
    context: Context,
    input: {
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
      narration?: string;
    },
  ): Promise<{ id: string; amount: number; reference: string; at: string }>;

  markStudentAttendance(
    context: Context,
    input: {
      studentId: string;
      date: string;
      session: "morning" | "afternoon" | "full_day";
      status: "present" | "absent" | "late";
      classId?: string;
      className?: string;
      remark?: string;
    },
  ): Promise<StudentAttendance>;

  submitClassRollCall(
    context: Context,
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
  ): Promise<number>;
}


