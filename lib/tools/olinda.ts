/**
 * BCB Olinda OData tools — PTAX exchange rates & Focus market expectations
 */

import { hasTool, registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import {
  UNTRUSTED_EXTERNAL_DATA_NOTICE,
  sanitizeUntrustedText,
} from "../shared/agentic-guard.js";
import {
  BcbOlindaInput,
  BcbOlindaSchema,
  FOCUS_INDICATORS,
  FocusIndicator,
  OLINDA_CURRENCIES,
  OlindaCurrency,
  isValidIsoCalendarDate,
} from "../shared/olinda-ibge-schemas.js";
import { Cache, LookupResult } from "../types/index.js";

const OLINDA_PTAX_BASE =
  "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";
const OLINDA_FOCUS_URL =
  "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais";

const SAO_PAULO_ISO_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

interface CachedPayload {
  data: unknown;
  source: { url: string; fetchedAt: string };
}

interface NormalizedPtaxQuote {
  effectiveDate: string;
  cotacaoCompra: number;
  cotacaoVenda: number;
  dataHoraCotacao: string;
  tipoBoletim: string | null;
  paridadeCompra?: number;
  paridadeVenda?: number;
}

export function todaySaoPauloIso(now = new Date()): string {
  return SAO_PAULO_ISO_FORMATTER.format(now);
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return utc.toISOString().slice(0, 10);
}

function toOlindaDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${month}-${day}-${year}`;
}

function toFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildPtaxUrl(
  moeda: OlindaCurrency,
  startOlinda: string,
  endOlinda: string,
): string {
  if (moeda === "USD") {
    return (
      `${OLINDA_PTAX_BASE}/CotacaoDolarPeriodo` +
      `(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
      `?@dataInicial='${startOlinda}'&@dataFinalCotacao='${endOlinda}'` +
      `&$top=5&$orderby=dataHoraCotacao%20desc&$format=json`
    );
  }
  return (
    `${OLINDA_PTAX_BASE}/CotacaoMoedaPeriodo` +
    `(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@moeda='${moeda}'&@dataInicial='${startOlinda}'&@dataFinalCotacao='${endOlinda}'` +
    `&$top=10&$orderby=dataHoraCotacao%20desc&$format=json`
  );
}

function buildFocusUrl(
  indicador: FocusIndicator,
  anoReferencia?: number,
): string {
  // Filter terms are guaranteed by strict Zod enums and bounded integer validation.
  const filterExpr =
    anoReferencia !== undefined
      ? `Indicador eq '${indicador}' and DataReferencia eq '${anoReferencia}'`
      : `Indicador eq '${indicador}'`;
  // Olinda's Apache Olingo servlet requires %20 rather than + for spaces and literal $ keys.
  const encodedFilter = new URLSearchParams([["f", filterExpr]])
    .toString()
    .slice(2)
    .replace(/\+/g, "%20");
  return `${OLINDA_FOCUS_URL}?$filter=${encodedFilter}&$top=10&$orderby=Data%20desc&$format=json`;
}

function normalizePtaxQuotes(
  rawData: unknown,
  targetDate: string,
): NormalizedPtaxQuote[] {
  if (typeof rawData !== "object" || rawData === null) {
    return [];
  }
  const value = (rawData as { value?: unknown }).value;
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: NormalizedPtaxQuote[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const cotacaoCompra = toFiniteNumberOrNull(record.cotacaoCompra);
    const cotacaoVenda = toFiniteNumberOrNull(record.cotacaoVenda);
    const rawDateTime =
      typeof record.dataHoraCotacao === "string"
        ? sanitizeUntrustedText(record.dataHoraCotacao, 64)
        : "";
    const dateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(rawDateTime);

    if (
      cotacaoCompra === null ||
      cotacaoVenda === null ||
      !dateMatch ||
      !isValidIsoCalendarDate(dateMatch[1]) ||
      dateMatch[1] > targetDate
    ) {
      continue;
    }

    const tipoBoletim =
      typeof record.tipoBoletim === "string" && record.tipoBoletim.trim().length > 0
        ? sanitizeUntrustedText(record.tipoBoletim, 100)
        : null;
    const paridadeCompra = toFiniteNumberOrNull(record.paridadeCompra);
    const paridadeVenda = toFiniteNumberOrNull(record.paridadeVenda);

    normalized.push({
      effectiveDate: dateMatch[1],
      cotacaoCompra,
      cotacaoVenda,
      dataHoraCotacao: rawDateTime,
      tipoBoletim,
      ...(paridadeCompra !== null ? { paridadeCompra } : {}),
      ...(paridadeVenda !== null ? { paridadeVenda } : {}),
    });
  }

  normalized.sort((a, b) => {
    if (a.effectiveDate !== b.effectiveDate) {
      return b.effectiveDate.localeCompare(a.effectiveDate);
    }
    return b.dataHoraCotacao.localeCompare(a.dataHoraCotacao);
  });

  return normalized;
}

