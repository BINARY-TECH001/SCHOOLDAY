import { describe, expect, it } from "vitest";
import { resolveBankAccount, isValidNuban } from "../src/services/bankResolver";
import { MockSchoolServices } from "../src/services/mock/service";
import { MemoryStorage } from "../src/storage/adapter";
import { createTestFixture } from "./testFixtures";
import { Context } from "../src/domain/model";

describe("Profile, School Branding & Bank Settlement Operations", () => {
  const initServices = async () => {
    const fixture = createTestFixture();
    const storage = new MemoryStorage();
    const service = new MockSchoolServices(
      storage,
      () => new Date("2026-10-27T12:00:00Z"),
      fixture,
    );
    await service.initialize();
    return { service, storage, fixture };
  };

  const ownerCtx: Context = {
    schoolId: "cedar",
    userId: "demo-owner",
    role: "owner",
  };

  describe("Real Bank Account Resolution (NUBAN) & Live Bank Catalog", () => {
    it("fetches Nigerian banks without mock data fallback", async () => {
      const { fetchNigerianBanks } = await import("../src/services/bankResolver");
      const banks = await fetchNigerianBanks();
      expect(Array.isArray(banks)).toBe(true);
      expect(banks.length).toBeGreaterThan(15);
      // Verify known institutions exist with accredited codes
      const opay = banks.find((b) => b.name.includes("OPay") || b.code === "999992");
      const wema = banks.find((b) => b.name.includes("Wema") || b.code === "035");
      expect(opay).toBeDefined();
      expect(wema).toBeDefined();
    });

    it("strictly resolves OPay account 9059343602 as MUBARAK ABDULRAFIU", async () => {
      const result = await resolveBankAccount("9059343602", "999992");
      expect(result.accountNumber).toBe("9059343602");
      expect(result.accountName).toBe("MUBARAK ABDULRAFIU");
      expect(result.verified).toBe(true);
    });

    it("notifies user cleanly without fabricating mock names when automated resolution service is unavailable", async () => {
      const result = await resolveBankAccount("0000000000", "058");
      expect(result.accountNumber).toBe("0000000000");
      expect(result.bankCode).toBe("058");
      // Must not fabricate mock name!
      expect(result.verified).toBe(false);
      expect(result.message).toContain("currently unavailable");
    });

    it("correctly validates 10-digit NUBAN numbers and rejects non-10 digits", () => {
      expect(isValidNuban("9059343602")).toBe(true);
      expect(isValidNuban("0123456789")).toBe(true);
      expect(isValidNuban("12345")).toBe(false);
      expect(isValidNuban("12345678901")).toBe(false);
      expect(isValidNuban("abcdefghij")).toBe(false);
    });

    it("throws error when attempting to resolve invalid NUBAN", async () => {
      await expect(resolveBankAccount("1234", "044")).rejects.toThrow("Invalid NUBAN");
    });
  });

  describe("School Branding & Appearance Settings", () => {
    it("allows proprietor to set school logo, primaryColor, and secondaryColor", async () => {
      const { service, fixture } = await initServices();

      await service.updateSchool(ownerCtx, {
        logo: "https://example.com/crest.png",
        primaryColor: "#065f46",
        secondaryColor: "#ff6600",
        motto: "Knowledge, Character & Distinction",
        phone: "+234 905 934 3602",
        email: "office@cedarhigh.ng",
      });

      const snapshot = service.snapshot(ownerCtx);
      const updated = snapshot.schools.find((s) => s.id === "cedar");
      expect(updated?.logo).toBe("https://example.com/crest.png");
      expect(updated?.primaryColor).toBe("#065f46");
      expect(updated?.secondaryColor).toBe("#ff6600");
      expect(updated?.motto).toBe("Knowledge, Character & Distinction");
      expect(updated?.phone).toBe("+234 905 934 3602");
      expect(updated?.email).toBe("office@cedarhigh.ng");
    });

    it("strictly locks accredited school name from being edited", async () => {
      const { service } = await initServices();

      await expect(
        service.updateSchool(ownerCtx, {
          name: "Illegal Name Change Academy",
        }),
      ).rejects.toThrow("School name is accredited and cannot be edited.");
    });
  });

  describe("Personal Profile Management", () => {
    it("updates personal details including title prefix, full name, phone, email, and avatar", async () => {
      const { service } = await initServices();

      await service.updateProfile(ownerCtx, {
        titlePrefix: "Dr.",
        firstName: "Mubarak",
        middleName: "Ade",
        lastName: "Abdulrafiu",
        phone: "+234 905 934 3602",
        email: "mubarak@binarytech.ng",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      });

      const snapshot = service.snapshot(ownerCtx);
      const membership = snapshot.memberships.find(
        (m) => m.schoolId === "cedar" && m.userId === "demo-owner",
      );
      expect(membership?.name).toBe("Dr. Mubarak Ade Abdulrafiu");
      expect(membership?.avatar).toBe(
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      );

      const staff = snapshot.staff.find(
        (s) => s.schoolId === "cedar" && s.userId === "demo-owner",
      );
      expect(staff?.phone).toBe("+234 905 934 3602");
      expect(staff?.email).toBe("mubarak@binarytech.ng");
    });
  });
});
