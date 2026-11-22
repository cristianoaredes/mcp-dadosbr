/**
 * Legal tools — Datajud, OAB, BNMP, Procurados, Lista Suja
 */

import { registerTool } from "../core/registry.js";
import { formatTimeoutMessage, httpJson } from "../core/http-client.js";
import { executeWithConcurrencyLimit } from "../core/intelligence.js";
import { SERVER_NAME, SERVER_VERSION } from "../config/index.js";
import { TIMEOUTS } from "../config/timeouts.js";
import {
    DatajudSchema,
    BnmpSchema,
    ListaSujaSchema,
    OabSchema,
    ProcuradosSchema,
} from "../core/tool-schemas.js";
import { createTimeoutController, isAbortOrTimeoutError } from "../shared/utils/timeout.js";
import {
    sanitizeUntrustedText,
    UNTRUSTED_EXTERNAL_DATA_NOTICE,
} from "../shared/agentic-guard.js";
import { attachLgpdNotice, HOMONYM_HUMAN_REVIEW_NOTICE } from "../shared/compliance-notices.js";
import {
    decodeMteCsv,
    LISTA_SUJA_CACHE_KEY,
    matchMteListaSuja,
    MTE_LISTA_SUJA_CSV_URL,
    MteListaSujaEntry,
    parseMteListaSujaCsv,
} from "../shared/mte-lista-suja.js";
import { Cache, LookupResult } from "../types/index.js";

// ─── Datajud / CNJ ──────────────────────────────────────────────────────────

const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";
const TRIBUNAL_MAP: Record<string, string> = {
    tst: "api_publica_tst", trf1: "api_publica_trf1", trf2: "api_publica_trf2",
    trf3: "api_publica_trf3", trf4: "api_publica_trf4", trf5: "api_publica_trf5",
    tjsp: "api_publica_tjsp", tjrj: "api_publica_tjrj", tjmg: "api_publica_tjmg",
    tjrs: "api_publica_tjrs", tjpr: "api_publica_tjpr", tjsc: "api_publica_tjsc",
    tjba: "api_publica_tjba", tjpe: "api_publica_tjpe", tjce: "api_publica_tjce",
    tjgo: "api_publica_tjgo", tjdf: "api_publica_tjdft",
};

interface DatajudArgs { query: string; tribunal?: string; tamanho?: number; }

async function executeDatajud(args: DatajudArgs, cache?: Cache): Promise<LookupResult> {
    const apiKey = process.env.DATAJUD_API_KEY;
    if (!apiKey) {
        return { ok: false, error: "DATAJUD_API_KEY not configured. Register at datajud.cnj.jus.br to get a free API key." };
    }
    const { query, tribunal = "tjsp", tamanho = 10 } = args;
    const apiName = TRIBUNAL_MAP[tribunal.toLowerCase()] || TRIBUNAL_MAP.tjsp;
    const cacheKey = `datajud:${apiName}:${tamanho}:${query.trim().toLowerCase()}`;
    if (cache) {
        const cached = await cache.get(cacheKey);
        if (cached) return { ok: true, data: attachLgpdNotice(cached) };
    }

    const url = `${DATAJUD_BASE}/${apiName}/_search`;
    const timeoutMs = TIMEOUTS.HTTP_REQUEST_MS;
    const ctrl = createTimeoutController(timeoutMs);
    const digits = query.replace(/\D/g, "");
    const esQuery = digits.length === 20
        ? { match: { numeroProcesso: digits } }
        : { query_string: { query } };
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `APIKey ${apiKey}` },
            body: JSON.stringify({ query: esQuery, size: tamanho }),
            signal: ctrl.signal,
        });
        if (!resp.ok) return { ok: false, error: `Datajud API error: HTTP ${resp.status}` };
        const data = await resp.json();
        const payload = {
            query,
            tribunal,
            results: data,
            source: `Datajud — CNJ (${tribunal.toUpperCase()})`,
            lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
        };
        if (cache) await cache.set(cacheKey, payload);
        return { ok: true, data: payload };
    } catch (err) {
        if (ctrl.didTimeout() || isAbortOrTimeoutError(err)) {
            return { ok: false, error: `Datajud error: ${formatTimeoutMessage(timeoutMs)}` };
        }
        return { ok: false, error: `Datajud error: ${err instanceof Error ? err.message : String(err)}` };
    } finally {
        ctrl.cleanup();
    }
}

