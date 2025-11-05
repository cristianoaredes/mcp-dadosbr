import { describe, it, expect } from "vitest";
import { CnpjSchema, CepSchema, validateCnpjChecksum } from "../../lib/core/validation";

describe("CNPJ Validation", () => {
  describe("validateCnpjChecksum", () => {
    it("should accept valid CNPJ", () => {
      // Valid CNPJs with correct checksums
      expect(validateCnpjChecksum("11222333000181")).toBe(true);
      expect(validateCnpjChecksum("00000000000191")).toBe(true);
      expect(validateCnpjChecksum("11444777000161")).toBe(true);
    });

    it("should reject CNPJ with invalid checksum", () => {
      // CNPJs with incorrect check digits
      expect(validateCnpjChecksum("11222333000180")).toBe(false); // Wrong last digit
      expect(validateCnpjChecksum("11222333000191")).toBe(false); // Wrong last digit
      expect(validateCnpjChecksum("11222333000100")).toBe(false); // Both digits wrong
    });

    it("should reject CNPJ with all identical digits", () => {
      expect(validateCnpjChecksum("11111111111111")).toBe(false);
      expect(validateCnpjChecksum("00000000000000")).toBe(false);
      expect(validateCnpjChecksum("99999999999999")).toBe(false);
    });

    it("should reject CNPJ with invalid length", () => {
      expect(validateCnpjChecksum("123456789012")).toBe(false); // Too short
      expect(validateCnpjChecksum("112223330001811")).toBe(false); // Too long
      expect(validateCnpjChecksum("")).toBe(false); // Empty
    });

    it("should reject CNPJ with non-digits", () => {
      expect(validateCnpjChecksum("11.222.333/0001-81")).toBe(false);
      expect(validateCnpjChecksum("11222333000ABC")).toBe(false);
    });
  });

  describe("CnpjSchema", () => {
    it("should parse and validate formatted CNPJ", () => {
      const result = CnpjSchema.safeParse({ cnpj: "11.222.333/0001-81" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cnpj).toBe("11222333000181");
      }
    });

    it("should parse and validate unformatted CNPJ", () => {
      const result = CnpjSchema.safeParse({ cnpj: "11222333000181" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cnpj).toBe("11222333000181");
      }
    });

    it("should reject invalid CNPJ", () => {
      const result = CnpjSchema.safeParse({ cnpj: "11222333000180" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("checksum");
      }
    });

    it("should reject CNPJ with all identical digits", () => {
      const result = CnpjSchema.safeParse({ cnpj: "11111111111111" });
      expect(result.success).toBe(false);
    });

    it("should reject CNPJ with invalid length", () => {
      const result = CnpjSchema.safeParse({ cnpj: "123456789" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("14 digits");
      }
    });
  });

  describe("CEP Validation", () => {
    it("should parse and validate formatted CEP", () => {
      const result = CepSchema.safeParse({ cep: "01310-100" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cep).toBe("01310100");
      }
    });

    it("should parse and validate unformatted CEP", () => {
      const result = CepSchema.safeParse({ cep: "01310100" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cep).toBe("01310100");
      }
    });

    it("should reject CEP with invalid length", () => {
      const result = CepSchema.safeParse({ cep: "01310" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("8 digits");
      }
    });

    it("should reject CEP with letters", () => {
      const result = CepSchema.safeParse({ cep: "0131010A" });
      expect(result.success).toBe(false);
    });
  });
});
