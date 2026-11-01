/**
 * Leave validation & duration calculation utilities
 */
import { LeaveInput } from "../../../domain/model";

export interface LeaveValidationResult {
  isValid: boolean;
  errors: {
    start?: string;
    end?: string;
    reason?: string;
    general?: string;
  };
}

/**
 * Validates a leave form input against domain rules
 */
export function validateLeaveInput(input: Partial<LeaveInput>): LeaveValidationResult {
  const errors: LeaveValidationResult["errors"] = {};

  if (!input.start || !/^\d{4}-\d{2}-\d{2}$/.test(input.start)) {
    errors.start = "Please select a valid start date.";
  }

  if (!input.end || !/^\d{4}-\d{2}-\d{2}$/.test(input.end)) {
    errors.end = "Please select a valid end date.";
  }

  if (input.start && input.end && input.end < input.start) {
    errors.end = "End date cannot be earlier than start date.";
  }

  const trimmedReason = (input.reason || "").trim();
  if (!trimmedReason) {
    errors.reason = "Reason for leave is required.";
  } else if (trimmedReason.length < 10) {
    errors.reason = `Reason must be at least 10 characters (${trimmedReason.length}/10).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates calendar days and working days (Monday-Friday) between two ISO dates inclusive
 */
export function calculateLeaveDuration(
  startDateStr?: string,
  endDateStr?: string
): { calendarDays: number; workingDays: number; formatted: string } {
  if (!startDateStr || !endDateStr || endDateStr < startDateStr) {
    return { calendarDays: 0, workingDays: 0, formatted: "0 days" };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { calendarDays: 0, workingDays: 0, formatted: "0 days" };
  }

  let calendarDays = 0;
  let workingDays = 0;

  const current = new Date(start);
  while (current <= end) {
    calendarDays++;
    const dayOfWeek = current.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  const formatted =
    workingDays === 1
      ? "1 working day"
      : `${workingDays} working days${calendarDays !== workingDays ? ` (${calendarDays} total)` : ""}`;

  return { calendarDays, workingDays, formatted };
}

/**
 * Formats a date range into a human-readable string
 * e.g. "Mon, Oct 27 – Fri, Oct 31, 2026"
 */
export function formatLeaveDateRange(startDateStr: string, endDateStr: string): string {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startDateStr} → ${endDateStr}`;
    }

    const startFormatted = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const endFormatted = end.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startFormatted} – ${endFormatted}`;
  } catch {
    return `${startDateStr} – ${endDateStr}`;
  }
}
