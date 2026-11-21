/**
 * Fiscal, Banking, Calendar, and DDD tools — IBGE CNAE v2, BrasilAPI NCM,
 * Bancos, Pix participants, Corretoras CVM, Feriados Nacionais, and DDD.
 *
 * Wave 1 (`TCK-0042` / `DES-0038`): exports tool definitions and
 * `registerFiscalBankingTools()` without auto-registering at module top-level.
 */

import { httpJson } from "../core/http-client.js";
import { hasTool, registerTool, type ToolHandler } from "../core/registry.js";
import {
  sanitizeUntrustedText,
  UNTRUSTED_EXTERNAL_DATA_NOTICE,
} from "../shared/agentic-guard.js";
import {
  CnaeNcmSchema,
  FeriadosDddSchema,
  SistemaFinanceiroSchema,
  type CnaeNcmArgs,
  type FeriadosDddArgs,
  type SistemaFinanceiroArgs,
} from "../shared/fiscal-banking-schemas.js";
import type { Cache, LookupResult } from "../types/index.js";

const IBGE_CNAE_BASE = "https://servicodados.ibge.gov.br/api/v2/cnae";
const BRASILAPI_BASE = "https://brasilapi.com.br/api";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const MAX_EXTERNAL_TEXT_CHARS = 2000;

interface SourceMeta {
  url: string;
  fetchedAt: string;
}

interface CachedPayload {
  data: unknown;
  source: SourceMeta;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

type FetchCachedResult =
  | { ok: true; data: unknown; source: SourceMeta }
  | { ok: false; error: string };

interface FetchCachedOptions {
  rejectEmptyArray?: boolean;
  notFoundMessage?: string;
  expectArray?: boolean;
  expectObject?: boolean;
}

/** Normalize text to lowercase ASCII (NFD without diacritics) for accent-insensitive filtering. */
function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Recursively sanitize external strings against control characters, spoofed tags, and excessive length. */
function sanitizeExternalValue(value: unknown, maxChars: number = MAX_EXTERNAL_TEXT_CHARS): unknown {
  if (typeof value === "string") {
    return sanitizeUntrustedText(value, maxChars);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeExternalValue(item, maxChars));
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = sanitizeExternalValue(entry, maxChars);
    }
    return out;
  }
  return value;
}

