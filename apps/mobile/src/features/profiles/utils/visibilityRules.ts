import { Role, Staff, Student } from "../../../domain/model";

export interface ViewerContext {
  userId: string;
  role: Role;
  schoolId: string;
}

/**
 * Field-level visibility rules for Student profiles (minors).
 * Protects sensitive personal data, guardian private contact info,
 * and financial balances from unauthorized campus viewers.
 */
export function getStudentVisibility(
  viewer: ViewerContext,
  student: Student | undefined,
) {
  if (!student) {
    return {
      canViewRecord: false,
      canViewPrivateContact: false,
      canViewFinancials: false,
      canViewAcademicRecords: false,
    };
  }

  // Cross-tenant protection: must belong to the active school
  if (student.schoolId !== viewer.schoolId) {
    return {
      canViewRecord: false,
      canViewPrivateContact: false,
      canViewFinancials: false,
      canViewAcademicRecords: false,
    };
  }

  const isOwnerOrAdmin = viewer.role === "owner" || viewer.role === "admin";
  const isFinance = viewer.role === "finance";
  const isTeacher = viewer.role === "teacher";
  const isOwnParent =
    viewer.role === "parent" && student.guardianId === viewer.userId;

  return {
    canViewRecord: true,
    // Private contact details (guardian phone, home address)
    canViewPrivateContact: isOwnerOrAdmin || isOwnParent,
    // Sensitive financial status and tuition invoice balances
    canViewFinancials: isOwnerOrAdmin || isFinance || isOwnParent,
    // Academic grades, attendance, report cards
    canViewAcademicRecords: isOwnerOrAdmin || isTeacher || isOwnParent,
  };
}

/**
 * Field-level visibility rules for Staff profiles.
 * Protects salary compensation, banking details, and private phone numbers.
 */
export function getStaffVisibility(
  viewer: ViewerContext,
  staff: Staff | undefined,
) {
  if (!staff) {
    return {
      canViewRecord: false,
      canViewCompensation: false,
      canViewPrivatePhone: false,
      canManagePermissions: false,
    };
  }

  // Cross-tenant protection
  if (staff.schoolId !== viewer.schoolId) {
    return {
      canViewRecord: false,
      canViewCompensation: false,
      canViewPrivatePhone: false,
      canManagePermissions: false,
    };
  }

  const isOwnerOrAdmin = viewer.role === "owner" || viewer.role === "admin";
  const isHr = viewer.role === "hr";
  const isFinance = viewer.role === "finance";
  const isSelf = staff.userId === viewer.userId;

  return {
    canViewRecord: true,
    // Salary, allowances, and compensation records
    canViewCompensation: isOwnerOrAdmin || isFinance || isHr || isSelf,
    // Private personal mobile number
    canViewPrivatePhone: isOwnerOrAdmin || isHr || isSelf,
    // Administrative rights to edit role and permissions
    canManagePermissions: isOwnerOrAdmin,
  };
}
