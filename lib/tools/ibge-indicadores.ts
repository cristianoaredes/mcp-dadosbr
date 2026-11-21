/**
 * IBGE Agregados v3 tools — Resident population & municipal/state GDP
 */

import { hasTool, registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import {
  UNTRUSTED_EXTERNAL_DATA_NOTICE,
  sanitizeUntrustedText,
} from "../shared/agentic-guard.js";
import {
  IbgeIndicadoresInput,
  IbgeIndicadoresSchema,
} from "../shared/olinda-ibge-schemas.js";
import { Cache, LookupResult } from "../types/index.js";

const IBGE_AGREGADOS_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados";

const INDICATOR_META = {
  populacao: {
    agregadoId: "6579",
    variavelId: "9324",
    defaultVariavel: "População residente estimada",
    defaultUnidade: "Pessoas",
    label: "População",
  },
  pib: {
    agregadoId: "5938",
    variavelId: "37",
    defaultVariavel: "Produto Interno Bruto a preços correntes",
    defaultUnidade: "Mil Reais",
    label: "PIB",
  },
} as const;

type SingleIbgeIndicator = keyof typeof INDICATOR_META;

interface CachedPayload {
  data: unknown;
  source: { url: string; fetchedAt: string };
}

export interface IbgeIndicatorSeriesResult {
  agregado_id: string;
  variavel_id: string;
  variavel: string;
  unidade: string;
  localidade: {
    id: string;
    nome: string;
    nivel: {
      id: string;
      nome: string;
    };
  };
  serie: Record<string, number | null>;
  latest_period: string | null;
  latest_value: number | null;
  source_url: string;
}

interface PibPerCapitaDetails {
  pib_ano: string;
  populacao_ano: string;
  mesmo_ano: boolean;
  formula: string;
  nota: string;
}

function parseIbgeNumeric(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (
    trimmed.length === 0 ||
    trimmed === "-" ||
    trimmed === "..." ||
    trimmed === ".." ||
    trimmed === "X"
  ) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildIbgeIndicatorUrl(
  kind: SingleIbgeIndicator,
  periodo: string,
  nivel: "N3" | "N6",
  codigoIbge: string,
): string {
  const { agregadoId, variavelId } = INDICATOR_META[kind];
  return `${IBGE_AGREGADOS_BASE}/${agregadoId}/periodos/${periodo}/variaveis/${variavelId}?localidades=${nivel}[${codigoIbge}]`;
}

function parseIbgeAggregatedResponse(
  rawData: unknown,
  kind: SingleIbgeIndicator,
  fallbackNivel: "N3" | "N6",
  fallbackCodigo: string,
  sourceUrl: string,
): IbgeIndicatorSeriesResult | null {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return null;
  }

  const entry = rawData[0];
  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  const meta = INDICATOR_META[kind];
  const record = entry as Record<string, unknown>;
  const resultados = record.resultados;
  if (!Array.isArray(resultados) || resultados.length === 0) {
    return null;
  }

  let firstSeries: Record<string, unknown> | null = null;
  for (const res of resultados) {
    if (typeof res !== "object" || res === null) {
      continue;
    }
    const seriesList = (res as { series?: unknown }).series;
    if (Array.isArray(seriesList) && seriesList.length > 0) {
      const candidate = seriesList[0];
      if (typeof candidate === "object" && candidate !== null) {
        firstSeries = candidate as Record<string, unknown>;
        break;
      }
    }
  }

  if (!firstSeries) {
    return null;
  }

  const rawSerie = firstSeries.serie;
  if (typeof rawSerie !== "object" || rawSerie === null || Array.isArray(rawSerie)) {
    return null;
  }

  const serieEntries = Object.entries(rawSerie as Record<string, unknown>)
    .map(([key, value]) => [sanitizeUntrustedText(key, 32), parseIbgeNumeric(value)] as const)
    .filter(([key]) => key.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (serieEntries.length === 0) {
    return null;
  }

  const serie: Record<string, number | null> = {};
  for (const [periodKey, value] of serieEntries) {
    serie[periodKey] = value;
  }

  let latestPeriod: string | null = null;
  let latestValue: number | null = null;
  for (let i = serieEntries.length - 1; i >= 0; i--) {
    const [periodKey, value] = serieEntries[i];
    if (value !== null) {
      latestPeriod = periodKey;
      latestValue = value;
      break;
    }
  }
  if (latestPeriod === null) {
    latestPeriod = serieEntries[serieEntries.length - 1][0];
  }

  const rawLoc =
    typeof firstSeries.localidade === "object" && firstSeries.localidade !== null
      ? (firstSeries.localidade as Record<string, unknown>)
      : {};
  const rawNivel =
    typeof rawLoc.nivel === "object" && rawLoc.nivel !== null
      ? (rawLoc.nivel as Record<string, unknown>)
      : {};

  return {
    agregado_id: meta.agregadoId,
    variavel_id: meta.variavelId,
    variavel: sanitizeUntrustedText(
      typeof record.variavel === "string" && record.variavel.trim().length > 0
        ? record.variavel
        : meta.defaultVariavel,
      300,
    ),
    unidade: sanitizeUntrustedText(
      typeof record.unidade === "string" && record.unidade.trim().length > 0
        ? record.unidade
        : meta.defaultUnidade,
      100,
    ),
    localidade: {
      id: sanitizeUntrustedText(
        typeof rawLoc.id === "string" || typeof rawLoc.id === "number"
          ? String(rawLoc.id)
          : fallbackCodigo,
        32,
      ),
      nome: sanitizeUntrustedText(
        typeof rawLoc.nome === "string" && rawLoc.nome.trim().length > 0
          ? rawLoc.nome
          : fallbackCodigo,
        300,
      ),
      nivel: {
        id: sanitizeUntrustedText(
          typeof rawNivel.id === "string" && rawNivel.id.trim().length > 0
            ? rawNivel.id
            : fallbackNivel,
          32,
        ),
        nome: sanitizeUntrustedText(
          typeof rawNivel.nome === "string" && rawNivel.nome.trim().length > 0
            ? rawNivel.nome
            : fallbackNivel === "N3"
              ? "Unidade da Federação"
              : "Município",
          100,
        ),
      },
    },
    serie,
    latest_period: latestPeriod,
    latest_value: latestValue,
    source_url: sourceUrl,
  };
}

function computePibPerCapita(
  pop: IbgeIndicatorSeriesResult | null,
  pib: IbgeIndicatorSeriesResult | null,
): {
  valor: number | null;
  referencia: PibPerCapitaDetails | null;
} {
  if (!pop || !pib) {
    return { valor: null, referencia: null };
  }

  const commonPeriods = Object.keys(pib.serie)
    .filter((period) => {
      const pibVal = pib.serie[period];
      const popVal = pop.serie[period];
      return (
        pibVal !== null &&
        pibVal !== undefined &&
        popVal !== null &&
        popVal !== undefined &&
        popVal > 0
      );
    })
    .sort((a, b) => b.localeCompare(a));

  let pibAno = pib.latest_period;
  let popAno = pop.latest_period;
  let pibVal = pib.latest_value;
  let popVal = pop.latest_value;

  if (commonPeriods.length > 0) {
    const matchedYear = commonPeriods[0];
    pibAno = matchedYear;
    popAno = matchedYear;
    pibVal = pib.serie[matchedYear];
    popVal = pop.serie[matchedYear];
  }

  if (
    !pibAno ||
    !popAno ||
    pibVal === null ||
    popVal === null ||
    !Number.isFinite(pibVal) ||
    !Number.isFinite(popVal) ||
    popVal <= 0
  ) {
    return { valor: null, referencia: null };
  }

  const multiplier = pib.unidade.toLowerCase().includes("mil") ? 1000 : 1;
  const valor = Math.round(((pibVal * multiplier) / popVal) * 100) / 100;
  const mesmoAno = pibAno === popAno;

  return {
    valor,
    referencia: {
      pib_ano: pibAno,
      populacao_ano: popAno,
      mesmo_ano: mesmoAno,
      formula:
        multiplier === 1000
          ? "(pib_mil_reais * 1000) / populacao"
          : "pib_reais / populacao",
      nota: mesmoAno
        ? `Cálculo realizado com PIB e População do mesmo ano de referência (${pibAno}).`
        : `PIB (${pibAno}) e População (${popAno}) pertencem a anos de referência distintos; resultado é uma razão estimada.`,
    },
  };
}

async function fetchSingleIndicator(
  kind: SingleIbgeIndicator,
  periodo: string,
  nivel: "N3" | "N6",
  codigoIbge: string,
): Promise<{
  url: string;
  httpOk: boolean;
  error?: string;
  parsed: IbgeIndicatorSeriesResult | null;
}> {
  const url = buildIbgeIndicatorUrl(kind, periodo, nivel, codigoIbge);
  const httpRes = await httpJson(url);
  if (!httpRes.ok) {
    return {
      url,
      httpOk: false,
      error: httpRes.error || "request failed",
      parsed: null,
    };
  }
  return {
    url,
    httpOk: true,
    parsed: parseIbgeAggregatedResponse(httpRes.data, kind, nivel, codigoIbge, url),
  };
}

export async function executeIbgeIndicadores(
  args: IbgeIndicadoresInput,
  cache?: Cache,
): Promise<LookupResult> {
  const parsed = IbgeIndicadoresSchema.safeParse(args ?? {});
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
      })
      .join("; ");
    return {
      ok: false,
      error: `Invalid parameters for ibge_indicadores: ${details}`,
    };
  }

  const { codigo_ibge, indicador, periodo } = parsed.data;
  const nivel: "N3" | "N6" = codigo_ibge.length === 2 ? "N3" : "N6";
  const cacheKey = `ibge_indicadores:${codigo_ibge}:${indicador}:${periodo}`;

  try {
    if (cache) {
      const cached = await cache.get<CachedPayload>(cacheKey);
      if (cached && typeof cached === "object" && "data" in cached && cached.source) {
        return { ok: true, data: cached.data, source: cached.source };
      }
    }

    if (indicador === "populacao" || indicador === "pib") {
      const single = await fetchSingleIndicator(indicador, periodo, nivel, codigo_ibge);
      if (!single.httpOk) {
        return {
          ok: false,
          error: `IBGE Agregados API error: ${single.error}`,
        };
      }
      if (!single.parsed) {
        return {
          ok: false,
          error: `IBGE indicators not found for codigo_ibge: ${codigo_ibge}`,
        };
      }

      const fetchedAt = new Date().toISOString();
      const payload = {
        codigo_ibge,
        nivel,
        indicador,
        periodo,
        localidade: single.parsed.localidade,
        unidade: single.parsed.unidade,
        serie: single.parsed.serie,
        latest_period: single.parsed.latest_period,
        latest_value: single.parsed.latest_value,
        [indicador]: single.parsed,
        source: "IBGE — Agregados v3",
        source_url: single.url,
        fetchedAt,
        untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
      };
      const source = { url: single.url, fetchedAt };
      if (cache) {
        await cache.set(cacheKey, { data: payload, source });
      }
      return { ok: true, data: payload, source };
    }

    // indicador === "todos" -> fetch population and GDP in parallel
    const [popOutcome, pibOutcome] = await Promise.all([
      fetchSingleIndicator("populacao", periodo, nivel, codigo_ibge),
      fetchSingleIndicator("pib", periodo, nivel, codigo_ibge),
    ]);

    if (!popOutcome.httpOk && !pibOutcome.httpOk) {
      return {
        ok: false,
        error: `IBGE Agregados API error: ${popOutcome.error || pibOutcome.error}`,
      };
    }

    const warnings: string[] = [];
    if (!popOutcome.httpOk) {
      warnings.push(`${INDICATOR_META.populacao.label} lookup failed: ${popOutcome.error}`);
    }
    if (!pibOutcome.httpOk) {
      warnings.push(`${INDICATOR_META.pib.label} lookup failed: ${pibOutcome.error}`);
    }

    const pop = popOutcome.parsed;
    const pib = pibOutcome.parsed;

    if (!pop && !pib) {
      if (warnings.length > 0) {
        return {
          ok: false,
          error: `IBGE Agregados API error: ${warnings.join("; ")}`,
        };
      }
      return {
        ok: false,
        error: `IBGE indicators not found for codigo_ibge: ${codigo_ibge}`,
      };
    }

    const localidade = (pop ?? pib)!.localidade;
    const perCapita = computePibPerCapita(pop, pib);
    const fetchedAt = new Date().toISOString();
    const payload = {
      codigo_ibge,
      nivel,
      indicador,
      periodo,
      localidade,
      populacao: pop,
      pib,
      pib_per_capita_estimado_reais: perCapita.valor,
      pib_per_capita_referencia: perCapita.referencia,
      ...(warnings.length > 0 ? { warnings } : {}),
      source: "IBGE — Agregados v3",
      source_url: popOutcome.url,
      source_urls: [popOutcome.url, pibOutcome.url],
      fetchedAt,
      untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
    };

    const source = { url: popOutcome.url, fetchedAt };
    if (cache && warnings.length === 0) {
      await cache.set(cacheKey, { data: payload, source });
    }
    return { ok: true, data: payload, source };
  } catch (err) {
    return {
      ok: false,
      error: `IBGE Agregados error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export const IBGE_INDICADORES_TOOL = {
  name: "ibge_indicadores",
  description: `Query official demographic and economic indicators from IBGE Agregados v3 by UF (2-digit code) or municipality (7-digit code).
Available indicators:
- populacao: Estimated resident population (Agregado 6579, Variável 9324).
- pib: Gross Domestic Product at current prices in thousand BRL (Agregado 5938, Variável 37).
- todos: Queries both indicators in parallel and calculates estimated GDP per capita (BRL), reporting exact reference years used.
No API key required.`,
  inputSchema: {
    type: "object",
    properties: {
      codigo_ibge: {
        type: "string",
        description:
          "IBGE geographic code: 2 digits for state/UF (e.g. '35' for SP) or 7 digits for municipality (e.g. '3550308' for São Paulo)",
      },
      indicador: {
        type: "string",
        enum: ["populacao", "pib", "todos"],
        description: "Indicator to retrieve (default: 'todos')",
        default: "todos",
      },
      periodo: {
        type: "string",
        description:
          "IBGE period expression: '-1' for most recent, '-N' for last N periods, or 'YYYY' for a specific year (default: '-1')",
        default: "-1",
      },
    },
    required: ["codigo_ibge"],
    additionalProperties: false,
  },
};

export function registerIbgeIndicadoresTool(): void {
  if (hasTool(IBGE_INDICADORES_TOOL.name)) {
    return;
  }
  registerTool({
    ...IBGE_INDICADORES_TOOL,
    zodSchema: IbgeIndicadoresSchema,
    execute: async (args, _apiConfig, cache) =>
      executeIbgeIndicadores(args as IbgeIndicadoresInput, cache),
  });
}