registerTool({
    name: "datajud_processos",
    description: `Search Brazilian court records via the CNJ Datajud Public API.
Query lawsuits and legal proceedings across Brazilian tribunals.
Requires DATAJUD_API_KEY. Supports 17+ tribunals.`,
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search term (CNPJ, CPF, company name, case number)" },
            tribunal: { type: "string", description: "Court code (default: 'tjsp'). Options: tst, trf1-5, tjsp, tjrj, tjmg, etc." },
            tamanho: { type: "number", description: "Max results (default: 10)", minimum: 1, maximum: 100, default: 10 },
        },
        required: ["query"],
    },
    zodSchema: DatajudSchema,
    execute: async (args, _apiConfig, cache) => executeDatajud(args as DatajudArgs, cache),
});

// ─── OAB / CNA ──────────────────────────────────────────────────────────────

interface OabArgs { nome?: string; inscricao?: string; uf?: string; }

async function executeOab(args: OabArgs, cache?: Cache): Promise<LookupResult> {
    const { nome, inscricao, uf } = args;
    const params = new URLSearchParams();
    if (nome) params.set("nome", nome);
    if (inscricao) params.set("inscricao", inscricao);
    if (uf) params.set("uf", uf);
    params.set("pagina", "1"); params.set("tamanhoPagina", "10");
    const cacheKey = `oab:${params.toString()}`;
    try {
        if (cache) {
            const cached = await cache.get(cacheKey);
            if (cached) return { ok: true, data: cached };
        }
        const result = await httpJson(`https://cna.oab.org.br/api/advogados?${params.toString()}`, { Accept: "application/json", Referer: "https://cna.oab.org.br/" });
        if (result.ok) {
            const payload = { ...args, results: result.data, source: "Cadastro Nacional dos Advogados (CNA) — OAB" };
            if (cache) await cache.set(cacheKey, payload);
            return { ok: true, data: payload };
        }
    } catch { /* fall through */ }
    return { ok: true, data: { ...args, source: "OAB — CNA", search_url: `https://cna.oab.org.br/search?q=${encodeURIComponent(nome || inscricao || "")}`, note: "CNA API requires CAPTCHA. Use the search portal.", manual_steps: ["1. Go to https://cna.oab.org.br/", "2. Enter name or registration number", "3. Select UF if known"] } };
}

registerTool({
    name: "oab_advogado",
    description: `Search the Brazilian Bar Association (OAB) national lawyer registry (CNA).
Verify lawyer credentials, registration status, and specializations. No API key required.
OSINT value: Verify legal representatives, check lawyer standing.`,
    inputSchema: {
        type: "object",
        properties: {
            nome: { type: "string", description: "Lawyer's name" },
            inscricao: { type: "string", description: "OAB registration number" },
            uf: { type: "string", description: "State code (e.g. 'SP', 'MG')" },
        },
    },
    zodSchema: OabSchema,
    execute: async (args, _apiConfig, cache) => executeOab(args as OabArgs, cache),
});

// ─── BNMP — Arrest Warrants ─────────────────────────────────────────────────

interface BnmpArgs { nome: string; orgaoJulgador?: string; }

