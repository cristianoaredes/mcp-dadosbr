/**
 * LGPD compliance notices for sensitive public-record lookups.
 * Keep this module Web-standard (zero Node-only imports) so Cloudflare Workers builds stay green.
 */

export const HOMONYM_HUMAN_REVIEW_NOTICE =
  "LGPD Art. 20 Notice (Revisão Humana Obrigatória): Name-based and partial-text lookups carry risk of homonyms (homônimos), stale records, or incomplete upstream responses. Do not use this result for automated decisions without prior human review, full document verification (CPF/CNPJ), and direct confirmation against the official source.";

/**
 * Attach `lgpd_notice` to plain-object payloads (e.g., cache hits) while preserving all existing keys.
 */
export function attachLgpdNotice(payload: unknown): unknown {
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    return {
      ...(payload as Record<string, unknown>),
      lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    };
  }
  return payload;
}
