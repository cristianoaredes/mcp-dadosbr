/**
 * Web-standard Zod validation schema for TCU Consolidated PJ Certificates (`tcu_certidoes`).
 * Keep free of Node-only imports (`node:*`) and `../core/*` / `../tools/*` dependencies (`ADR-0001` / `ADR-0002`).
 */

import { z } from "zod";

/**
 * Validate 14-digit CNPJ checksum using mod-11 algorithm.
 */
export function validateTcuCnpjChecksum(cnpj: string): boolean {
  if (cnpj.length !== 14 || !/^\d{14}$/.test(cnpj)) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  let sum = 0;
  let multiplier = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i], 10) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  const remainder1 = sum % 11;
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;

  sum = 0;
  multiplier = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i], 10) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  const remainder2 = sum % 11;
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;

  return parseInt(cnpj[12], 10) === digit1 && parseInt(cnpj[13], 10) === digit2;
}

export const TcuCertidoesSchema = z
  .object({
    cnpj: z
      .string()
      .describe("CNPJ number to query consolidated TCU certificates (with or without formatting)")
      .transform((input) => input.replace(/\D/g, ""))
      .refine((cnpj) => cnpj.length === 14 && /^\d{14}$/.test(cnpj), {
        message: "CNPJ must be exactly 14 digits",
      })
      .refine(validateTcuCnpjChecksum, {
        message: "Invalid CNPJ: checksum verification failed",
      }),
  })
  .strict();
