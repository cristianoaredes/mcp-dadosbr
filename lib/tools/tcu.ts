/**
 * TCU tools — Consulta Consolidada de Pessoa Jurídica (TCU Inidôneos, CNJ CNIA, CEIS, CNEP).
 * Worker-safe (zero `node:*` imports) and explicit registration via `registerTcuTool()`.
 */

import { hasTool, registerTool, type ToolHandler } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { TcuCertidoesSchema } from "../shared/tcu-schema.js";
import {
  sanitizeUntrustedText,
  UNTRUSTED_EXTERNAL_DATA_NOTICE,
} from "../shared/agentic-guard.js";
import { attachLgpdNotice } from "../shared/compliance-notices.js";
import { Cache, LookupResult } from "../types/index.js";

export const TCU_CERTIDOES_URL =
  "https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes";

const TCU_TIMEOUT_MS = 10_000;

export interface TcuCertidoesArgs {
  cnpj: string;
}

export interface TcuCertidaoItem {
  emissor: string;
  tipo: string;
  dataHoraEmissao: string;
  descricao: string;
  situacao: string;
  observacao: string | null;
  linkConsultaManual: string | null;
}

function sanitizeRequiredText(value: unknown, maxChars: number): string {
  if (value === null || value === undefined) {
    return "";
  }
  return sanitizeUntrustedText(
    typeof value === "string" ? value : String(value),
    maxChars,
  );
}

function sanitizeOptionalText(value: unknown, maxChars: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return sanitizeUntrustedText(
    typeof value === "string" ? value : String(value),
    maxChars,
  );
}

/**
 * Query consolidated public integrity certificates for a CNPJ via TCU API.
 */
export async function executeTcuCertidoes(
  args: TcuCertidoesArgs,
  cache?: Cache,
): Promise<LookupResult> {
  const parsed = TcuCertidoesSchema.safeParse(args);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join("; ");
    return { ok: false, error: details || "Invalid CNPJ" };
  }

  const cleanCnpj = parsed.data.cnpj;
  const cacheKey = `tcu_certidoes:${cleanCnpj}`;

  if (cache) {
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached && typeof cached === "object" && !Array.isArray(cached)) {
      return {
        ok: true,
        data: attachLgpdNotice({
          ...cached,
          cached: true,
        }),
      };
    }
  }

  const url = `${TCU_CERTIDOES_URL}/${cleanCnpj}?seEmitirPDF=false`;
  const result = await httpJson(
    url,
    { Accept: "application/json" },
    TCU_TIMEOUT_MS,
  );

  if (!result.ok) {
    return {
      ok: false,
      error: `TCU Certidões API error: ${result.error || "request failed"}`,
    };
  }

  const raw = result.data as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray(raw.certidoes)) {
    return {
      ok: false,
      error: "TCU Certidões API error: unexpected response format",
    };
  }

  const certidoes: TcuCertidaoItem[] = raw.certidoes
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((item) => ({
      emissor: sanitizeRequiredText(item.emissor, 200),
      tipo: sanitizeRequiredText(item.tipo, 200),
      dataHoraEmissao: sanitizeRequiredText(item.dataHoraEmissao, 100),
      descricao: sanitizeRequiredText(item.descricao, 1000),
      situacao: sanitizeRequiredText(item.situacao, 100),
      observacao: sanitizeOptionalText(item.observacao, 1000),
      linkConsultaManual: sanitizeOptionalText(item.linkConsultaManual, 500),
    }));

  const has_positive_records = certidoes.some(
    (item) =>
      item.situacao !== "" &&
      item.situacao !== "NADA_CONSTA" &&
      item.situacao !== "SISTEMA_INDISPONIVEL",
  );

  const unavailable_issuers = certidoes
    .filter((item) => item.situacao === "SISTEMA_INDISPONIVEL")
    .map((item) => item.emissor)
    .filter((emissor) => emissor.length > 0);

  const razaoSocial =
    typeof raw.razaoSocial === "string" && raw.razaoSocial.trim().length > 0
      ? sanitizeUntrustedText(raw.razaoSocial, 300)
      : undefined;

  const payload = attachLgpdNotice({
    cnpj: cleanCnpj,
    ...(razaoSocial ? { razao_social: razaoSocial } : {}),
    certidoes,
    total_certidoes: certidoes.length,
    has_positive_records,
    unavailable_issuers,
    cached: false,
    source: "TCU — Consulta Consolidada de Pessoa Jurídica",
    source_url: url,
    fetchedAt: new Date().toISOString(),
    untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
  });

  if (cache) {
    await cache.set(cacheKey, payload);
  }

  return { ok: true, data: payload };
}

export const TCU_CERTIDOES_TOOL: ToolHandler = {
  name: "tcu_certidoes",
  description: `Query consolidated public integrity certificates for a Brazilian company (CNPJ) via TCU.
Aggregates Licitantes Inidôneos (TCU), Improbidade Administrativa (CNJ/CNIA), CEIS, and CNEP in a single lookup.
No API key required.`,
  inputSchema: {
    type: "object",
    properties: {
      cnpj: {
        type: "string",
        description: "Brazilian CNPJ number (14 digits, with or without formatting)",
      },
    },
    required: ["cnpj"],
  },
  zodSchema: TcuCertidoesSchema,
  execute: async (args, _apiConfig, cache) =>
    executeTcuCertidoes(args as TcuCertidoesArgs, cache),
};

/**
 * Idempotently register `tcu_certidoes` in the global tool registry.
 */
export function registerTcuTool(): void {
  if (!hasTool("tcu_certidoes")) {
    registerTool(TCU_CERTIDOES_TOOL);
  }
}