async function executeBnmp(args: BnmpArgs, cache?: Cache): Promise<LookupResult> {
    const { nome, orgaoJulgador } = args;
    const cacheKey = `bnmp:${nome.trim().toLowerCase()}:${(orgaoJulgador || "").trim().toLowerCase()}`;
    if (cache) {
        const cached = await cache.get(cacheKey);
        if (cached) return { ok: true, data: attachLgpdNotice(cached) };
    }

    const timeoutMs = TIMEOUTS.HTTP_REQUEST_MS;
    const ctrl = createTimeoutController(timeoutMs);
    let timedOut = false;
    try {
        const body: Record<string, unknown> = { bpiPesquisa: { nomePessoa: nome }, pagination: { page: 0, size: 10 } };
        if (orgaoJulgador) body.bpiPesquisa = { ...body.bpiPesquisa as Record<string, unknown>, orgaoJulgador };
        const resp = await fetch(`https://portalbnmp.cnj.jus.br/bnmpportal/api/pesquisa-pecas/filter`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        if (resp.ok) {
            const data = await resp.json();
            const payload = {
                query: nome,
                results: data,
                source: "BNMP — Banco Nacional de Mandados de Prisão (CNJ)",
                lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
            };
            if (cache) await cache.set(cacheKey, payload);
            return { ok: true, data: payload };
        }
    } catch (err) {
        timedOut = ctrl.didTimeout() || isAbortOrTimeoutError(err);
    } finally {
        ctrl.cleanup();
    }
    return {
        ok: true,
        data: {
            query: nome,
            source: "BNMP",
            search_url: "https://portalbnmp.cnj.jus.br/#/pesquisa-peca",
            ...(timedOut ? { timed_out: true } : {}),
            note: timedOut
                ? "BNMP request timed out or requires CAPTCHA. Use the search portal."
                : "BNMP requires CAPTCHA. Use the search portal.",
            manual_steps: ["1. Go to https://portalbnmp.cnj.jus.br/#/pesquisa-peca", `2. Enter name: "${nome}"`, "3. Complete CAPTCHA"],
            lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
        },
    };
}

registerTool({
    name: "bnmp_mandados",
    description: `Search Brazil's National Arrest Warrant Database (BNMP — CNJ).
Searches active and historical arrest warrants by name. May require CAPTCHA.
OSINT value: Critical for background checks and criminal record verification.`,
    inputSchema: {
        type: "object",
        properties: {
            nome: { type: "string", description: "Person's name to search" },
            orgaoJulgador: { type: "string", description: "Issuing court name (optional)" },
        },
        required: ["nome"],
    },
    zodSchema: BnmpSchema,
    execute: async (args, _apiConfig, cache) => executeBnmp(args as BnmpArgs, cache),
});

// ─── Procurados — MJSP ──────────────────────────────────────────────────────

const PROCURADOS_BASE_URL = "https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/operacoes-integradas/projeto-captura/lista-de-procurados";
const PROCURADOS_PAGE_OFFSETS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180] as const;
export const PROCURADOS_CONCURRENCY = 4;
export const PROCURADOS_CACHE_KEY = "procurados:entries:v1";

interface ProcuradosArgs { nome: string; }

export interface ProcuradosEntry {
    name: string;
    state: string;
    date: string;
    url: string;
    normalized: string;
}

