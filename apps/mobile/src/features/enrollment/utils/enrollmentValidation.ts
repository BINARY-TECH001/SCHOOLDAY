/**
 * Enrollment Form Validation & Helper Utilities
 */

export interface PupilIdentityInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  gender: "Male" | "Female";
  dateOfBirth: string; // YYYY-MM-DD
  classId: string;
  secondaryClassId?: string;
}

export interface GuardianAffiliationInput {
  mode: "existing" | "new";
  existingGuardianUserId?: string;
  fullName: string;
  phone: string;
  email?: string;
  relationship: "Father" | "Mother" | "Legal Guardian" | "Other";
}

export interface PupilMedicalInput {
  bloodGroup: string;
  genotype?: string;
  allergies?: string;
  emergencyPhone?: string;
}

export interface EnrollmentValidationErrors {
  [key: string]: string | undefined;
}

/**
 * Validates Step: Pupil Identity & Classes
 */
export function validatePupilIdentity(input: PupilIdentityInput): {
  isValid: boolean;
  errors: EnrollmentValidationErrors;
} {
  const errors: EnrollmentValidationErrors = {};

  if (input.firstName !== undefined || input.lastName !== undefined) {
    const f = (input.firstName || "").trim();
    const l = (input.lastName || "").trim();
    if (!f) {
      errors.firstName = "Pupil's first name is required.";
    } else if (f.length < 2) {
      errors.firstName = "First name must be at least 2 characters.";
    }
    if (!l) {
      errors.lastName = "Pupil's surname / last name is required.";
    } else if (l.length < 2) {
      errors.lastName = "Last name must be at least 2 characters.";
    }
  } else {
    const trimmedName = (input.fullName || "").trim();
    if (!trimmedName) {
      errors.fullName = "Pupil's full name is required.";
    } else if (trimmedName.length < 3) {
      errors.fullName = "Full name must be at least 3 characters.";
    } else if (!trimmedName.includes(" ")) {
      errors.fullName = "Please provide both first and last name.";
    }
  }

  if (!input.classId) {
    errors.classId = "Please select an enrollment classroom.";
  }

  if (input.secondaryClassId && input.secondaryClassId === input.classId) {
    errors.secondaryClassId = "Secondary classroom must be different from primary classroom.";
  }

  if (!input.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)) {
    errors.dateOfBirth = "Please select a valid date of birth.";
  } else {
    const dob = new Date(input.dateOfBirth);
    const today = new Date();
    if (dob >= today) {
      errors.dateOfBirth = "Date of birth must be in the past.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Step 2: Guardian Affiliation
 */
export function validateGuardianAffiliation(input: GuardianAffiliationInput): {
  isValid: boolean;
  errors: EnrollmentValidationErrors;
} {
  const errors: EnrollmentValidationErrors = {};

  if (input.mode === "existing") {
    if (!input.existingGuardianUserId) {
      errors.existingGuardianUserId = "Please select an existing parent or guardian.";
    }
  } else {
    const trimmedName = input.fullName.trim();
    if (!trimmedName) {
      errors.fullName = "Guardian's full name is required.";
    } else if (trimmedName.length < 3) {
      errors.fullName = "Name must be at least 3 characters.";
    }

    const trimmedPhone = input.phone.trim().replace(/[\s-]/g, "");
    if (!trimmedPhone) {
      errors.phone = "Mobile phone number is required.";
    } else if (!/^(\+?234|0)[789]\d{9}$/.test(trimmedPhone)) {
      errors.phone = "Please enter a valid Nigerian mobile phone (e.g. 08031234567).";
    }

    if (input.email && input.email.trim()) {
      const emailTrimmed = input.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        errors.email = "Please enter a valid email address.";
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Step 3: Medical & Emergency Profile
 */
export function validatePupilMedical(input: PupilMedicalInput): {
  isValid: boolean;
  errors: EnrollmentValidationErrors;
} {
  const errors: EnrollmentValidationErrors = {};

  if (input.emergencyPhone && input.emergencyPhone.trim()) {
    const trimmedPhone = input.emergencyPhone.trim().replace(/[\s-]/g, "");
    if (!/^(\+?234|0)[789]\d{9}$/.test(trimmedPhone)) {
      errors.emergencyPhone = "Please enter a valid emergency phone number.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats Naira currency from kobo
 */
export function formatKoboToNaira(amountInKobo?: number): string {
  if (amountInKobo === undefined || amountInKobo === null) return "₦0";
  const naira = Math.round(amountInKobo / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}
