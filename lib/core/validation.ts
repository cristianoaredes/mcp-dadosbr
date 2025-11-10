import { z } from "zod";

// Input normalization functions
const normalizeCnpj = (input: string) => input.replace(/\D/g, "");
const normalizeCep = (input: string) => input.replace(/\D/g, "");
const normalizeCpf = (input: string) => input.replace(/\D/g, "");

/**
 * Validates CPF checksum using mod-11 algorithm
 * @param cpf - 11-digit CPF string (digits only)
 * @returns true if checksum is valid, false otherwise
 */
function validateCpfChecksum(cpf: string): boolean {
  // Must be exactly 11 digits
  if (cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
    return false;
  }

  // Reject CPFs with all identical digits (e.g., "11111111111")
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  // Verify both check digits
  return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
}

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

/**
 * Format CPF with standard Brazilian formatting
 * @param cpf - 11-digit CPF string (digits only)
 * @returns Formatted CPF (XXX.XXX.XXX-XX)
 */
export function formatCpf(cpf: string): string {
  const normalized = normalizeCpf(cpf);
  if (normalized.length !== 11) return cpf;
  return `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6, 9)}-${normalized.slice(9, 11)}`;
}

/**
 * Format CNPJ with standard Brazilian formatting
 * @param cnpj - 14-digit CNPJ string (digits only)
 * @returns Formatted CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export function formatCnpj(cnpj: string): string {
  const normalized = normalizeCnpj(cnpj);
  if (normalized.length !== 14) return cnpj;
  return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5, 8)}/${normalized.slice(8, 12)}-${normalized.slice(12, 14)}`;
}

/**
 * Format CEP with standard Brazilian formatting
 * @param cep - 8-digit CEP string (digits only)
 * @returns Formatted CEP (XXXXX-XXX)
 */
export function formatCep(cep: string): string {
  const normalized = normalizeCep(cep);
  if (normalized.length !== 8) return cep;
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 8)}`;
}

// Validation schemas
export const CpfSchema = z.object({
  cpf: z
    .string()
    .describe("CPF number to validate (with or without formatting)")
    .transform(normalizeCpf)
    .refine((cpf) => cpf.length === 11 && /^\d{11}$/.test(cpf), {
      message: "CPF must be exactly 11 digits",
    })
    .refine(validateCpfChecksum, {
      message: "Invalid CPF: checksum verification failed",
    }),
});

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
export { normalizeCnpj, normalizeCep, normalizeCpf, validateCnpjChecksum, validateCpfChecksum };