function selectPreferredQuote(quotes: NormalizedPtaxQuote[]): NormalizedPtaxQuote {
  const closingQuotes = quotes.filter(
    (q) => q.tipoBoletim === "Fechamento PTAX" || q.tipoBoletim === "Fechamento",
  );
  if (closingQuotes.length > 0) {
    const topClosingDate = closingQuotes[0].effectiveDate;
    const onTopDate = closingQuotes.filter(
      (q) => q.effectiveDate === topClosingDate,
    );
    return (
      onTopDate.find((q) => q.tipoBoletim === "Fechamento PTAX") ??
      onTopDate.find((q) => q.tipoBoletim === "Fechamento") ??
      onTopDate[0]
    );
  }
  return quotes[0];
}

async function readFromCache(
  cache: Cache | undefined,
  cacheKey: string,
): Promise<LookupResult | null> {
  if (!cache) {
    return null;
  }
  const cached = await cache.get<CachedPayload>(cacheKey);
  if (cached && typeof cached === "object" && "data" in cached && cached.source) {
    return { ok: true, data: cached.data, source: cached.source };
  }
  return null;
}

async function executePtax(
  moeda: OlindaCurrency,
  targetDate: string,
  cache?: Cache,
): Promise<LookupResult> {
  const cacheKey = `olinda:ptax:${moeda}:${targetDate}`;
  const cached = await readFromCache(cache, cacheKey);
  if (cached) {
    return cached;
  }

  const startIso = shiftIsoDate(targetDate, -7);
  const url = buildPtaxUrl(moeda, toOlindaDate(startIso), toOlindaDate(targetDate));
  const result = await httpJson(url);

  if (!result.ok) {
    return {
      ok: false,
      error: `Banco Central Olinda PTAX API error: ${result.error || "request failed"}`,
    };
  }

  const quotes = normalizePtaxQuotes(result.data, targetDate);
  if (quotes.length === 0) {
    return {
      ok: false,
      error: `No PTAX quote found for ${moeda} up to ${targetDate} (checked 7-day window starting ${startIso}).`,
    };
  }

  const selected = selectPreferredQuote(quotes);
  const fetchedAt = new Date().toISOString();
  const payload = {
    consulta: "ptax" as const,
    moeda,
    requested_date: targetDate,
    effective_date: selected.effectiveDate,
    exact_date_match: selected.effectiveDate === targetDate,
    cotacao_compra: selected.cotacaoCompra,
    cotacao_venda: selected.cotacaoVenda,
    data_hora_cotacao: selected.dataHoraCotacao,
    tipo_boletim: selected.tipoBoletim,
    ...(selected.paridadeCompra !== undefined
      ? { paridade_compra: selected.paridadeCompra }
      : {}),
    ...(selected.paridadeVenda !== undefined
      ? { paridade_venda: selected.paridadeVenda }
      : {}),
    recent_quotes: quotes.slice(0, 5).map((q) => ({
      effective_date: q.effectiveDate,
      cotacao_compra: q.cotacaoCompra,
      cotacao_venda: q.cotacaoVenda,
      data_hora_cotacao: q.dataHoraCotacao,
      tipo_boletim: q.tipoBoletim,
      ...(q.paridadeCompra !== undefined
        ? { paridade_compra: q.paridadeCompra }
        : {}),
      ...(q.paridadeVenda !== undefined
        ? { paridade_venda: q.paridadeVenda }
        : {}),
    })),
    source: "Banco Central do Brasil — Olinda PTAX",
    source_url: url,
    fetchedAt,
    untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
  };

  const source = { url, fetchedAt };
  if (cache) {
    await cache.set(cacheKey, { data: payload, source });
  }
  return { ok: true, data: payload, source };
}

