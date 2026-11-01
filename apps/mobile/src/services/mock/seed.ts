import { Database } from "../../domain/model";

/**
 * Production Empty Database Initializer
 * Zero mock data, zero test accounts, zero fake schools.
 * Real schools and users are established by proprietors and invited staff.
 */
export function seed(): Database {
  return {
    version: 1,
    schools: [],
    memberships: [],
    students: [],
    staff: [],
    invoices: [],
    payments: [],
    payroll: [],
    attendance: [],
    lessons: [],
    leaves: [],
    notices: [],
    classes: [],
    calendar: [],
    studentAttendance: [],
  };
}

export const emptyDatabase = seed;
