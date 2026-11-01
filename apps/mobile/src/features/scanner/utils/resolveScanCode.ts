import { Context, Database, balance } from "../../../domain/model";
import { ScannedEntity, ScanMode } from "../types";

/**
 * Resolves a scanned raw QR / Barcode string into a structured domain entity.
 * Strictly checks the actual active school database.
 * NEVER falls back to mock records or arbitrary array indices.
 */
export function resolveScanCode(
  rawCode: string,
  data: Database,
  context: Context,
  mode: ScanMode = "all"
): ScannedEntity {
  const code = rawCode.trim();
  const upper = code.toUpperCase();

  if (!code) {
    return {
      type: "unrecognized",
      code,
      reason: "Empty or blank barcode scanned.",
    };
  }

  // 1. Biometric Face ID Scan (for current user clock-in)
  if (
    mode === "attendance" ||
    upper === "FACE-VERIFIED" ||
    upper.startsWith("FACE-") ||
    upper === "BIOMETRIC-FACE"
  ) {
    const isClockedIn = data.attendance.some(
      (a) => a.userId === context.userId && !a.outAt
    );
    const selfStaff = data.staff.find((s) => s.userId === context.userId);
    return {
      type: "face",
      code,
      userId: context.userId,
      name: selfStaff?.name || context.userId,
      role: context.role,
      isClockedIn,
    };
  }

  // 2. Staff Identity Card or Badge
  // Format examples: "STAFF-EMP-042", "EMP-042", or matching staff id/userId
  const matchedStaff = data.staff.find((s) => {
    const sid = s.id.toUpperCase();
    const suid = s.userId.toUpperCase();
    return (
      upper === sid ||
      upper === suid ||
      upper === `STAFF-${sid}` ||
      upper === `STAFF-${suid}` ||
      (upper.startsWith("STAFF-") && (upper.includes(sid) || upper.includes(suid)))
    );
  });

  if (matchedStaff) {
    const isClockedIn = data.attendance.some(
      (a) => a.userId === matchedStaff.userId && !a.outAt
    );
    const canClock =
      context.role === "owner" ||
      context.role === "hr" ||
      context.userId === matchedStaff.userId;

    return {
      type: "staff",
      code,
      staff: matchedStaff,
      isClockedIn,
      canClock,
    };
  }

  // 3. Student Identification Pass or Badge
  // Format examples: "STU-001", "STU-PRI-001", or matching student id
  const matchedStudent = data.students.find((stu) => {
    const stuid = stu.id.toUpperCase();
    return (
      upper === stuid ||
      upper === `STU-${stuid}` ||
      upper === `PUPIL-${stuid}` ||
      (upper.startsWith("STU-") && upper.includes(stuid))
    );
  });

  if (matchedStudent) {
    const studentInvoices = data.invoices.filter((i) => i.studentId === matchedStudent.id);
    const unpaidInvoices = studentInvoices.filter((i) => balance(i) > 0);
    const totalDueKobo = unpaidInvoices.reduce(
      (sum, i) => sum + Math.max(0, balance(i)),
      0
    );

    return {
      type: "student",
      code,
      student: matchedStudent,
      hasUnpaidInvoices: unpaidInvoices.length > 0,
      totalDueKobo,
    };
  }

  // 4. Receipt or Payment Reference
  // Format examples: "RCP-2026-001", "PAY-...", or matching payment id
  const matchedPayment = data.payments.find((p) => {
    const pid = p.id.toUpperCase();
    return (
      upper === pid ||
      upper === `RCP-${pid}` ||
      upper === `PAY-${pid}` ||
      (upper.startsWith("RCP-") && upper.includes(pid))
    );
  });

  if (matchedPayment) {
    const relatedInvoice = data.invoices.find((i) =>
      matchedPayment.invoiceIds.includes(i.id)
    );
    return {
      type: "payment",
      code,
      payment: matchedPayment,
      invoice: relatedInvoice,
    };
  }

  // 5. Invoice Reference
  // Format examples: "INV-2026-001", or matching invoice id
  const matchedInvoice = data.invoices.find((inv) => {
    const invId = inv.id.toUpperCase();
    return (
      upper === invId ||
      upper === `INV-${invId}` ||
      (upper.startsWith("INV-") && upper.includes(invId))
    );
  });

  if (matchedInvoice) {
    return {
      type: "invoice",
      code,
      invoice: matchedInvoice,
      isPaid: balance(matchedInvoice) === 0,
    };
  }

  // 6. External or Web URL
  if (code.startsWith("http://") || code.startsWith("https://")) {
    return {
      type: "url",
      code,
      url: code,
    };
  }

  // 7. Not recognized in this school database
  return {
    type: "unrecognized",
    code,
    reason: `Identifier "${code}" does not match any registered student, staff, invoice, or payment record.`,
  };
}
