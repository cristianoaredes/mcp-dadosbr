import { describe, it, expect } from "vitest";
import {
  CnpjSchema,
  CepSchema,
  CpfSchema,
  validateCnpjChecksum,
  validateCpfChecksum,
  formatCpf,
  formatCnpj,
  formatCep
} from "../../lib/core/validation";

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

describe("CPF Validation", () => {
  describe("validateCpfChecksum", () => {
    it("should accept valid CPF", () => {
      // Valid CPFs with correct checksums
      expect(validateCpfChecksum("12345678909")).toBe(true);
      expect(validateCpfChecksum("11144477735")).toBe(true);
      expect(validateCpfChecksum("12345678062")).toBe(true);
    });

    it("should reject CPF with invalid checksum", () => {
      // CPFs with incorrect check digits
      expect(validateCpfChecksum("12345678900")).toBe(false); // Wrong last digit
      expect(validateCpfChecksum("12345678919")).toBe(false); // Wrong last digit
      expect(validateCpfChecksum("12345678999")).toBe(false); // Both digits wrong
    });

    it("should reject CPF with all identical digits", () => {
      expect(validateCpfChecksum("11111111111")).toBe(false);
      expect(validateCpfChecksum("00000000000")).toBe(false);
      expect(validateCpfChecksum("99999999999")).toBe(false);
    });

    it("should reject CPF with invalid length", () => {
      expect(validateCpfChecksum("123456789")).toBe(false); // Too short
      expect(validateCpfChecksum("123456789012")).toBe(false); // Too long
      expect(validateCpfChecksum("")).toBe(false); // Empty
    });

    it("should reject CPF with non-digits", () => {
      expect(validateCpfChecksum("123.456.789-09")).toBe(false);
      expect(validateCpfChecksum("12345678ABC")).toBe(false);
    });
  });

  describe("CpfSchema", () => {
    it("should parse and validate formatted CPF", () => {
      const result = CpfSchema.safeParse({ cpf: "123.456.789-09" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cpf).toBe("12345678909");
      }
    });

    it("should parse and validate unformatted CPF", () => {
      const result = CpfSchema.safeParse({ cpf: "12345678909" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cpf).toBe("12345678909");
      }
    });

    it("should reject CPF with invalid length", () => {
      const result = CpfSchema.safeParse({ cpf: "123456789" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("11 digits");
      }
    });

    it("should reject CPF with invalid checksum", () => {
      const result = CpfSchema.safeParse({ cpf: "12345678900" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("checksum");
      }
    });

    it("should reject CPF with all same digits", () => {
      const result = CpfSchema.safeParse({ cpf: "11111111111" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Formatters", () => {
  describe("formatCpf", () => {
    it("should format valid CPF", () => {
      expect(formatCpf("12345678909")).toBe("123.456.789-09");
      expect(formatCpf("11144477735")).toBe("111.444.777-35");
    });

    it("should return original input if invalid length", () => {
      expect(formatCpf("123456789")).toBe("123456789");
      expect(formatCpf("123")).toBe("123");
    });

    it("should handle already formatted CPF", () => {
      expect(formatCpf("123.456.789-09")).toBe("123.456.789-09");
    });
  });

  describe("formatCnpj", () => {
    it("should format valid CNPJ", () => {
      expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
      expect(formatCnpj("00000000000191")).toBe("00.000.000/0001-91");
    });

    it("should return original input if invalid length", () => {
      expect(formatCnpj("1122233300018")).toBe("1122233300018");
      expect(formatCnpj("123")).toBe("123");
    });

    it("should handle already formatted CNPJ", () => {
      expect(formatCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
    });
  });

  describe("formatCep", () => {
    it("should format valid CEP", () => {
      expect(formatCep("01310100")).toBe("01310-100");
      expect(formatCep("88015500")).toBe("88015-500");
    });

    it("should return original input if invalid length", () => {
      expect(formatCep("0131010")).toBe("0131010");
      expect(formatCep("123")).toBe("123");
    });

    it("should handle already formatted CEP", () => {
      expect(formatCep("01310-100")).toBe("01310-100");
    });
  });
});
