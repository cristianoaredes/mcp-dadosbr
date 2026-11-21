/**
 * Runtime Zod schemas for v0.7.0 Fiscal, Banking, Calendar, and DDD tools.
 * Web-standard only (imports exclusively `zod`, zero `node:*` dependencies).
 */

import { z } from "zod";

export const CnaeNcmSchema = z
  .object({
    tipo: z.enum(["cnae", "ncm"]),
    codigo: z.string().trim().min(1).max(20).optional(),
    termo: z.string().trim().min(1).max(120).optional(),
    page: z.number().int().min(1).max(1000).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.codigo || v.termo), {
    message: "Provide codigo or termo",
  });

export const SistemaFinanceiroSchema = z
  .object({
    tipo: z.enum(["bancos", "pix", "corretoras"]),
    codigo: z.string().trim().regex(/^\d{1,6}$/, "codigo must be numeric").optional(),
    ispb: z.string().trim().regex(/^\d{8}$/, "ispb must be 8 digits").optional(),
    cnpj: z.string().trim().min(11).max(20).optional(),
    busca: z.string().trim().min(1).max(120).optional(),
    status: z.string().trim().min(1).max(60).optional(),
    page: z.number().int().min(1).max(1000).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();

export const FeriadosDddSchema = z
  .object({
    tipo: z.enum(["feriados", "ddd"]),
    ano: z.number().int().min(1900).max(2199).optional(),
    data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "data must be YYYY-MM-DD").optional(),
    ddd: z.string().trim().regex(/^\d{2}$/, "ddd must be 2 digits").optional(),
    uf_esperada: z.string().trim().regex(/^[A-Za-z]{2}$/, "uf_esperada must be 2 letters").optional(),
  })
  .strict()
  .refine((v) => (v.tipo === "ddd" ? Boolean(v.ddd) : true), {
    message: "ddd is required when tipo is ddd",
  });

export type CnaeNcmArgs = z.infer<typeof CnaeNcmSchema>;
export type SistemaFinanceiroArgs = z.infer<typeof SistemaFinanceiroSchema>;
export type FeriadosDddArgs = z.infer<typeof FeriadosDddSchema>;
