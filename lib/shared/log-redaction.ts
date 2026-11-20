/**
 * Log redaction helpers to avoid leaking PII, CNPJs, CPFs, emails,
 * full search queries, or reasoning traces into server logs.
 */

export function maskCnpj(cnpj: string): string {
  if (typeof cnpj !== "string") return "***";
  const digits = cnpj.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
}

export function summarizeQueryForLog(query: string): string {
  const len = typeof query === "string" ? query.length : 0;
  return `query(len=${len})`;
}

export function maskSensitiveText(text: string, maxLen: number = 120): string {
  if (typeof text !== "string") return "";
  const sanitized = text
    .replace(/[\r\n]+/g, " ")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[REDACTED]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[REDACTED]")
    .replace(/(?<!\d)\d{14}(?!\d)/g, "[REDACTED]")
    .replace(/(?<!\d)\d{11}(?!\d)/g, "[REDACTED]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED]")
    .trim();

  if (sanitized.length <= maxLen) {
    return sanitized;
  }
  return sanitized.slice(0, Math.max(0, maxLen - 3)) + "...";
}
