import { z } from "zod";

// Input normalization functions
const normalizeCnpj = (input: string) => input.replace(/\D/g, "");
const normalizeCep = (input: string) => input.replace(/\D/g, "");

/**
 * Validates CNPJ checksum using mod-11 algorithm
 * @param cnpj - 14-digit CNPJ string (digits only)
 * @returns true if checksum is valid, false otherwise
 */
function validateCnpjChecksum(cnpj: string): boolean {
  // Must be exactly 14 digits
  if (cnpj.length !== 14 || !/^\d{14}$/.test(cnpj)) {
    return false;
  }

  // Reject CNPJs with all identical digits (e.g., "11111111111111")
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  // Calculate first check digit
  let sum = 0;
  let multiplier = 5;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  const remainder1 = sum % 11;
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;

  // Calculate second check digit
  sum = 0;
  multiplier = 6;

  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  const remainder2 = sum % 11;
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;

  // Verify both check digits
  return parseInt(cnpj[12]) === digit1 && parseInt(cnpj[13]) === digit2;
}

// Validation schemas
export const CnpjSchema = z.object({
  cnpj: z
    .string()
    .describe("CNPJ number to lookup (with or without formatting)")
    .transform(normalizeCnpj)
    .refine((cnpj) => cnpj.length === 14 && /^\d{14}$/.test(cnpj), {
      message: "CNPJ must be exactly 14 digits",
    })
    .refine(validateCnpjChecksum, {
      message: "Invalid CNPJ: checksum verification failed",
    }),
});

export const CepSchema = z.object({
  cep: z
    .string()
    .describe("CEP postal code to lookup (with or without formatting)")
    .transform(normalizeCep)
    .refine((cep) => cep.length === 8 && /^\d{8}$/.test(cep), {
      message: "CEP must be exactly 8 digits",
    }),
});

// Export normalization and validation functions for reuse
export { normalizeCnpj, normalizeCep, validateCnpjChecksum };
