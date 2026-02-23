/**
 * Legal tools — Datajud, OAB, BNMP, Procurados, Lista Suja
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { LookupResult } from "../types/index.js";

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

async function executeDatajud(args: DatajudArgs): Promise<LookupResult> {
    const apiKey = process.env.DATAJUD_API_KEY;
    if (!apiKey) {
        return { ok: false, error: "DATAJUD_API_KEY not configured. Register at datajud.cnj.jus.br to get a free API key." };
    }
    const { query, tribunal = "tjsp", tamanho = 10 } = args;
    const apiName = TRIBUNAL_MAP[tribunal.toLowerCase()] || TRIBUNAL_MAP.tjsp;
    const url = `${DATAJUD_BASE}/${apiName}/_search`;
    try {
        const resp = await fetch(url, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `APIKey ${apiKey}` },
            body: JSON.stringify({ query: { match: { "_all": query } }, size: tamanho }),
        });
        if (!resp.ok) return { ok: false, error: `Datajud API error: HTTP ${resp.status}` };
        const data = await resp.json();
        return { ok: true, data: { query, tribunal, results: data, source: `Datajud — CNJ (${tribunal.toUpperCase()})` } };
    } catch (err) {
        return { ok: false, error: `Datajud error: ${err instanceof Error ? err.message : String(err)}` };
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
            tamanho: { type: "number", description: "Max results (default: 10)", default: 10 },
        },
        required: ["query"],
    },
    execute: async (args) => executeDatajud(args as DatajudArgs),
});

// ─── OAB / CNA ──────────────────────────────────────────────────────────────

interface OabArgs { nome?: string; inscricao?: string; uf?: string; }

async function executeOab(args: OabArgs): Promise<LookupResult> {
    const { nome, inscricao, uf } = args;
    const params = new URLSearchParams();
    if (nome) params.set("nome", nome);
    if (inscricao) params.set("inscricao", inscricao);
    if (uf) params.set("uf", uf);
    params.set("pagina", "1"); params.set("tamanhoPagina", "10");
    try {
        const result = await httpJson(`https://cna.oab.org.br/api/advogados?${params.toString()}`, { Accept: "application/json", Referer: "https://cna.oab.org.br/" });
        if (result.ok) return { ok: true, data: { ...args, results: result.data, source: "Cadastro Nacional dos Advogados (CNA) — OAB" } };
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
    execute: async (args) => executeOab(args as OabArgs),
});

// ─── BNMP — Arrest Warrants ─────────────────────────────────────────────────

interface BnmpArgs { nome: string; orgaoJulgador?: string; }

async function executeBnmp(args: BnmpArgs): Promise<LookupResult> {
    const { nome, orgaoJulgador } = args;
    try {
        const body: Record<string, unknown> = { bpiPesquisa: { nomePessoa: nome }, pagination: { page: 0, size: 10 } };
        if (orgaoJulgador) body.bpiPesquisa = { ...body.bpiPesquisa as Record<string, unknown>, orgaoJulgador };
        const resp = await fetch(`https://portalbnmp.cnj.jus.br/bnmpportal/api/pesquisa-pecas/filter`, {
            method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body),
        });
        if (resp.ok) {
            const data = await resp.json();
            return { ok: true, data: { query: nome, results: data, source: "BNMP — Banco Nacional de Mandados de Prisão (CNJ)" } };
        }
    } catch { /* fall through */ }
    return { ok: true, data: { query: nome, source: "BNMP", search_url: "https://portalbnmp.cnj.jus.br/#/pesquisa-peca", note: "BNMP requires CAPTCHA. Use the search portal.", manual_steps: ["1. Go to https://portalbnmp.cnj.jus.br/#/pesquisa-peca", `2. Enter name: "${nome}"`, "3. Complete CAPTCHA"] } };
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
    execute: async (args) => executeBnmp(args as BnmpArgs),
});

// ─── Procurados — MJSP ──────────────────────────────────────────────────────

const PROCURADOS_BASE_URL = "https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/operacoes-integradas/projeto-captura/lista-de-procurados";

interface ProcuradosArgs { nome: string; }

async function executeProcurados(args: ProcuradosArgs): Promise<LookupResult> {
    const { nome } = args;
    const normalizedSearch = nome.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches: Array<{ name: string; state: string; date: string; url: string }> = [];
    const pageOffsets = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

    for (const offset of pageOffsets) {
        try {
            const url = offset === 0 ? PROCURADOS_BASE_URL : `${PROCURADOS_BASE_URL}?b_start:int=${offset}`;
            const resp = await fetch(url);
            if (!resp.ok) continue;
            const html = await resp.text();
            const entryRegex = /lista-de-procurados\/([^/]+)\/view[^>]*>\s*\n?\s*([^<]+)\n\s*(\d{2}\/\d{2}\/\d{4})/g;
            let match;
            while ((match = entryRegex.exec(html)) !== null) {
                const entryName = match[2].trim();
                const normalizedEntry = entryName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const searchParts = normalizedSearch.split(/\s+/);
                if (searchParts.every(part => normalizedEntry.includes(part))) {
                    const parts = entryName.split(" - ");
                    matches.push({ name: parts[0]?.trim() || entryName, state: parts[1]?.trim() || "N/A", date: match[3].trim(), url: `${PROCURADOS_BASE_URL}/${match[1]}/view` });
                }
            }
        } catch { /* continue */ }
    }
    return {
        ok: true, data: {
            query: nome, source: "Ministério da Justiça e Segurança Pública — Projeto Captura",
            total_matches: matches.length, matches, status: matches.length === 0 ? "NOT_FOUND" : "FOUND",
            list_url: PROCURADOS_BASE_URL,
            note: matches.length === 0 ? `"${nome}" was NOT found in the federal wanted persons list.` : `⚠️ "${nome}" matched ${matches.length} entry(ies).`,
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
    execute: async (args) => executeProcurados(args as ProcuradosArgs),
});

// ─── Lista Suja ─────────────────────────────────────────────────────────────

interface ListaSujaArgs { query: string; }

async function executeListaSuja(args: ListaSujaArgs): Promise<LookupResult> {
    const { query } = args;
    const searchUrl = `https://portaldatransparencia.gov.br/sancoes/consulta?paginacaoSimples=true&tamanhoPagina=20&offset=0&direcaoOrdenacao=asc&colunaOrdenacao=sancionado_razaoSocial&sancionado=${encodeURIComponent(query)}`;
    try {
        const result = await httpJson(searchUrl);
        if (result.ok && result.data) return { ok: true, data: { query, results: result.data, source: "Portal da Transparência — Lista Suja" } };
    } catch { /* fall through */ }
    return {
        ok: true, data: {
            query, source: "Portal da Transparência / dados.gov.br",
            instruction: `To verify if "${query}" appears on the Lista Suja (slave labor blacklist), check:`,
            manual_urls: [
                "https://portaldatransparencia.gov.br/sancoes",
                "https://dados.gov.br/dados/conjuntos-dados/cadastro-de-empregadores-que-tenham-submetido-trabalhadores-a-condicoes-analogas-a-de-escravo",
            ],
        },
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
    execute: async (args) => executeListaSuja(args as ListaSujaArgs),
});

// Export functions needed by deep_profile orchestrator
export { executeDatajud, executeListaSuja };
export type { DatajudArgs, ListaSujaArgs };
