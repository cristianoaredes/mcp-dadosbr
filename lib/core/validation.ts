import { z } from "zod";

// Input normalization functions
const normalizeCnpj = (input: string) => input.replace(/\D/g, "");
const normalizeCep = (input: string) => input.replace(/\D/g, "");

// Validation schemas
export const CnpjSchema = z.object({
  cnpj: z
    .string()
    .describe("CNPJ number to lookup (with or without formatting)")
    .transform(normalizeCnpj)
    .refine((cnpj) => cnpj.length === 14 && /^\d{14}$/.test(cnpj), {
      message: "CNPJ must be exactly 14 digits",
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

// Export normalization functions for reuse
export { normalizeCnpj, normalizeCep };
