/**
 * Government tools — IBGE, Transparência, CEIS/CNEP, PNCP, Querido Diário
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { LookupResult } from "../types/index.js";

// ─── IBGE Localidades ───────────────────────────────────────────────────────

const IBGE_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

interface IBGEArgs {
    tipo: "estados" | "municipios" | "municipios_por_uf" | "regioes";
    uf?: string;
    id?: number;
}

async function executeIBGE(args: IBGEArgs): Promise<LookupResult> {
    let url: string;
    switch (args.tipo) {
        case "estados": url = `${IBGE_BASE}/estados?orderBy=nome`; break;
        case "municipios": url = `${IBGE_BASE}/municipios?orderBy=nome`; break;
        case "municipios_por_uf":
            if (!args.uf) return { ok: false, error: "UF is required for municipios_por_uf" };
            url = `${IBGE_BASE}/estados/${args.uf}/municipios?orderBy=nome`; break;
        case "regioes": url = `${IBGE_BASE}/regioes`; break;
        default: return { ok: false, error: `Unknown tipo: ${args.tipo}` };
    }
    const result = await httpJson(url);
    if (!result.ok) return { ok: false, error: result.error || "IBGE API error" };
    return { ok: true, data: result.data };
}

registerTool({
    name: "ibge_localidades",
    description: `Query Brazilian geographic data from IBGE (Instituto Brasileiro de Geografia e Estatística).

Available queries:
- estados: List all 27 Brazilian states
- municipios: List all ~5,570 municipalities
- municipios_por_uf: List municipalities by state (requires UF code)
- regioes: List the 5 macro-regions

No API key required.`,
    inputSchema: {
        type: "object",
        properties: {
            tipo: { type: "string", enum: ["estados", "municipios", "municipios_por_uf", "regioes"], description: "Query type" },
            uf: { type: "string", description: "State code (required for municipios_por_uf, e.g. 'SP')" },
            id: { type: "number", description: "Specific entity ID (optional)" },
        },
        required: ["tipo"],
    },
    execute: async (args) => executeIBGE(args as IBGEArgs),
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

async function executeTransparencia(args: TransparenciaArgs): Promise<LookupResult> {
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
    const result = await httpJson(url, { "chave-api-dados": apiKey });
    if (!result.ok) return { ok: false, error: `Portal da Transparência API error: ${result.error}` };
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
            pagina: { type: "number", description: "Page number (default: 1)", default: 1 },
        },
        required: ["cnpj", "tipo"],
    },
    execute: async (args) => executeTransparencia(args as TransparenciaArgs),
});

// ─── CEIS / CNEP / CEPIM ────────────────────────────────────────────────────

const CEIS_API_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/ceis";
const CNEP_API_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/cnep";
const CEPIM_API_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/cepim";

type SanctionType = "ceis" | "cnep" | "cepim" | "all";

interface CeisCnepArgs { query: string; tipo?: SanctionType; pagina?: number; }

async function executeCeisCnep(args: CeisCnepArgs): Promise<LookupResult> {
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
            },
        };
    }
    const headers = { "chave-api-dados": apiKey };
    const tipo = args.tipo || "all";
    const pagina = args.pagina || 1;
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

    return {
        ok: true, data: {
            query: args.query, sanctions: results, databases_checked: Object.keys(results),
            errors: errors.length > 0 ? errors : undefined,
            legend: {
                ceis: "Cadastro de Empresas Inidôneas e Suspensas — barred from public contracts",
                cnep: "Cadastro Nacional de Empresas Punidas — punished under Anti-Corruption Law (Lei 12.846)",
                cepim: "Cadastro de Entidades Sem Fins Lucrativos Impedidas — NGOs barred from federal agreements",
            },
        },
    };
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
            pagina: { type: "number", description: "Page number (default: 1)", default: 1 },
        },
        required: ["query"],
    },
    execute: async (args) => executeCeisCnep(args as CeisCnepArgs),
});

// ─── PNCP ───────────────────────────────────────────────────────────────────

const PNCP_API = "https://pncp.gov.br/api/consulta/v1";

interface PncpArgs { query: string; cnpj_orgao?: string; data_inicial?: string; data_final?: string; pagina?: number; }

async function executePncp(args: PncpArgs): Promise<LookupResult> {
    const { query, cnpj_orgao, data_inicial, data_final, pagina = 1 } = args;
    const params = new URLSearchParams({ q: query, pagina: String(pagina), tamanhoPagina: "10" });
    if (cnpj_orgao) params.set("cnpjOrgao", cnpj_orgao);
    if (data_inicial) params.set("dataInicial", data_inicial);
    if (data_final) params.set("dataFinal", data_final);
    try {
        const result = await httpJson(`${PNCP_API}/contratacoes/publicacao?${params.toString()}`);
        if (result.ok) return { ok: true, data: { query, results: result.data, source: "Portal Nacional de Contratações Públicas (PNCP)", legal_basis: "Lei 14.133/2021" } };
        return { ok: true, data: { query, note: "PNCP API may be temporarily unavailable.", search_url: `https://pncp.gov.br/app/editais?q=${encodeURIComponent(query)}` } };
    } catch {
        return { ok: true, data: { query, note: "PNCP API connection failed.", search_url: `https://pncp.gov.br/app/editais?q=${encodeURIComponent(query)}` } };
    }
}

registerTool({
    name: "pncp_licitacoes",
    description: `Search Brazilian public procurement contracts via PNCP (Portal Nacional de Contratações Públicas).
Based on Lei 14.133/2021. Covers federal, state, and municipal procurements. No API key required.
OSINT value: Identify government contract relationships and public spending by company.`,
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search term (company name, product, or CNPJ)" },
            cnpj_orgao: { type: "string", description: "CNPJ of the contracting body (optional)" },
            data_inicial: { type: "string", description: "Start date (DD/MM/YYYY, optional)" },
            data_final: { type: "string", description: "End date (DD/MM/YYYY, optional)" },
            pagina: { type: "number", description: "Page number (default: 1)", default: 1 },
        },
        required: ["query"],
    },
    execute: async (args) => executePncp(args as PncpArgs),
});

// ─── Querido Diário ─────────────────────────────────────────────────────────

const QUERIDO_DIARIO_API = "https://api.queridodiario.ok.org.br";

interface QueridoDiarioArgs { query: string; territory_id?: string; since?: string; until?: string; page?: number; size?: number; }

async function executeQueridoDiario(args: QueridoDiarioArgs): Promise<LookupResult> {
    const { query, territory_id, since, until, page = 0, size = 10 } = args;
    const params = new URLSearchParams({ querystring: query, offset: String(page * size), size: String(size) });
    if (territory_id) params.set("territory_ids", territory_id);
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    try {
        const result = await httpJson(`${QUERIDO_DIARIO_API}/gazettes?${params.toString()}`);
        if (result.ok) return { ok: true, data: { query, results: result.data, source: "Querido Diário — Open Knowledge Brasil", note: "Municipal official gazettes. Territory IDs follow IBGE codes." } };
        return { ok: false, error: result.error || "Querido Diário API request failed" };
    } catch (err) {
        return { ok: false, error: `Querido Diário error: ${err instanceof Error ? err.message : String(err)}` };
    }
}

registerTool({
    name: "querido_diario",
    description: `Search Brazilian municipal official gazettes (Diários Oficiais).
Powered by Open Knowledge Brasil. Covers 5,000+ municipalities. No API key required.
OSINT value: Find company mentions in government publications, contracts, sanctions, permits.`,
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search text (company name, CNPJ, person, keyword)" },
            territory_id: { type: "string", description: "IBGE territory code (e.g. '3550308' for São Paulo)" },
            since: { type: "string", description: "Start date (YYYY-MM-DD, optional)" },
            until: { type: "string", description: "End date (YYYY-MM-DD, optional)" },
            page: { type: "number", description: "Page number (0-indexed, default: 0)", default: 0 },
            size: { type: "number", description: "Results per page (default: 10, max: 100)", default: 10 },
        },
        required: ["query"],
    },
    execute: async (args) => executeQueridoDiario(args as QueridoDiarioArgs),
});

// Export execute functions needed by deep_profile orchestrator
export { executeTransparencia, executeIBGE };
export type { TransparenciaArgs, IBGEArgs };
