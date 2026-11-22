/**
 * Government tools — IBGE, Transparência, CEIS/CNEP, PNCP, Querido Diário
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import {
    CeisCnepSchema,
    IbgeSchema,
    PncpSchema,
    QueridoDiarioSchema,
    TransparenciaSchema,
} from "../core/tool-schemas.js";
import { Cache, LookupResult } from "../types/index.js";
import { PNCP_ORIGIN, pncpCnpj, pncpDate, positiveInteger } from "../shared/pncp.js";
import { attachLgpdNotice, HOMONYM_HUMAN_REVIEW_NOTICE } from "../shared/compliance-notices.js";

// ─── IBGE Localidades ───────────────────────────────────────────────────────

const IBGE_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

interface IBGEArgs {
    tipo: "estados" | "municipios" | "municipios_por_uf" | "regioes";
    uf?: string;
    id?: number;
    nome?: string;
    page?: number;
    limit?: number;
}

interface CachedPayload {
    data: unknown;
    source: { url: string; fetchedAt: string };
}

function normalizeSearchText(value: string): string {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function filterIbgeItems(items: unknown[], id?: number, nome?: string): unknown[] {
    let filtered = items;
    if (id !== undefined) {
        filtered = filtered.filter(
            (item) => typeof item === "object" && item !== null && (item as { id?: unknown }).id === id
        );
    }
    if (nome) {
        const needle = normalizeSearchText(nome);
        filtered = filtered.filter((item) => {
            if (typeof item !== "object" || item === null) return false;
            const entry = item as { nome?: unknown; sigla?: unknown };
            const entryName = typeof entry.nome === "string" ? normalizeSearchText(entry.nome) : "";
            const entrySigla = typeof entry.sigla === "string" ? normalizeSearchText(entry.sigla) : "";
            return entryName.includes(needle) || entrySigla.includes(needle);
        });
    }
    return filtered;
}

async function executeIBGE(args: IBGEArgs, cache?: Cache): Promise<LookupResult> {
    let url: string;
    switch (args.tipo) {
        case "estados": url = `${IBGE_BASE}/estados?orderBy=nome`; break;
        case "municipios": url = `${IBGE_BASE}/municipios?orderBy=nome`; break;
        case "municipios_por_uf":
            if (!args.uf) return { ok: false, error: "UF is required for municipios_por_uf" };
            url = `${IBGE_BASE}/estados/${encodeURIComponent(args.uf)}/municipios?orderBy=nome`; break;
        case "regioes": url = `${IBGE_BASE}/regioes`; break;
        default: return { ok: false, error: `Unknown tipo: ${args.tipo}` };
    }

    const cacheKey = `ibge:${url.toLowerCase()}`;
    let rawData: unknown;
    let source: { url: string; fetchedAt: string };

    const cached = cache ? await cache.get<CachedPayload>(cacheKey) : null;
    if (cached && typeof cached === "object" && "data" in cached && cached.source) {
        rawData = cached.data;
        source = cached.source;
    } else {
        const result = await httpJson(url);
        if (!result.ok) return { ok: false, error: result.error || "IBGE API error" };
        rawData = result.data;
        source = { url, fetchedAt: new Date().toISOString() };
        if (cache) await cache.set(cacheKey, { data: rawData, source });
    }

    if (!Array.isArray(rawData)) {
        return { ok: true, data: rawData, source };
    }

    const filtered = filterIbgeItems(rawData, args.id, args.nome);
    if (args.page !== undefined || args.limit !== undefined) {
        const page = args.page ?? 1;
        const limit = args.limit ?? 50;
        const total = filtered.length;
        const start = (page - 1) * limit;
        const items = filtered.slice(start, start + limit);
        return {
            ok: true,
            data: {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    total_pages: Math.ceil(total / limit),
                    has_more: start + items.length < total,
                },
                ...(args.nome || args.id !== undefined
                    ? {
                        filter: {
                            ...(args.nome ? { nome: args.nome } : {}),
                            ...(args.id !== undefined ? { id: args.id } : {}),
                        },
                    }
                    : {}),
            },
            source,
        };
    }

    return { ok: true, data: filtered, source };
}

registerTool({
    name: "ibge_localidades",
    description: `Query Brazilian geographic data from IBGE (Instituto Brasileiro de Geografia e Estatística).

Available queries:
- estados: List all 27 Brazilian states
- municipios: List all ~5,570 municipalities (supports optional nome/id filtering and page/limit pagination)
- municipios_por_uf: List municipalities by state (requires UF code)
- regioes: List the 5 macro-regions

No API key required.`,
    inputSchema: {
        type: "object",
        properties: {
            tipo: { type: "string", enum: ["estados", "municipios", "municipios_por_uf", "regioes"], description: "Query type" },
            uf: { type: "string", description: "State code (required for municipios_por_uf, e.g. 'SP')" },
            id: { type: "number", description: "Specific entity ID (optional)" },
            nome: { type: "string", description: "Optional case/accent-insensitive name or sigla filter" },
            page: { type: "number", description: "Optional 1-indexed page number (defaults to 1 when limit is set)", minimum: 1, maximum: 10000 },
            limit: { type: "number", description: "Optional page size (defaults to 50 when page is set)", minimum: 1, maximum: 1000 },
        },
        required: ["tipo"],
    },
    zodSchema: IbgeSchema,
    execute: async (args, _apiConfig, cache) => executeIBGE(args as IBGEArgs, cache),
});

// ─── Transparência ──────────────────────────────────────────────────────────

const TRANSPARENCIA_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

interface TransparenciaArgs {
    cnpj: string;
    tipo: "contratos" | "licitacoes" | "convenios" | "servidores" | "sancoes";
    dataInicio?: string;
    dataFim?: string;
    pagina?: number;
}

async function executeTransparencia(args: TransparenciaArgs, cache?: Cache): Promise<LookupResult> {
    const apiKey = process.env.TRANSPARENCIA_API_KEY;
    if (!apiKey) {
        return { ok: false, error: "TRANSPARENCIA_API_KEY not configured. Register at portaldatransparencia.gov.br/api-de-dados/cadastrar-email to get a free API key." };
    }
    const { cnpj, tipo, dataInicio, dataFim, pagina = 1 } = args;
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const params = new URLSearchParams();
    params.set("pagina", String(pagina));
    if (dataInicio) params.set("dataInicial", dataInicio);
    if (dataFim) params.set("dataFinal", dataFim);

    let url: string;
    switch (tipo) {
        case "contratos":
            params.set("cnpjFornecedor", cleanCnpj);
            url = `${TRANSPARENCIA_BASE}/contratos/por-fornecedor?${params.toString()}`; break;
        case "licitacoes":
            params.set("cnpjContratante", cleanCnpj);
            url = `${TRANSPARENCIA_BASE}/licitacoes?${params.toString()}`; break;
        case "convenios":
            params.set("cnpjConvenente", cleanCnpj);
            url = `${TRANSPARENCIA_BASE}/convenios?${params.toString()}`; break;
        case "servidores":
            params.set("cpf", cleanCnpj);
            url = `${TRANSPARENCIA_BASE}/servidores?${params.toString()}`; break;
        case "sancoes":
            params.set("cnpjSancionado", cleanCnpj);
            url = `${TRANSPARENCIA_BASE}/ceis?${params.toString()}`; break;
        default:
            return { ok: false, error: `Unknown tipo: ${tipo}. Valid: contratos, licitacoes, convenios, servidores, sancoes` };
    }

    const cacheKey = `transparencia:${url}`;
    if (cache) {
        const cached = await cache.get(cacheKey);
        if (cached) return { ok: true, data: cached };
    }

    const result = await httpJson(url, { "chave-api-dados": apiKey });
    if (!result.ok) return { ok: false, error: `Portal da Transparência API error: ${result.error}` };
    if (cache) await cache.set(cacheKey, result.data);
    return { ok: true, data: result.data };
}

registerTool({
    name: "transparencia_lookup",
    description: `Query the Brazilian Federal Government Transparency Portal (Portal da Transparência).

Available queries: contratos, licitacoes, convenios, servidores, sancoes.
Requires a free API key from portaldatransparencia.gov.br.`,
    inputSchema: {
        type: "object",
        properties: {
            cnpj: { type: "string", description: "CNPJ or CPF to search" },
            tipo: { type: "string", enum: ["contratos", "licitacoes", "convenios", "servidores", "sancoes"], description: "Query type" },
            dataInicio: { type: "string", description: "Start date (DD/MM/YYYY, optional)" },
            dataFim: { type: "string", description: "End date (DD/MM/YYYY, optional)" },
            pagina: { type: "number", description: "Page number (default: 1)", minimum: 1, maximum: 1000, default: 1 },
        },
        required: ["cnpj", "tipo"],
    },
    zodSchema: TransparenciaSchema,
    execute: async (args, _apiConfig, cache) => executeTransparencia(args as TransparenciaArgs, cache),
});

// ─── CEIS / CNEP / CEPIM ────────────────────────────────────────────────────

const CEIS_API_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/ceis";
const CNEP_API_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/cnep";
const CEPIM_API_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/cepim";

type SanctionType = "ceis" | "cnep" | "cepim" | "all";

interface CeisCnepArgs { query: string; tipo?: SanctionType; pagina?: number; }

async function executeCeisCnep(args: CeisCnepArgs, cache?: Cache): Promise<LookupResult> {
    const apiKey = process.env.TRANSPARENCIA_API_KEY;
    if (!apiKey) {
        return {
            ok: true, data: {
                query: args.query,
                note: "TRANSPARENCIA_API_KEY not configured. CEIS/CNEP/CEPIM queries require the Portal da Transparência API key.",
                manual_check_urls: [
                    "https://portaldatransparencia.gov.br/sancoes/ceis",
                    "https://portaldatransparencia.gov.br/sancoes/cnep",
                    "https://portaldatransparencia.gov.br/sancoes/cepim",
                ],
                how_to_register: "Register at portaldatransparencia.gov.br/api-de-dados/cadastrar-email",
                lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
            },
        };
    }
    const headers = { "chave-api-dados": apiKey };
    const tipo = args.tipo || "all";
    const pagina = args.pagina || 1;
    const cacheKey = `ceis_cnep:${tipo}:${pagina}:${args.query.trim().toLowerCase()}`;
    if (cache) {
        const cached = await cache.get(cacheKey);
        if (cached) return { ok: true, data: attachLgpdNotice(cached) };
    }

    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    const fetchSanctions = async (url: string, name: string) => {
        const fullUrl = `${url}?cnpjSancionado=${encodeURIComponent(args.query)}&pagina=${pagina}`;
        const result = await httpJson(fullUrl, headers);
        if (result.ok) { results[name] = result.data; }
        else {
            const nameUrl = `${url}?nomeSancionado=${encodeURIComponent(args.query)}&pagina=${pagina}`;
            const nameResult = await httpJson(nameUrl, headers);
            if (nameResult.ok) { results[name] = nameResult.data; }
            else { errors.push(`${name}: ${nameResult.error || "Request failed"}`); }
        }
    };
    const tasks: Promise<void>[] = [];
    if (tipo === "ceis" || tipo === "all") tasks.push(fetchSanctions(CEIS_API_URL, "ceis"));
    if (tipo === "cnep" || tipo === "all") tasks.push(fetchSanctions(CNEP_API_URL, "cnep"));
    if (tipo === "cepim" || tipo === "all") tasks.push(fetchSanctions(CEPIM_API_URL, "cepim"));
    await Promise.allSettled(tasks);

    const payload = {
        query: args.query, sanctions: results, databases_checked: Object.keys(results),
        errors: errors.length > 0 ? errors : undefined,
        legend: {
            ceis: "Cadastro de Empresas Inidôneas e Suspensas — barred from public contracts",
            cnep: "Cadastro Nacional de Empresas Punidas — punished under Anti-Corruption Law (Lei 12.846)",
            cepim: "Cadastro de Entidades Sem Fins Lucrativos Impedidas — NGOs barred from federal agreements",
        },
        lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
    };
    if (cache && errors.length === 0) {
        await cache.set(cacheKey, payload);
    }

    return { ok: true, data: payload };
}

registerTool({
    name: "ceis_cnep_lookup",
    description: `Search Brazil's government sanctions databases: CEIS (suspended companies), CNEP (punished under Anti-Corruption Law), and CEPIM (barred NGOs).
Critical for compliance, ESG due diligence, and anti-corruption screening.
Requires TRANSPARENCIA_API_KEY — falls back to manual check URLs without it.`,
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "CNPJ or company name to search in sanctions databases" },
            tipo: { type: "string", enum: ["ceis", "cnep", "cepim", "all"], description: "Which database (default: 'all')", default: "all" },
            pagina: { type: "number", description: "Page number (default: 1)", minimum: 1, maximum: 1000, default: 1 },
        },
        required: ["query"],
    },
    zodSchema: CeisCnepSchema,
    execute: async (args, _apiConfig, cache) => executeCeisCnep(args as CeisCnepArgs, cache),
});

// ─── PNCP ───────────────────────────────────────────────────────────────────

const PNCP_PUBLICACOES = PNCP_ORIGIN + "/api/consulta/v1/contratacoes/publicacao";
const PNCP_SEARCH = PNCP_ORIGIN + "/api/search/";
const PNCP_SOURCE = "Portal Nacional de Contratações Públicas (PNCP)";

interface PncpArgs {
    query: string;
    cnpj_orgao?: string;
    data_inicial?: string;
    data_final?: string;
    modalidade_id?: number;
    pagina?: number;
}

async function executePncpPublication(args: PncpArgs, cache?: Cache): Promise<LookupResult> {
    const { query = "", modalidade_id, pagina = 1 } = args;
    if (query !== "") return { ok: false, error: "Use query vazia para consultar publicações por filtros." };
    const from = pncpDate(args.data_inicial);
    const to = pncpDate(args.data_final);
    if (!from || !to || from > to) {
        return { ok: false, error: "Informe um período válido de publicação, com data inicial até a final." };
    }
    if (!positiveInteger(modalidade_id) || !positiveInteger(pagina)) {
        return { ok: false, error: "Modalidade e página devem ser números inteiros positivos." };
    }
    const cnpj = pncpCnpj(args.cnpj_orgao);
    if (args.cnpj_orgao && !cnpj) return { ok: false, error: "Informe um CNPJ de órgão válido." };

    const params = new URLSearchParams({
        dataInicial: from.replaceAll("-", ""),
        dataFinal: to.replaceAll("-", ""),
        codigoModalidadeContratacao: String(modalidade_id),
        pagina: String(pagina),
        tamanhoPagina: "10",
    });
    if (cnpj) params.set("cnpj", cnpj);
    const url = `${PNCP_PUBLICACOES}?${params}`;
    const cacheKey = `pncp:pub:${url}`;
    if (cache) {
        const cached = await cache.get<CachedPayload>(cacheKey);
        if (cached && typeof cached === "object" && "data" in cached && cached.source) {
            return { ok: true, data: cached.data, source: cached.source };
        }
    }

    const emptyPage = { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: pagina, paginasRestantes: 0, empty: true };
    const result = await httpJson(url, undefined, undefined, { noContent: emptyPage });
    if (!result.ok) return { ok: false, error: `Falha na consulta ao PNCP: ${result.error}` };
    const payload = { query, results: result.data, source: PNCP_SOURCE, legal_basis: "Lei 14.133/2021" };
    const source = { url, fetchedAt: new Date().toISOString() };
    if (cache) await cache.set(cacheKey, { data: payload, source });
    return {
        ok: true,
        data: payload,
        source,
    };
}

async function executePncp(args: PncpArgs, cache?: Cache): Promise<LookupResult> {
    if (args.modalidade_id !== undefined) return executePncpPublication(args, cache);
    const { query, cnpj_orgao, pagina = 1 } = args;
    const params = new URLSearchParams({
        q: query,
        tipos_documento: "edital",
        ordenacao: "-data",
        pagina: String(pagina),
        tam_pagina: "10",
        status: "todos",
    });
    const cnpj = pncpCnpj(cnpj_orgao);
    if (cnpj) params.set("orgao_cnpj", cnpj);
    const url = `${PNCP_SEARCH}?${params.toString()}`;
    const cacheKey = `pncp:search:${url}`;
    try {
        if (cache) {
            const cached = await cache.get(cacheKey);
            if (cached) return { ok: true, data: cached };
        }
        const result = await httpJson(url);
        if (result.ok) {
            const payload = { query, results: result.data, source: PNCP_SOURCE, legal_basis: "Lei 14.133/2021" };
            if (cache) await cache.set(cacheKey, payload);
            return { ok: true, data: payload };
        }
        return { ok: true, data: { query, note: "PNCP API may be temporarily unavailable.", search_url: `https://pncp.gov.br/app/editais?q=${encodeURIComponent(query)}` } };
    } catch {
        return { ok: true, data: { query, note: "PNCP API connection failed.", search_url: `https://pncp.gov.br/app/editais?q=${encodeURIComponent(query)}` } };
    }
}

registerTool({
    name: "pncp_licitacoes",
    description: `Browse published procurement notices via the PNCP (Portal Nacional de Contratações Públicas).
To filter notices, pass modalidade_id, both publication dates, optional cnpj_orgao, and query as an empty string.
For the legacy portal keyword search, provide query without modalidade_id. No API key required.`,
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Portal search term, or empty string for filtered publications" },
            cnpj_orgao: { type: "string", description: "Contracting body's CNPJ (optional)" },
            data_inicial: { type: "string", description: "Publication start date (YYYY-MM-DD, DD/MM/YYYY or YYYYMMDD), required with modalidade_id" },
            data_final: { type: "string", description: "Publication end date (YYYY-MM-DD, DD/MM/YYYY or YYYYMMDD), required with modalidade_id" },
            modalidade_id: { type: "integer", minimum: 1, maximum: 100, description: "PNCP contracting modality ID, e.g. 6 for Pregão Eletrônico" },
            pagina: { type: "number", description: "Page number (default: 1)", minimum: 1, maximum: 1000, default: 1 },
        },
        required: ["query"],
    },
    zodSchema: PncpSchema,
    execute: async (args, _apiConfig, cache) => executePncp(args as PncpArgs, cache),
});

// ─── Querido Diário ─────────────────────────────────────────────────────────

const QUERIDO_DIARIO_API = "https://api.queridodiario.org.br";

interface QueridoDiarioArgs { query: string; territory_id?: string; since?: string; until?: string; page?: number; size?: number; }

async function executeQueridoDiario(args: QueridoDiarioArgs, cache?: Cache): Promise<LookupResult> {
    const { query, territory_id, since, until, page = 0, size = 10 } = args;
    const params = new URLSearchParams({ querystring: query, offset: String(page * size), size: String(size) });
    if (territory_id) params.set("territory_ids", territory_id);
    if (since) params.set("published_since", since);
    if (until) params.set("published_until", until);
    if (!query?.trim()) params.set("sort_by", "descending_date");
    const url = `${QUERIDO_DIARIO_API}/gazettes?${params.toString()}`;
    const cacheKey = `querido_diario:${url}`;
    try {
        if (cache) {
            const cached = await cache.get<CachedPayload>(cacheKey);
            if (cached && typeof cached === "object" && "data" in cached && cached.source) {
                return { ok: true, data: cached.data, source: cached.source };
            }
        }
        const result = await httpJson(url);
        if (result.ok) {
            const payload = { query, results: result.data, source: "Querido Diário — Open Knowledge Brasil", note: "Municipal official gazettes. Territory IDs follow IBGE codes." };
            const source = { url, fetchedAt: new Date().toISOString() };
            if (cache) await cache.set(cacheKey, { data: payload, source });
            return {
                ok: true,
                data: payload,
                source,
            };
        }
        return { ok: false, error: result.error || "Querido Diário API request failed" };
    } catch (err) {
        return { ok: false, error: `Querido Diário error: ${err instanceof Error ? err.message : String(err)}` };
    }
}

registerTool({
    name: "querido_diario",
    description: `Search Brazilian municipal official gazettes (Diários Oficiais).
Provided by Open Knowledge Brasil. Coverage depends on the municipality. No API key required.
OSINT value: Find company mentions in government publications, contracts, sanctions, permits.`,
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search text (company name, CNPJ, person, keyword); use an empty string for recent editions" },
            territory_id: { type: "string", description: "IBGE territory code (e.g. '3550308' for São Paulo)" },
            since: { type: "string", description: "Start date (YYYY-MM-DD, optional)" },
            until: { type: "string", description: "End date (YYYY-MM-DD, optional)" },
            page: { type: "number", description: "Page number (0-indexed, default: 0)", minimum: 0, maximum: 1000, default: 0 },
            size: { type: "number", description: "Results per page (default: 10, max: 100)", minimum: 1, maximum: 100, default: 10 },
        },
        required: ["query"],
    },
    zodSchema: QueridoDiarioSchema,
    execute: async (args, _apiConfig, cache) => executeQueridoDiario(args as QueridoDiarioArgs, cache),
});

// Export execute functions needed by deep_profile orchestrator
export { executeTransparencia, executeIBGE };
export type { TransparenciaArgs, IBGEArgs };