/** Slice an array into a bounded page (`page >= 1`, `1 <= limit <= 50`). */
function paginateItems<T>(
  items: T[],
  rawPage?: number,
  rawLimit?: number,
): { items: T[]; pagination: PaginationMeta } {
  const page =
    typeof rawPage === "number" && Number.isFinite(rawPage) && rawPage >= 1
      ? Math.floor(rawPage)
      : DEFAULT_PAGE;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(MAX_LIMIT, Math.floor(rawLimit))
      : DEFAULT_LIMIT;

  const total = items.length;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return {
    items: paged,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_more: start + paged.length < total,
    },
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function includesNormalized(candidate: unknown, needle: string): boolean {
  if (typeof candidate !== "string" || !candidate) return false;
  return normalizeSearchText(candidate).includes(needle);
}

function anyIncludesNormalized(candidates: unknown[], needle: string): boolean {
  return candidates.some((candidate) => includesNormalized(candidate, needle));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read from cache or fetch via `httpJson`, sanitize external payload, and cache successful responses only. */
async function fetchCachedJson(
  url: string,
  cacheKey: string,
  cache?: Cache,
  options?: FetchCachedOptions,
): Promise<FetchCachedResult> {
  if (cache) {
    const cached = await cache.get<CachedPayload>(cacheKey);
    if (cached && typeof cached === "object" && "data" in cached && cached.source) {
      return { ok: true, data: cached.data, source: cached.source };
    }
  }

  const result = await httpJson(url);
  if (!result.ok) {
    return { ok: false, error: result.error || "Upstream API request failed" };
  }

  const raw = result.data;
  if (raw === null || raw === undefined) {
    return { ok: false, error: options?.notFoundMessage || "not found" };
  }
  if (options?.expectArray && !Array.isArray(raw)) {
    return { ok: false, error: "Unexpected upstream response format (expected array)" };
  }
  if (options?.expectObject && !isPlainObject(raw)) {
    return { ok: false, error: "Unexpected upstream response format (expected object)" };
  }
  if (options?.rejectEmptyArray && Array.isArray(raw) && raw.length === 0) {
    return { ok: false, error: options.notFoundMessage || "not found" };
  }

  const sanitized = sanitizeExternalValue(raw);
  const source: SourceMeta = { url, fetchedAt: new Date().toISOString() };
  if (cache) {
    await cache.set(cacheKey, { data: sanitized, source });
  }
  return { ok: true, data: sanitized, source };
}

// ─── CNAE / NCM Lookup ──────────────────────────────────────────────────────

function resolveCnaeEndpoint(rawCodigo: string):
  | { ok: true; endpoint: string; normalizedCode: string; level: string }
  | { ok: false; error: string } {
  const digits = rawCodigo.replace(/\D/g, "");
  switch (digits.length) {
    case 7:
      return {
        ok: true,
        endpoint: `subclasses/${digits}`,
        normalizedCode: digits,
        level: "subclasse",
      };
    case 5:
      return {
        ok: true,
        endpoint: `classes/${digits}`,
        normalizedCode: digits,
        level: "classe",
      };
    case 4: {
      const padded = digits.padStart(5, "0");
      return {
        ok: true,
        endpoint: `classes/${padded}`,
        normalizedCode: padded,
        level: "classe",
      };
    }
    case 3:
      return {
        ok: true,
        endpoint: `grupos/${digits}`,
        normalizedCode: digits,
        level: "grupo",
      };
    case 2:
      return {
        ok: true,
        endpoint: `divisoes/${digits}`,
        normalizedCode: digits,
        level: "divisao",
      };
    default:
      return {
        ok: false,
        error: `Invalid CNAE code "${rawCodigo}": expected 2 (divisão), 3 (grupo), 4-5 (classe), or 7 (subclasse) digits.`,
      };
  }
}

function matchesCnaeClass(entry: unknown, needle: string): boolean {
  if (!isPlainObject(entry)) return false;
  if (includesNormalized(entry.id, needle) || includesNormalized(entry.descricao, needle)) {
    return true;
  }
  if (Array.isArray(entry.observacoes)) {
    return entry.observacoes.some((obs) => includesNormalized(obs, needle));
  }
  return includesNormalized(entry.observacoes, needle);
}

/** Query IBGE CNAE v2 (code hierarchy or full-text class search) or BrasilAPI NCM. */
export async function executeCnaeNcm(
  args: CnaeNcmArgs,
  cache?: Cache,
): Promise<LookupResult> {
  if (!args || (args.tipo !== "cnae" && args.tipo !== "ncm")) {
    return { ok: false, error: "Invalid tipo: expected 'cnae' or 'ncm'" };
  }

  const codigo = typeof args.codigo === "string" ? args.codigo.trim() : "";
  const termo = typeof args.termo === "string" ? args.termo.trim() : "";
  if (!codigo && !termo) {
    return { ok: false, error: "Provide codigo or termo" };
  }

  if (args.tipo === "cnae") {
    if (codigo) {
      const resolved = resolveCnaeEndpoint(codigo);
      if (!resolved.ok) {
        return { ok: false, error: resolved.error };
      }

      const url = `${IBGE_CNAE_BASE}/${resolved.endpoint}`;
      const res = await fetchCachedJson(url, `cnae:code:${resolved.endpoint}`, cache, {
        rejectEmptyArray: true,
        notFoundMessage: `CNAE not found: ${codigo}`,
      });
      if (!res.ok) {
        const message =
          res.error === "not found"
            ? `CNAE not found: ${codigo}`
            : res.error;
        return { ok: false, error: message };
      }

      const item =
        Array.isArray(res.data) && res.data.length === 1 ? res.data[0] : res.data;

      return {
        ok: true,
        data: {
          tipo: "cnae",
          codigo: resolved.normalizedCode,
          nivel: resolved.level,
          item,
          source: "IBGE CNAE v2",
          fetchedAt: res.source.fetchedAt,
          untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
        },
        source: res.source,
      };
    }

    const url = `${IBGE_CNAE_BASE}/classes`;
    const res = await fetchCachedJson(url, "cnae:classes:all", cache, {
      expectArray: true,
    });
    if (!res.ok) {
      return { ok: false, error: `IBGE CNAE API error: ${res.error}` };
    }

    const needle = normalizeSearchText(termo);
    const matches = (res.data as unknown[]).filter((entry) => matchesCnaeClass(entry, needle));
    const { items, pagination } = paginateItems(matches, args.page, args.limit);

    return {
      ok: true,
      data: {
        tipo: "cnae",
        termo,
        items,
        pagination,
        source: "IBGE CNAE v2",
        fetchedAt: res.source.fetchedAt,
        untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
      },
      source: res.source,
    };
  }

  // tipo === "ncm"
  if (codigo) {
    const digitsOnly = codigo.replace(/\D/g, "");
    if (!digitsOnly) {
      return { ok: false, error: `Invalid NCM code: ${codigo}` };
    }

    const url = `${BRASILAPI_BASE}/ncm/v1/${encodeURIComponent(digitsOnly)}`;
    const res = await fetchCachedJson(url, `ncm:code:${digitsOnly}`, cache, {
      rejectEmptyArray: true,
      notFoundMessage: `NCM not found: ${codigo}`,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.error === "not found" ? `NCM not found: ${codigo}` : `BrasilAPI NCM error: ${res.error}`,
      };
    }

    return {
      ok: true,
      data: {
        tipo: "ncm",
        codigo: digitsOnly,
        item: res.data,
        source: "BrasilAPI — NCM",
        fetchedAt: res.source.fetchedAt,
        untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
      },
      source: res.source,
    };
  }

  const url = `${BRASILAPI_BASE}/ncm/v1?search=${encodeURIComponent(termo)}`;
  const cacheKey = `ncm:search:${normalizeSearchText(termo)}`;
  const res = await fetchCachedJson(url, cacheKey, cache, {
    expectArray: true,
  });
  if (!res.ok) {
    return { ok: false, error: `BrasilAPI NCM error: ${res.error}` };
  }

  const { items, pagination } = paginateItems(res.data as unknown[], args.page, args.limit);
  return {
    ok: true,
    data: {
      tipo: "ncm",
      termo,
      items,
      pagination,
      source: "BrasilAPI — NCM",
      fetchedAt: res.source.fetchedAt,
      untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
    },
    source: res.source,
  };
}

// ─── Sistema Financeiro Lookup ──────────────────────────────────────────────

async function executeBancos(args: SistemaFinanceiroArgs, cache?: Cache): Promise<LookupResult> {
  const codigo = typeof args.codigo === "string" ? args.codigo.trim() : "";
  const ispb = typeof args.ispb === "string" ? args.ispb.trim() : "";
  const busca = typeof args.busca === "string" ? args.busca.trim() : "";

  if (codigo && !ispb && !busca) {
    if (!/^\d{1,6}$/.test(codigo)) {
      return { ok: false, error: "codigo must be numeric (1 to 6 digits)" };
    }
    const bankCode = Number(codigo);
    const url = `${BRASILAPI_BASE}/banks/v1/${bankCode}`;
    const res = await fetchCachedJson(url, `sfn:banco:${bankCode}`, cache, {
      rejectEmptyArray: true,
      notFoundMessage: `Bank not found: ${bankCode}`,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.error === "not found" ? `Bank not found: ${bankCode}` : `BrasilAPI Banks error: ${res.error}`,
      };
    }

    return {
      ok: true,
      data: {
        tipo: "bancos",
        codigo: bankCode,
        item: res.data,
        source: "BrasilAPI — Bancos",
        fetchedAt: res.source.fetchedAt,
        untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
      },
      source: res.source,
    };
  }

  const url = `${BRASILAPI_BASE}/banks/v1`;
  const res = await fetchCachedJson(url, "sfn:bancos:all", cache, { expectArray: true });
  if (!res.ok) {
    return { ok: false, error: `BrasilAPI Banks error: ${res.error}` };
  }

  const buscaNeedle = busca ? normalizeSearchText(busca) : "";
  const targetCode = codigo ? Number(codigo) : null;
  const filtered = (res.data as unknown[]).filter((entry) => {
    if (!isPlainObject(entry)) return false;
    if (ispb && asString(entry.ispb).trim() !== ispb) return false;
    if (targetCode !== null) {
      if (entry.code === null || entry.code === undefined || entry.code === "") return false;
      if (Number(entry.code) !== targetCode) return false;
    }
    if (buscaNeedle && !anyIncludesNormalized([entry.name, entry.fullName, entry.nome], buscaNeedle)) {
      return false;
    }
    return true;
  });

  const { items, pagination } = paginateItems(filtered, args.page, args.limit);
  return {
    ok: true,
    data: {
      tipo: "bancos",
      items,
      pagination,
      source: "BrasilAPI — Bancos",
      fetchedAt: res.source.fetchedAt,
      untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
    },
    source: res.source,
  };
}

async function executePix(args: SistemaFinanceiroArgs, cache?: Cache): Promise<LookupResult> {
  const ispb = typeof args.ispb === "string" ? args.ispb.trim() : "";
  const busca = typeof args.busca === "string" ? args.busca.trim() : "";
  const status = typeof args.status === "string" ? args.status.trim() : "";

  const url = `${BRASILAPI_BASE}/pix/v1/participants`;
  const res = await fetchCachedJson(url, "sfn:pix:participants", cache, { expectArray: true });
  if (!res.ok) {
    return { ok: false, error: `BrasilAPI Pix error: ${res.error}` };
  }

  const buscaNeedle = busca ? normalizeSearchText(busca) : "";
  const statusNeedle = status ? normalizeSearchText(status) : "";
  const filtered = (res.data as unknown[]).filter((entry) => {
    if (!isPlainObject(entry)) return false;
    if (ispb && asString(entry.ispb).trim() !== ispb) return false;
    if (buscaNeedle && !anyIncludesNormalized([entry.nome, entry.nome_reduzido], buscaNeedle)) {
      return false;
    }
    if (
      statusNeedle &&
      !anyIncludesNormalized([entry.modalidade_participacao, entry.tipo_participacao], statusNeedle)
    ) {
      return false;
    }
    return true;
  });

  const { items, pagination } = paginateItems(filtered, args.page, args.limit);
  return {
    ok: true,
    data: {
      tipo: "pix",
      items,
      pagination,
      source: "BrasilAPI — Participantes Pix",
      fetchedAt: res.source.fetchedAt,
      untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
    },
    source: res.source,
  };
}

async function executeCorretoras(
  args: SistemaFinanceiroArgs,
  cache?: Cache,
): Promise<LookupResult> {
  const rawCnpj = typeof args.cnpj === "string" ? args.cnpj.trim() : "";
  const cleanCnpj = rawCnpj ? rawCnpj.replace(/\D/g, "") : "";
  const busca = typeof args.busca === "string" ? args.busca.trim() : "";
  const status = typeof args.status === "string" ? args.status.trim() : "";

  if (rawCnpj && !cleanCnpj) {
    return { ok: false, error: "Invalid CNPJ filter: provide digits" };
  }

  if (cleanCnpj.length === 14 && !busca && !status) {
    const url = `${BRASILAPI_BASE}/cvm/corretoras/v1/${encodeURIComponent(cleanCnpj)}`;
    const res = await fetchCachedJson(url, `sfn:corretora:${cleanCnpj}`, cache, {
      rejectEmptyArray: true,
      notFoundMessage: `Corretora not found: ${cleanCnpj}`,
    });
    if (!res.ok) {
      return {
        ok: false,
        error:
          res.error === "not found"
            ? `Corretora not found: ${cleanCnpj}`
            : `BrasilAPI Corretoras error: ${res.error}`,
      };
    }

    return {
      ok: true,
      data: {
        tipo: "corretoras",
        cnpj: cleanCnpj,
        item: res.data,
        source: "BrasilAPI — Corretoras CVM",
        fetchedAt: res.source.fetchedAt,
        untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
      },
      source: res.source,
    };
  }

  const url = `${BRASILAPI_BASE}/cvm/corretoras/v1`;
  const res = await fetchCachedJson(url, "sfn:corretoras:all", cache, { expectArray: true });
  if (!res.ok) {
    return { ok: false, error: `BrasilAPI Corretoras error: ${res.error}` };
  }

  const buscaNeedle = busca ? normalizeSearchText(busca) : "";
  const statusNeedle = status ? normalizeSearchText(status) : "";
  const filtered = (res.data as unknown[]).filter((entry) => {
    if (!isPlainObject(entry)) return false;
    if (cleanCnpj) {
      const entryDigits = asString(entry.cnpj).replace(/\D/g, "");
      if (!entryDigits.includes(cleanCnpj)) return false;
    }
    if (
      buscaNeedle &&
      !anyIncludesNormalized([entry.nome_social, entry.nome_comercial, entry.municipio], buscaNeedle)
    ) {
      return false;
    }
    if (statusNeedle && !includesNormalized(entry.status, statusNeedle)) {
      return false;
    }
    return true;
  });

  const { items, pagination } = paginateItems(filtered, args.page, args.limit);
  return {
    ok: true,
    data: {
      tipo: "corretoras",
      items,
      pagination,
      source: "BrasilAPI — Corretoras CVM",
      fetchedAt: res.source.fetchedAt,
      untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
    },
    source: res.source,
  };
}

/** Query Brazilian banks, Pix participants, and CVM brokers with server-side filtering and pagination. */
export async function executeSistemaFinanceiro(
  args: SistemaFinanceiroArgs,
  cache?: Cache,
): Promise<LookupResult> {
  if (!args) {
    return { ok: false, error: "Invalid arguments for sistema_financeiro_lookup" };
  }

  switch (args.tipo) {
    case "bancos":
      return executeBancos(args, cache);
    case "pix":
      return executePix(args, cache);
    case "corretoras":
      return executeCorretoras(args, cache);
    default:
      return { ok: false, error: "Invalid tipo: expected 'bancos', 'pix', or 'corretoras'" };
  }
}

// ─── Feriados / DDD Lookup ──────────────────────────────────────────────────

const saoPauloYearFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

function currentSaoPauloYear(now: Date = new Date()): number {
  return Number(saoPauloYearFormatter.format(now));
}

function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Query national holidays (with business-day evaluation) or Brazilian DDD area code state/cities. */
export async function executeFeriadosDdd(
  args: FeriadosDddArgs,
  cache?: Cache,
): Promise<LookupResult> {
  if (!args || (args.tipo !== "feriados" && args.tipo !== "ddd")) {
    return { ok: false, error: "Invalid tipo: expected 'feriados' or 'ddd'" };
  }

  if (args.tipo === "feriados") {
    const data = typeof args.data === "string" ? args.data.trim() : undefined;
    if (data !== undefined) {
      if (!isValidIsoDate(data)) {
        return { ok: false, error: `Invalid date "${data}": expected valid YYYY-MM-DD` };
      }
      const dataYear = Number(data.slice(0, 4));
      if (args.ano !== undefined && args.ano !== dataYear) {
        return {
          ok: false,
          error: `Year mismatch: ano (${args.ano}) differs from data year (${dataYear})`,
        };
      }
    }

    const year = args.ano ?? (data ? Number(data.slice(0, 4)) : currentSaoPauloYear());
    if (!Number.isInteger(year) || year < 1900 || year > 2199) {
      return { ok: false, error: `Invalid year: ${year}. Expected integer between 1900 and 2199.` };
    }

    const url = `${BRASILAPI_BASE}/feriados/v1/${year}`;
    const res = await fetchCachedJson(url, `feriados:${year}`, cache, { expectArray: true });
    if (!res.ok) {
      return { ok: false, error: `BrasilAPI Feriados error: ${res.error}` };
    }

    const holidays = res.data as unknown[];
    if (data) {
      const holidayMatch =
        holidays.find((entry) => isPlainObject(entry) && entry.date === data) ?? null;
      const [y, m, d] = data.split("-").map(Number);
      const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = Boolean(holidayMatch);

      return {
        ok: true,
        data: {
          tipo: "feriados",
          year,
          date: data,
          is_holiday: isHoliday,
          is_weekend: isWeekend,
          is_business_day: !isHoliday && !isWeekend,
          holiday: holidayMatch,
          holidays,
          source: "BrasilAPI — Feriados Nacionais",
          fetchedAt: res.source.fetchedAt,
          untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
        },
        source: res.source,
      };
    }

    return {
      ok: true,
      data: {
        tipo: "feriados",
        year,
        holidays,
        total: holidays.length,
        source: "BrasilAPI — Feriados Nacionais",
        fetchedAt: res.source.fetchedAt,
        untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
      },
      source: res.source,
    };
  }

  // tipo === "ddd"
  const ddd = typeof args.ddd === "string" ? args.ddd.trim() : "";
  if (!/^\d{2}$/.test(ddd)) {
    return { ok: false, error: "ddd is required and must be 2 digits when tipo is ddd" };
  }

  const expectedUfRaw = typeof args.uf_esperada === "string" ? args.uf_esperada.trim() : "";
  if (expectedUfRaw && !/^[A-Za-z]{2}$/.test(expectedUfRaw)) {
    return { ok: false, error: "uf_esperada must be 2 letters" };
  }

  const url = `${BRASILAPI_BASE}/ddd/v1/${encodeURIComponent(ddd)}`;
  const res = await fetchCachedJson(url, `ddd:${ddd}`, cache, { expectObject: true });
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === "not found" ? `DDD not found: ${ddd}` : `BrasilAPI DDD error: ${res.error}`,
    };
  }

  const record = res.data as Record<string, unknown>;
  const state = asString(record.state);
  const cities = Array.isArray(record.cities) ? record.cities : [];
  const expectedUf = expectedUfRaw ? expectedUfRaw.toUpperCase() : undefined;
  const ufMatches =
    expectedUf !== undefined
      ? state.length > 0 && expectedUf === state.toUpperCase()
      : undefined;

  return {
    ok: true,
    data: {
      tipo: "ddd",
      ddd,
      state,
      cities,
      ...(expectedUf !== undefined
        ? { expected_uf: expectedUf, uf_matches: ufMatches }
        : {}),
      source: "BrasilAPI — DDD",
      fetchedAt: res.source.fetchedAt,
      untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
    },
    source: res.source,
  };
}

