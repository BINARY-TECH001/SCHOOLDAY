import { Attendance, SchoolClass, Staff, Student } from "../../../domain/model";

/**
 * Returns the list of classes assigned to a specific teacher.
 * Resolves via:
 * 1. SchoolClass.teacherUserId === userId
 * 2. Staff.assignedClasses containing class name or code
 * 3. Staff.assignedClass matching class name or code
 * 4. Staff.title matching class name (e.g., "Class teacher · Primary 4")
 */
export function getTeacherAssignedClasses(
  classes: SchoolClass[] = [],
  staff: Staff[] = [],
  userId: string
): SchoolClass[] {
  const currentStaff = staff.find((s) => s.userId === userId);

  return classes.filter((c) => {
    if (c.teacherUserId && c.teacherUserId === userId) return true;
    if (
      currentStaff?.assignedClasses &&
      (currentStaff.assignedClasses.includes(c.name) ||
        currentStaff.assignedClasses.includes(c.code))
    ) {
      return true;
    }
    if (
      currentStaff?.assignedClass &&
      (currentStaff.assignedClass === c.name ||
        currentStaff.assignedClass === c.code)
    ) {
      return true;
    }
    if (
      currentStaff?.title &&
      c.name &&
      currentStaff.title.toLowerCase().includes(c.name.toLowerCase())
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Checks if a teacher is authorized to access a given classroom.
 * If user role is owner or admin, they have school-wide class authorization.
 */
export function isTeacherAuthorizedForClass(
  targetClass: SchoolClass,
  role: string,
  userId: string,
  allStaff: Staff[] = []
): boolean {
  if (role === "owner" || role === "admin") return true;
  if (role !== "teacher") return false;

  const currentStaff = allStaff.find((s) => s.userId === userId);
  if (targetClass.teacherUserId === userId) return true;
  if (
    currentStaff?.assignedClasses &&
    (currentStaff.assignedClasses.includes(targetClass.name) ||
      currentStaff.assignedClasses.includes(targetClass.code))
  ) {
    return true;
  }
  if (
    currentStaff?.assignedClass &&
    (currentStaff.assignedClass === targetClass.name ||
      currentStaff.assignedClass === targetClass.code)
  ) {
    return true;
  }
  if (
    currentStaff?.title &&
    targetClass.name &&
    currentStaff.title.toLowerCase().includes(targetClass.name.toLowerCase())
  ) {
    return true;
  }

  return false;
}

/**
 * Returns real students enrolled in a class without fallback substitutions.
 */
export function getClassRoster(
  students: Student[] = [],
  schoolClass: SchoolClass
): Student[] {
  const nameLower = schoolClass.name.toLowerCase();
  const codeLower = schoolClass.code.toLowerCase();

  return students.filter((s) => {
    const sClassLower = s.className.toLowerCase();
    const hasMultipleMatch = s.classes?.some((c) => {
      const cLower = c.toLowerCase();
      return (
        cLower === nameLower ||
        cLower === codeLower ||
        cLower.includes(nameLower)
      );
    });

    return (
      sClassLower === nameLower ||
      sClassLower === codeLower ||
      sClassLower.includes(nameLower) ||
      sClassLower.includes(codeLower) ||
      Boolean(hasMultipleMatch)
    );
  });
}

/**
 * Checks if a teacher has permission to view a specific pupil.
 * Teacher can view if student is in one of the teacher's assigned classes.
 */
export function isTeacherAuthorizedForStudent(
  student: Student,
  role: string,
  userId: string,
  allClasses: SchoolClass[] = [],
  allStaff: Staff[] = []
): boolean {
  if (role === "owner" || role === "admin" || role === "finance" || role === "hr") {
    return true;
  }
  if (role === "parent") {
    return student.guardianId === userId;
  }
  if (role === "student") {
    return student.id === userId;
  }
  if (role !== "teacher") return false;

  const teacherClasses = getTeacherAssignedClasses(allClasses, allStaff, userId);
  const sClassLower = student.className.toLowerCase();

  return teacherClasses.some((tc) => {
    const tcNameLower = tc.name.toLowerCase();
    const tcCodeLower = tc.code.toLowerCase();
    return (
      sClassLower === tcNameLower ||
      sClassLower === tcCodeLower ||
      sClassLower.includes(tcNameLower) ||
      sClassLower.includes(tcCodeLower)
    );
  });
}
