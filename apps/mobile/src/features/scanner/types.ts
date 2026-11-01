import { Staff, Student, Invoice, Payment } from "../../domain/model";

export type ScanMode = "all" | "badges" | "receipts" | "attendance";

export interface StaffScanResult {
  type: "staff";
  code: string;
  staff: Staff;
  isClockedIn: boolean;
  canClock: boolean;
}

export interface StudentScanResult {
  type: "student";
  code: string;
  student: Student;
  hasUnpaidInvoices: boolean;
  totalDueKobo: number;
}

export interface InvoiceScanResult {
  type: "invoice";
  code: string;
  invoice: Invoice;
  isPaid: boolean;
}

export interface PaymentScanResult {
  type: "payment";
  code: string;
  payment: Payment;
  invoice?: Invoice;
}

export interface FaceBiometricScanResult {
  type: "face";
  code: string;
  userId: string;
  name: string;
  role: string;
  isClockedIn: boolean;
}

export interface UrlScanResult {
  type: "url";
  code: string;
  url: string;
}

export interface UnrecognizedScanResult {
  type: "unrecognized";
  code: string;
  reason: string;
}

export type ScannedEntity =
  | StaffScanResult
  | StudentScanResult
  | InvoiceScanResult
  | PaymentScanResult
  | FaceBiometricScanResult
  | UrlScanResult
  | UnrecognizedScanResult;