// ─── Tool Definitions & Explicit Registration ───────────────────────────────

export const CNAE_NCM_LOOKUP_TOOL: ToolHandler = {
  name: "cnae_ncm_lookup",
  description: `Look up Brazilian economic activity classifications (CNAE via IBGE v2) and Mercosur goods nomenclature (NCM via BrasilAPI).
For CNAE, pass codigo (2, 3, 4-5, or 7 digits) or termo for paginated class search.
For NCM, pass codigo (e.g. '2710.12.59') or termo for paginated description search. No API key required.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["cnae", "ncm"],
        description: "Classification table: 'cnae' (IBGE v2) or 'ncm' (BrasilAPI)",
      },
      codigo: {
        type: "string",
        description: "CNAE code (2, 3, 4-5, or 7 digits) or NCM code",
        minLength: 1,
        maxLength: 20,
      },
      termo: {
        type: "string",
        description: "Search term for CNAE classes or NCM descriptions",
        minLength: 1,
        maxLength: 120,
      },
      page: {
        type: "integer",
        description: "1-indexed page number for paginated search results (default: 1)",
        minimum: 1,
        maximum: 1000,
        default: 1,
      },
      limit: {
        type: "integer",
        description: "Results per page (default: 25, max: 50)",
        minimum: 1,
        maximum: 50,
        default: 25,
      },
    },
    required: ["tipo"],
    additionalProperties: false,
  },
  zodSchema: CnaeNcmSchema,
  execute: async (args, _apiConfig, cache) => executeCnaeNcm(args as CnaeNcmArgs, cache),
};

export const SISTEMA_FINANCEIRO_LOOKUP_TOOL: ToolHandler = {
  name: "sistema_financeiro_lookup",
  description: `Query Brazil's financial system registries via BrasilAPI: banks (COMPE/ISPB), Pix participants, and CVM brokers (corretoras).
Supports direct single-item lookup (bank code or 14-digit broker CNPJ) and cached server-side filtering with pagination (default 25, max 50). No API key required.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["bancos", "pix", "corretoras"],
        description: "Financial registry to query",
      },
      codigo: {
        type: "string",
        description: "Numeric COMPE bank code (1-6 digits, e.g. '1' or '001') for bancos",
      },
      ispb: {
        type: "string",
        description: "8-digit ISPB code for bancos or pix",
      },
      cnpj: {
        type: "string",
        description: "Full 14-digit or partial CNPJ for corretoras",
        minLength: 11,
        maxLength: 20,
      },
      busca: {
        type: "string",
        description: "Case/accent-insensitive name or city filter",
        minLength: 1,
        maxLength: 120,
      },
      status: {
        type: "string",
        description: "Status or participation modality filter",
        minLength: 1,
        maxLength: 60,
      },
      page: {
        type: "integer",
        description: "1-indexed page number (default: 1)",
        minimum: 1,
        maximum: 1000,
        default: 1,
      },
      limit: {
        type: "integer",
        description: "Results per page (default: 25, max: 50)",
        minimum: 1,
        maximum: 50,
        default: 25,
      },
    },
    required: ["tipo"],
    additionalProperties: false,
  },
  zodSchema: SistemaFinanceiroSchema,
  execute: async (args, _apiConfig, cache) =>
    executeSistemaFinanceiro(args as SistemaFinanceiroArgs, cache),
};

