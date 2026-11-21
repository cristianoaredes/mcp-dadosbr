import { z } from "zod";

export const OLINDA_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
] as const;

export const FOCUS_INDICATORS = [
  "IPCA",
  "Selic",
  "PIB Total",
  "Câmbio",
  "IGP-M",
] as const;

export type OlindaCurrency = (typeof OLINDA_CURRENCIES)[number];
export type FocusIndicator = (typeof FOCUS_INDICATORS)[number];

/**
 * Validate that a YYYY-MM-DD string represents an actual calendar date (e.g., rejects 2026-02-30).
 */
export function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export const BcbOlindaSchema = z
  .object({
    consulta: z.enum(["ptax", "focus"]),
    data: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "data must be YYYY-MM-DD")
      .refine(isValidIsoCalendarDate, "data must be a valid calendar date (YYYY-MM-DD)")
      .optional(),
    moeda: z.enum(OLINDA_CURRENCIES).optional().default("USD"),
    indicador: z.enum(FOCUS_INDICATORS).optional().default("IPCA"),
    ano_referencia: z.number().int().min(2020).max(2035).optional(),
  })
  .strict();

export const IbgeIndicadoresSchema = z
  .object({
    codigo_ibge: z
      .string()
      .trim()
      .regex(/^\d{2}(?:\d{5})?$/, "codigo_ibge must be 2 (UF) or 7 (municipality) digits"),
    indicador: z.enum(["populacao", "pib", "todos"]).optional().default("todos"),
    periodo: z
      .string()
      .trim()
      .regex(/^(?:-\d{1,2}|\d{4})$/, "periodo must be -N (latest periods) or YYYY")
      .optional()
      .default("-1"),
  })
  .strict();

export type BcbOlindaInput = z.input<typeof BcbOlindaSchema>;
export type BcbOlindaArgs = z.output<typeof BcbOlindaSchema>;
export type IbgeIndicadoresInput = z.input<typeof IbgeIndicadoresSchema>;
export type IbgeIndicadoresArgs = z.output<typeof IbgeIndicadoresSchema>;
