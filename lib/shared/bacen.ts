export const BACEN_SERIES = {
  selic: { id: 432, label: "Meta Selic", unit: "% ao ano", frequency: "Diária", digits: 2 },
  ipca: { id: 433, label: "IPCA", unit: "% no mês", frequency: "Mensal", digits: 2 },
  dolar: { id: 1, label: "Dólar (venda)", unit: "R$ por US$", frequency: "Diária", digits: 4 },
  euro: { id: 21619, label: "Euro (venda)", unit: "R$ por €", frequency: "Diária", digits: 4 },
  cdi: { id: 12, label: "CDI", unit: "% ao dia", frequency: "Diária", digits: 6 },
} as const;
export const BACEN_PERIODS = [30, 90, 365] as const;
export type BacenIndicator = keyof typeof BACEN_SERIES;
export type BacenPeriod = typeof BACEN_PERIODS[number];

export function isBacenIndicator(value: unknown): value is BacenIndicator {
  return typeof value === "string" && Object.hasOwn(BACEN_SERIES, value);
}

export function isBacenPeriod(value: unknown): value is BacenPeriod {
  return BACEN_PERIODS.some((period) => value === period);
}

const saoPauloDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});
export const DAY_MS = 86_400_000;

export function brazilToday(now = new Date()): string {
  return saoPauloDate.format(now);
}

export function brDate(isoDate: string): string {
  return isoDate.split("-").reverse().join("/");
}

export function bacenWindow(period: BacenPeriod, now = new Date()) {
  const end = brazilToday(now);
  const start = new Date(Date.parse(end) - (period - 1) * DAY_MS).toISOString().slice(0, 10);
  return { start: brDate(start), end: brDate(end) };
}
