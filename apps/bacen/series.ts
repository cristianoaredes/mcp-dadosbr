import { brazilToday } from "../../lib/shared/bacen.js";

export type Observation = { date: string; time: number; value: number };

export function readObservations(rows: unknown, today = brazilToday()): Observation[] {
  if (!Array.isArray(rows)) throw new Error("Expected a series of observations");
  const byDate = new Map<string, Observation>();
  for (const row of rows) {
    if (!row || typeof row.data !== "string" || typeof row.valor !== "string"
        || !/^\d{2}\/\d{2}\/\d{4}$/.test(row.data) || !/^-?\d+(?:\.\d+)?$/.test(row.valor)) {
      throw new Error("Invalid SGS observation");
    }
    const date = row.data.split("/").reverse().join("-");
    const time = Date.parse(date);
    const value = Number(row.valor);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date || !Number.isFinite(value)) {
      throw new Error("Invalid SGS date or value");
    }
    if (date <= today) byDate.set(date, { date, time, value });
  }
  return [...byDate.values()].sort((left, right) => left.time - right.time);
}