export const FERIADOS_DDD_LOOKUP_TOOL: ToolHandler = {
  name: "feriados_ddd_lookup",
  description: `Check Brazilian national holidays / business days or verify DDD area codes against state (UF) and municipalities via BrasilAPI.
Use uf_esperada with tipo='ddd' for registration anti-fraud consistency checks. No API key required.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["feriados", "ddd"],
        description: "Lookup type: 'feriados' or 'ddd'",
      },
      ano: {
        type: "integer",
        description: "Year (1900-2199) for national holidays",
        minimum: 1900,
        maximum: 2199,
      },
      data: {
        type: "string",
        description: "ISO date (YYYY-MM-DD) to check holiday, weekend, and business day status",
      },
      ddd: {
        type: "string",
        description: "2-digit Brazilian area code (required when tipo='ddd')",
      },
      uf_esperada: {
        type: "string",
        description: "Optional 2-letter expected state UF for consistency verification",
      },
    },
    required: ["tipo"],
    additionalProperties: false,
  },
  zodSchema: FeriadosDddSchema,
  execute: async (args, _apiConfig, cache) =>
    executeFeriadosDdd(args as FeriadosDddArgs, cache),
};

export const FISCAL_BANKING_TOOLS: readonly ToolHandler[] = [
  CNAE_NCM_LOOKUP_TOOL,
  SISTEMA_FINANCEIRO_LOOKUP_TOOL,
  FERIADOS_DDD_LOOKUP_TOOL,
];

/**
 * Idempotently register the three fiscal/banking tools in the global registry.
 * Called intentionally during catalog integration (TCK-0044), not on module import.
 */
export function registerFiscalBankingTools(): void {
  for (const tool of FISCAL_BANKING_TOOLS) {
    if (!hasTool(tool.name)) {
      registerTool(tool);
    }
  }
}

export type { CnaeNcmArgs, FeriadosDddArgs, SistemaFinanceiroArgs };
