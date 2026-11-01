import { describe, expect, it } from "vitest";
import {
  formatKoboToNaira,
  validateGuardianAffiliation,
  validatePupilIdentity,
  validatePupilMedical,
} from "../src/features/enrollment/utils/enrollmentValidation";
import { MockSchoolServices } from "../src/services/mock/service";
import { MemoryStorage } from "../src/storage/adapter";
import { createTestFixture } from "./testFixtures";
import { Context } from "../src/domain/model";

describe("Enrollment Flow & Validation (Phase 4)", () => {
  describe("validatePupilIdentity", () => {
    it("rejects empty names or single-word names", () => {
      const res1 = validatePupilIdentity({
        fullName: "",
        gender: "Male",
        dateOfBirth: "2018-05-14",
        classId: "cls-1",
      });
      expect(res1.isValid).toBe(false);
      expect(res1.errors.fullName).toBeDefined();

      const res2 = validatePupilIdentity({
        fullName: "Chidinma", // single word
        gender: "Female",
        dateOfBirth: "2018-05-14",
        classId: "cls-1",
      });
      expect(res2.isValid).toBe(false);
      expect(res2.errors.fullName).toContain("both first and last name");
    });

    it("rejects future date of birth", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const isoFuture = futureDate.toISOString().slice(0, 10);

      const res = validatePupilIdentity({
        fullName: "Chidinma Nwosu",
        gender: "Female",
        dateOfBirth: isoFuture,
        classId: "cls-1",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.dateOfBirth).toContain("must be in the past");
    });

    it("rejects unselected classroom", () => {
      const res = validatePupilIdentity({
        fullName: "Chidinma Nwosu",
        gender: "Female",
        dateOfBirth: "2018-05-14",
        classId: "",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.classId).toBeDefined();
    });

    it("accepts valid pupil identity", () => {
      const res = validatePupilIdentity({
        fullName: "Chidinma Nwosu",
        gender: "Female",
        dateOfBirth: "2018-05-14",
        classId: "cls-1",
      });
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });

    it("accepts split names (firstName, middleName, lastName) and rejects missing required parts", () => {
      const validRes = validatePupilIdentity({
        firstName: "Chinedu",
        middleName: "Emeka",
        lastName: "Okafor",
        gender: "Male",
        dateOfBirth: "2018-05-14",
        classId: "cls-1",
      });
      expect(validRes.isValid).toBe(true);
      expect(Object.keys(validRes.errors)).toHaveLength(0);

      const missingFirst = validatePupilIdentity({
        firstName: "",
        lastName: "Okafor",
        gender: "Male",
        dateOfBirth: "2018-05-14",
        classId: "cls-1",
      });
      expect(missingFirst.isValid).toBe(false);
      expect(missingFirst.errors.firstName).toBeDefined();

      const missingLast = validatePupilIdentity({
        firstName: "Chinedu",
        lastName: "",
        gender: "Male",
        dateOfBirth: "2018-05-14",
        classId: "cls-1",
      });
      expect(missingLast.isValid).toBe(false);
      expect(missingLast.errors.lastName).toBeDefined();
    });
  });

  describe("validateGuardianAffiliation", () => {
    it("requires selected guardian when mode is existing", () => {
      const res = validateGuardianAffiliation({
        mode: "existing",
        existingGuardianUserId: "",
        fullName: "",
        phone: "",
        relationship: "Mother",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.existingGuardianUserId).toBeDefined();
    });

    it("requires valid Nigerian mobile phone for new guardian", () => {
      const res1 = validateGuardianAffiliation({
        mode: "new",
        fullName: "Mrs. Folashade Nwosu",
        phone: "12345", // invalid phone
        relationship: "Mother",
      });
      expect(res1.isValid).toBe(false);
      expect(res1.errors.phone).toContain("valid Nigerian mobile");

      const res2 = validateGuardianAffiliation({
        mode: "new",
        fullName: "Mrs. Folashade Nwosu",
        phone: "08031234567", // valid
        relationship: "Mother",
      });
      expect(res2.isValid).toBe(true);
    });
  });

  describe("validatePupilMedical", () => {
    it("validates emergency phone when provided", () => {
      const resInvalid = validatePupilMedical({
        bloodGroup: "O+",
        emergencyPhone: "999",
      });
      expect(resInvalid.isValid).toBe(false);

      const resValid = validatePupilMedical({
        bloodGroup: "O+",
        emergencyPhone: "08021112233",
      });
      expect(resValid.isValid).toBe(true);
    });
  });

  describe("formatKoboToNaira", () => {
    it("formats kobo amounts into Naira strings with thousand separators", () => {
      expect(formatKoboToNaira(15000000)).toBe("₦150,000");
      expect(formatKoboToNaira(2500000)).toBe("₦25,000");
      expect(formatKoboToNaira(0)).toBe("₦0");
      expect(formatKoboToNaira(undefined)).toBe("₦0");
    });
  });

  describe("Enrollment Service Integration (addStudentsBatch)", () => {
    const adminContext: Context = {
      schoolId: "cedar",
      userId: "demo-owner",
      role: "owner",
    };

    const createService = async () => {
      const storage = new MemoryStorage();
      const service = new MockSchoolServices(
        storage,
        () => new Date("2026-10-24T07:00:00Z"),
        createTestFixture()
      );
      await service.initialize();
      return service;
    };

    it("successfully enrolls a new student and generates automatic tuition invoice", async () => {
      const service = await createService();
      const initialSnapshot = service.snapshot(adminContext);
      const initialCount = initialSnapshot.students.length;

      const added = await service.addStudentsBatch(adminContext, [
        {
          name: "Chidinma Nwosu",
          className: "Primary 1 Gold",
          guardianName: "Mrs. Folashade Nwosu",
          guardianPhone: "08031234567",
          guardianEmail: "folashade@example.com",
          feeAmount: 18000000, // ₦180,000
        },
      ]);

      expect(added).toBe(1);

      const updatedSnapshot = service.snapshot(adminContext);
      expect(updatedSnapshot.students.length).toBe(initialCount + 1);

      const enrolledStudent = updatedSnapshot.students.find(
        (s) => s.name === "Chidinma Nwosu"
      );
      expect(enrolledStudent).toBeDefined();
      expect(enrolledStudent?.className).toBe("Primary 1 Gold");
      expect(enrolledStudent?.guardianPhone).toBe("08031234567");

      // Verify automatic tuition invoice generation
      const studentInvoice = updatedSnapshot.invoices.find(
        (inv) => inv.studentId === enrolledStudent?.id
      );
      expect(studentInvoice).toBeDefined();
      expect(studentInvoice?.paid).toBe(0);
      expect(studentInvoice?.items).toHaveLength(2);
      expect(studentInvoice?.items[0]?.label).toContain("Tuition Fee");
    });

    it("successfully enrolls a student into two classes and records both in student classes", async () => {
      const service = await createService();

      const added = await service.addStudentsBatch(adminContext, [
        {
          name: "Emeka Okafor",
          className: "Primary 1 Gold & Music Club",
          classes: ["Primary 1 Gold", "Music Club"],
          guardianName: "Dr. Okafor",
          guardianPhone: "08099887766",
          feeAmount: 20000000,
        },
      ]);

      expect(added).toBe(1);

      const snapshot = service.snapshot(adminContext);
      const student = snapshot.students.find((s) => s.name === "Emeka Okafor");
      expect(student).toBeDefined();
      expect(student?.classes).toContain("Primary 1 Gold");
      expect(student?.classes).toContain("Music Club");
      expect(student?.classes).toHaveLength(2);
    });
  });
});