async function executeFocus(
  indicador: FocusIndicator,
  anoReferencia: number | undefined,
  cache?: Cache,
): Promise<LookupResult> {
  const cacheKey = `olinda:focus:${indicador}:${anoReferencia ?? "all"}`;
  const cached = await readFromCache(cache, cacheKey);
  if (cached) {
    return cached;
  }

  const url = buildFocusUrl(indicador, anoReferencia);
  const result = await httpJson(url);

  if (!result.ok) {
    return {
      ok: false,
      error: `Banco Central Olinda Focus API error: ${result.error || "request failed"}`,
    };
  }

  if (
    typeof result.data !== "object" ||
    result.data === null ||
    !Array.isArray((result.data as { value?: unknown }).value)
  ) {
    return {
      ok: false,
      error: "Unexpected response format from Banco Central Olinda Focus API",
    };
  }

  const rawList = (result.data as { value: unknown[] }).value;
  const expectations = rawList
    .filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null,
    )
    .map((entry) => ({
      indicador: sanitizeUntrustedText(
        typeof entry.Indicador === "string" ? entry.Indicador : indicador,
        100,
      ),
      indicador_detalhe:
        typeof entry.IndicadorDetalhe === "string" &&
        entry.IndicadorDetalhe.trim().length > 0
          ? sanitizeUntrustedText(entry.IndicadorDetalhe, 200)
          : null,
      data_pesquisa:
        typeof entry.Data === "string"
          ? sanitizeUntrustedText(entry.Data, 40)
          : null,
      ano_referencia:
        typeof entry.DataReferencia === "string" ||
        typeof entry.DataReferencia === "number"
          ? sanitizeUntrustedText(String(entry.DataReferencia), 20)
          : null,
      media: toFiniteNumberOrNull(entry.Media),
      mediana: toFiniteNumberOrNull(entry.Mediana),
      minimo: toFiniteNumberOrNull(entry.Minimo),
      maximo: toFiniteNumberOrNull(entry.Maximo),
      desvio_padrao: toFiniteNumberOrNull(entry.DesvioPadrao),
      respondentes: toFiniteNumberOrNull(entry.numeroRespondentes),
    }));

  const fetchedAt = new Date().toISOString();
  const payload = {
    consulta: "focus" as const,
    indicador,
    ...(anoReferencia !== undefined ? { ano_referencia: anoReferencia } : {}),
    total: expectations.length,
    results: expectations,
    source: "Banco Central do Brasil — Olinda Expectativas Focus",
    source_url: url,
    fetchedAt,
    untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
  };

  const source = { url, fetchedAt };
  if (cache) {
    await cache.set(cacheKey, { data: payload, source });
  }
  return { ok: true, data: payload, source };
}

export async function executeBcbOlinda(
  args: BcbOlindaInput,
  cache?: Cache,
): Promise<LookupResult> {
  const parsed = BcbOlindaSchema.safeParse(args ?? {});
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
      })
      .join("; ");
    return {
      ok: false,
      error: `Invalid parameters for bcb_olinda: ${details}`,
    };
  }

  const { consulta, data, moeda, indicador, ano_referencia } = parsed.data;
  try {
    if (consulta === "ptax") {
      const targetDate = data ?? todaySaoPauloIso();
      if (!isValidIsoCalendarDate(targetDate)) {
        return {
          ok: false,
          error: `Invalid date for bcb_olinda: ${targetDate}`,
        };
      }
      return await executePtax(moeda, targetDate, cache);
    }

    return await executeFocus(indicador, ano_referencia, cache);
  } catch (err) {
    return {
      ok: false,
      error: `Banco Central Olinda error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export const BCB_OLINDA_TOOL = {
  name: "bcb_olinda",
  description: `Query Brazilian Central Bank (BCB) Olinda OData APIs for PTAX exchange rates and Focus market expectations.
Available queries:
- ptax: Official PTAX buying and selling exchange rates for a target date (automatically walks back up to 7 days on weekends/holidays). Supports USD, EUR, GBP, JPY, CHF, CAD, AUD.
- focus: Boletim Focus annual market expectations (IPCA, Selic, PIB Total, Câmbio, IGP-M) with optional reference year filter.
No API key required.`,
  inputSchema: {
    type: "object",
    properties: {
      consulta: {
        type: "string",
        enum: ["ptax", "focus"],
        description:
          "Query type: 'ptax' for official exchange rates or 'focus' for Focus market expectations",
      },
      data: {
        type: "string",
        description:
          "Target calendar date in YYYY-MM-DD format for PTAX lookup (defaults to today in São Paulo)",
      },
      moeda: {
        type: "string",
        enum: [...OLINDA_CURRENCIES],
        description: "Currency code for PTAX lookup (default: 'USD')",
        default: "USD",
      },
      indicador: {
        type: "string",
        enum: [...FOCUS_INDICATORS],
        description: "Macroeconomic indicator for Focus expectations (default: 'IPCA')",
        default: "IPCA",
      },
      ano_referencia: {
        type: "integer",
        minimum: 2020,
        maximum: 2035,
        description: "Optional reference year for Focus expectations (2020-2035)",
      },
    },
    required: ["consulta"],
    additionalProperties: false,
  },
};

export function registerOlindaTool(): void {
  if (hasTool(BCB_OLINDA_TOOL.name)) {
    return;
  }
  registerTool({
    ...BCB_OLINDA_TOOL,
    zodSchema: BcbOlindaSchema,
    execute: async (args, _apiConfig, cache) =>
      executeBcbOlinda(args as BcbOlindaInput, cache),
  });
}