function normalizeProcuradosText(text: string): string {
    return text.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function parseProcuradosHtml(html: string): ProcuradosEntry[] {
    const entries: ProcuradosEntry[] = [];
    const entryRegex = /lista-de-procurados\/([^/]+)\/view[^>]*>\s*\n?\s*([^<]+)\n\s*(\d{2}\/\d{2}\/\d{4})/g;
    let match;
    while ((match = entryRegex.exec(html)) !== null) {
        const entryName = match[2].trim();
        const parts = entryName.split(" - ");
        entries.push({
            name: sanitizeUntrustedText(parts[0]?.trim() || entryName, 200),
            state: sanitizeUntrustedText(parts[1]?.trim() || "N/A", 50),
            date: match[3].trim(),
            url: `${PROCURADOS_BASE_URL}/${match[1]}/view`,
            normalized: normalizeProcuradosText(entryName),
        });
    }
    return entries;
}

function matchProcuradosEntries(
    entries: ProcuradosEntry[],
    searchParts: string[]
): Array<{ name: string; state: string; date: string; url: string }> {
    const matches: Array<{ name: string; state: string; date: string; url: string }> = [];
    for (const entry of entries) {
        if (searchParts.every((part) => entry.normalized.includes(part))) {
            matches.push({ name: entry.name, state: entry.state, date: entry.date, url: entry.url });
        }
    }
    return matches;
}

async function executeProcurados(args: ProcuradosArgs, cache?: Cache): Promise<LookupResult> {
    const { nome } = args;
    const searchParts = normalizeProcuradosText(nome).split(/\s+/).filter(Boolean);
    const totalPages = PROCURADOS_PAGE_OFFSETS.length;

    if (cache) {
        const cachedEntries = await cache.get<ProcuradosEntry[]>(PROCURADOS_CACHE_KEY);
        if (Array.isArray(cachedEntries)) {
            const matches = matchProcuradosEntries(cachedEntries, searchParts);
            if (matches.length > 0) {
                return {
                    ok: true,
                    data: {
                        query: nome,
                        source: "Ministério da Justiça e Segurança Pública — Projeto Captura",
                        total_matches: matches.length,
                        matches,
                        status: "FOUND",
                        partial: false,
                        cached: true,
                        pages_checked: totalPages,
                        pages_total: totalPages,
                        pages_failed: 0,
                        list_url: PROCURADOS_BASE_URL,
                        note: `⚠️ "${nome}" matched ${matches.length} entry(ies).`,
                        lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
                    },
                };
            }
            return {
                ok: true,
                data: {
                    query: nome,
                    source: "Ministério da Justiça e Segurança Pública — Projeto Captura",
                    total_matches: 0,
                    matches: [],
                    status: "NOT_FOUND",
                    partial: false,
                    cached: true,
                    pages_checked: totalPages,
                    pages_total: totalPages,
                    pages_failed: 0,
                    list_url: PROCURADOS_BASE_URL,
                    note: `"${nome}" was NOT found in the federal wanted persons list.`,
                    lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
                },
            };
        }
    }

    const perPageTimeoutMs = TIMEOUTS.HTTP_REQUEST_MS;
    const totalTimeoutMs = Math.max(perPageTimeoutMs, TIMEOUTS.INTELLIGENCE_TOTAL_MS);
    const totalCtrl = createTimeoutController(totalTimeoutMs);
    const totalDeadline = Date.now() + totalTimeoutMs;

    const pageEntries: ProcuradosEntry[][] = PROCURADOS_PAGE_OFFSETS.map(() => []);
    const succeededOffsets = new Set<number>();
    const pagesFailedMap = new Map<number, string>();
    const activeCtrls = new Set<ReturnType<typeof createTimeoutController>>();
    let settled = false;

    const tasks = PROCURADOS_PAGE_OFFSETS.map((offset, pageIndex) => async () => {
        const remainingMs = totalDeadline - Date.now();
        if (settled || remainingMs <= 0 || totalCtrl.signal.aborted) {
            pagesFailedMap.set(offset, "total timeout exceeded");
            return;
        }

        const pageTimeoutMs = Math.min(perPageTimeoutMs, remainingMs);
        const ctrl = createTimeoutController(pageTimeoutMs, totalCtrl.signal);
        activeCtrls.add(ctrl);
        try {
            const url = offset === 0 ? PROCURADOS_BASE_URL : `${PROCURADOS_BASE_URL}?b_start:int=${offset}`;
            const resp = await fetch(url, { signal: ctrl.signal });
            if (!resp.ok) {
                pagesFailedMap.set(offset, `HTTP ${resp.status}`);
                return;
            }
            const html = await resp.text();
            if (settled) return;
            pageEntries[pageIndex] = parseProcuradosHtml(html);
            succeededOffsets.add(offset);
        } catch (err) {
            const timedOut = ctrl.didTimeout() || totalCtrl.didTimeout() || isAbortOrTimeoutError(err);
            pagesFailedMap.set(
                offset,
                timedOut
                    ? formatTimeoutMessage(pageTimeoutMs)
                    : err instanceof Error
                        ? err.message
                        : String(err),
            );
        } finally {
            ctrl.cleanup();
            activeCtrls.delete(ctrl);
        }
    });

    try {
        await executeWithConcurrencyLimit(tasks, PROCURADOS_CONCURRENCY, totalCtrl.signal);
    } finally {
        settled = true;
        totalCtrl.cleanup();
        for (const ctrl of activeCtrls) {
            ctrl.cleanup();
        }
        activeCtrls.clear();
    }

    const pagesChecked = succeededOffsets.size;
    const pagesFailed: Array<{ offset: number; reason: string }> = [];
    for (const offset of PROCURADOS_PAGE_OFFSETS) {
        if (!succeededOffsets.has(offset)) {
            pagesFailed.push({ offset, reason: pagesFailedMap.get(offset) ?? "total timeout exceeded" });
        }
    }

    if (pagesChecked === 0) {
        return {
            ok: false,
            error: `Failed to query MJSP Projeto Captura (${pagesFailed.length}/${totalPages} pages failed; first error: ${pagesFailed[0]?.reason ?? "unknown"}). Cannot determine wanted status.`,
        };
    }

    const allEntries = pageEntries.flat();
    // Only cache when all 13 pages succeeded so partial scrapes never suppress future fail-closed checks
    if (cache && pagesFailed.length === 0 && pagesChecked === totalPages) {
        await cache.set(PROCURADOS_CACHE_KEY, allEntries);
    }

    const matches = matchProcuradosEntries(allEntries, searchParts);
    const partial = pagesFailed.length > 0;
    if (matches.length > 0) {
        return {
            ok: true,
            data: {
                query: nome,
                source: "Ministério da Justiça e Segurança Pública — Projeto Captura",
                total_matches: matches.length,
                matches,
                status: "FOUND",
                partial,
                pages_checked: pagesChecked,
                pages_total: totalPages,
                pages_failed: pagesFailed.length,
                ...(partial ? { failed_pages: pagesFailed } : {}),
                list_url: PROCURADOS_BASE_URL,
                note: partial
                    ? `⚠️ "${nome}" matched ${matches.length} entry(ies) across ${pagesChecked}/${totalPages} checked page(s); ${pagesFailed.length} page(s) failed.`
                    : `⚠️ "${nome}" matched ${matches.length} entry(ies).`,
                lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
            },
        };
    }

    if (partial) {
        return {
            ok: true,
            data: {
                query: nome,
                source: "Ministério da Justiça e Segurança Pública — Projeto Captura",
                total_matches: 0,
                matches: [],
                status: "INCONCLUSIVE",
                partial: true,
                pages_checked: pagesChecked,
                pages_total: totalPages,
                pages_failed: pagesFailed.length,
                failed_pages: pagesFailed,
                list_url: PROCURADOS_BASE_URL,
                note: `INCONCLUSIVE: "${nome}" was not found in the ${pagesChecked}/${totalPages} checked page(s), but ${pagesFailed.length} page(s) failed to load. Manual verification is required.`,
                lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
            },
        };
    }

    return {
        ok: true,
        data: {
            query: nome,
            source: "Ministério da Justiça e Segurança Pública — Projeto Captura",
            total_matches: 0,
            matches: [],
            status: "NOT_FOUND",
            partial: false,
            pages_checked: pagesChecked,
            pages_total: totalPages,
            pages_failed: 0,
            list_url: PROCURADOS_BASE_URL,
            note: `"${nome}" was NOT found in the federal wanted persons list.`,
            lgpd_notice: HOMONYM_HUMAN_REVIEW_NOTICE,
        },
    };
}

registerTool({
    name: "procurados_lookup",
    description: `Search the Brazilian Ministry of Justice "Projeto Captura" federal wanted persons list.
Searches all ~195 entries using fuzzy partial name matching. No API key required.
OSINT value: Critical for background checks, due diligence, and security screening.`,
    inputSchema: {
        type: "object",
        properties: { nome: { type: "string", description: "Person's name to search" } },
        required: ["nome"],
    },
    zodSchema: ProcuradosSchema,
    execute: async (args, _apiConfig, cache) => executeProcurados(args as ProcuradosArgs, cache),
});

// ─── Lista Suja ─────────────────────────────────────────────────────────────

interface ListaSujaArgs { query: string; }

async function executeListaSuja(args: ListaSujaArgs, cache?: Cache): Promise<LookupResult> {
    const { query } = args;
    let entries: MteListaSujaEntry[] | null = null;
    let fromCache = false;

    if (cache) {
        const cached = await cache.get<MteListaSujaEntry[]>(LISTA_SUJA_CACHE_KEY);
        if (Array.isArray(cached)) {
            entries = cached;
            fromCache = true;
        }
    }

    if (entries === null) {
        const ctrl = createTimeoutController(10_000);
        try {
            const res = await fetch(MTE_LISTA_SUJA_CSV_URL, {
                headers: {
                    "User-Agent": `${SERVER_NAME}/${SERVER_VERSION}`,
                    Accept: "text/csv, text/plain, */*",
                },
                signal: ctrl.signal,
            });
            if (res.ok) {
                const buffer = await res.arrayBuffer();
                const csvText = decodeMteCsv(buffer);
                const parsed = parseMteListaSujaCsv(csvText);
                entries = parsed;
                if (cache) {
                    await cache.set(LISTA_SUJA_CACHE_KEY, entries);
                }
            }
        } catch {
            /* fall through to guided fallback without caching errors */
        } finally {
            ctrl.cleanup();
        }
    }

    if (entries !== null) {
        const { total_matches, matches } = matchMteListaSuja(entries, query);
        return {
            ok: true,
            data: attachLgpdNotice({
                query,
                status: matches.length > 0 ? "FOUND" : "NOT_FOUND",
                total_matches,
                matches,
                truncated: total_matches > matches.length,
                total_employers_in_list: entries.length,
                cached: Boolean(fromCache),
                source: "MTE — Cadastro de Empregadores (Lista Suja)",
                source_url: MTE_LISTA_SUJA_CSV_URL,
                fetchedAt: new Date().toISOString(),
                untrusted_data_notice: UNTRUSTED_EXTERNAL_DATA_NOTICE,
            }),
        };
    }

    return {
        ok: true,
        data: attachLgpdNotice({
            query,
            source: "Portal da Transparência / MTE",
            instruction: `Unable to fetch the MTE Lista Suja CSV automatically. To verify if "${query}" appears on the Lista Suja (slave labor blacklist), check:`,
            manual_urls: [
                MTE_LISTA_SUJA_CSV_URL,
                "https://portaldatransparencia.gov.br/sancoes",
                "https://dados.gov.br/dados/conjuntos-dados/cadastro-de-empregadores-que-tenham-submetido-trabalhadores-a-condicoes-analogas-a-de-escravo",
            ],
        }),
    };
}

registerTool({
    name: "lista_suja_lookup",
    description: `Check if a company or person appears on Brazil's "Lista Suja" (slave labor blacklist).
Maintained by MTE (Ministry of Labor). No API key required.
OSINT value: Critical ESG/compliance indicator.`,
    inputSchema: {
        type: "object",
        properties: { query: { type: "string", description: "Company name or CNPJ to search" } },
        required: ["query"],
    },
    zodSchema: ListaSujaSchema,
    execute: async (args, _apiConfig, cache) => executeListaSuja(args as ListaSujaArgs, cache),
});

// Export functions needed by deep_profile orchestrator and unit tests
export {
    executeDatajud,
    executeBnmp,
    executeProcurados,
    executeListaSuja,
    LISTA_SUJA_CACHE_KEY,
    MTE_LISTA_SUJA_CSV_URL,
};
export type { DatajudArgs, BnmpArgs, ProcuradosArgs, ListaSujaArgs };
