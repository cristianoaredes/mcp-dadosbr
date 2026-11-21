/**
 * Company tools — CPF, WHOIS, Consumidor, Deep Profile
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { Cache, LookupResult, ApiConfig } from "../types/index.js";
import {
    ConsumidorSchema,
    CpfValidateSchema,
    DeepProfileSchema,
    DomainWhoisSchema,
} from "../core/tool-schemas.js";
import { executeSearch } from "../core/search.js";

// ─── CPF Validate ───────────────────────────────────────────────────────────

interface CpfValidateArgs { cpf: string; }

function validateCpfChecksum(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    if (check !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    return check === parseInt(digits[10]);
}

function getCpfRegion(cpf: string): string {
    const digit = parseInt(cpf.replace(/\D/g, "")[8]);
    const regions: Record<number, string> = {
        0: "RS", 1: "DF/GO/MS/MT/TO", 2: "AC/AM/AP/PA/RO/RR", 3: "CE/MA/PI",
        4: "AL/PB/PE/RN", 5: "BA/SE", 6: "MG", 7: "ES/RJ", 8: "SP", 9: "PR/SC",
    };
    return regions[digit] || "Unknown";
}

async function executeCpfValidate(args: CpfValidateArgs): Promise<LookupResult> {
    const { cpf } = args;
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return { ok: false, error: "CPF must have exactly 11 digits" };
    const valid = validateCpfChecksum(digits);
    const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    return {
        ok: true, data: {
            cpf: formatted, valid, region: valid ? getCpfRegion(digits) : undefined,
            note: valid ? "CPF checksum is valid. This does NOT confirm the CPF is registered." : "Invalid CPF — checksum failed.",
        },
    };
}

registerTool({
    name: "cpf_validate",
    description: `Validate a Brazilian CPF number using the mod-11 checksum algorithm.
Returns validation status, formatted CPF, and fiscal region of origin.
No API key required. Local computation only.`,
    inputSchema: {
        type: "object",
        properties: { cpf: { type: "string", description: "CPF number (with or without formatting)" } },
        required: ["cpf"],
    },
    zodSchema: CpfValidateSchema,
    execute: async (args) => executeCpfValidate(args as CpfValidateArgs),
});

// ─── Domain WHOIS / RDAP ────────────────────────────────────────────────────

interface WhoisArgs { domain: string; }

async function executeWhois(args: WhoisArgs, cache?: Cache): Promise<LookupResult> {
    const { domain } = args;
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const cacheKey = `whois:${cleanDomain.toLowerCase()}`;
    if (cache) {
        const cached = await cache.get(cacheKey);
        if (cached) return { ok: true, data: cached };
    }

    const rdapUrl = `https://rdap.registro.br/domain/${encodeURIComponent(cleanDomain)}`;
    try {
        const result = await httpJson(rdapUrl);
        if (result.ok) {
            const payload = { domain: cleanDomain, rdap: result.data, source: "RDAP — Registro.br" };
            if (cache) await cache.set(cacheKey, payload);
            return { ok: true, data: payload };
        }
        const ianaUrl = `https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`;
        const ianaResult = await httpJson(ianaUrl);
        if (ianaResult.ok) {
            const payload = { domain: cleanDomain, rdap: ianaResult.data, source: "RDAP — IANA Bootstrap" };
            if (cache) await cache.set(cacheKey, payload);
            return { ok: true, data: payload };
        }
        return { ok: false, error: `Domain not found in RDAP: ${cleanDomain}` };
    } catch (err) {
        return { ok: false, error: `WHOIS/RDAP error: ${err instanceof Error ? err.message : String(err)}` };
    }
}

registerTool({
    name: "domain_whois",
    description: `Look up domain registration data via RDAP. Supports .br domains (Registro.br) and international domains.
No API key required.
OSINT value: Verify company digital presence, registration dates, nameservers.`,
    inputSchema: {
        type: "object",
        properties: { domain: { type: "string", description: "Domain name (e.g. 'nubank.com.br')" } },
        required: ["domain"],
    },
    zodSchema: DomainWhoisSchema,
    execute: async (args, _apiConfig, cache) => executeWhois(args as WhoisArgs, cache),
});

// ─── Consumidor.gov.br ──────────────────────────────────────────────────────

interface ConsumidorArgs { empresa: string; }

async function executeConsumidor(args: ConsumidorArgs): Promise<LookupResult> {
    const { empresa } = args;
    return {
        ok: true,
        data: {
            empresa,
            source: "Consumidor.gov.br",
            note: "Consumidor.gov.br enforces interactive anti-bot protection without a public JSON lookup API. Use the official portal or open datasets below.",
            search_url: "https://www.consumidor.gov.br/",
            open_data: "https://dados.gov.br/dados/conjuntos-dados/reclamacoes-do-consumidor-gov-br",
            indicators: {
                description: "Key metrics: complaint volume, resolution rate, response time, satisfaction score",
                note: `Search for "${empresa}" on Consumidor.gov.br.`,
            },
            complementary_sources: [
                "https://www.reclameaqui.com.br/",
                "https://www.procon.sp.gov.br/",
            ],
        },
    };
}

registerTool({
    name: "consumidor_reclamacoes",
    description: `Search consumer complaints for a Brazilian company via Consumidor.gov.br (SENACON).
No API key required. Returns complaint volumes, resolution rates, satisfaction scores.
OSINT value: Assess company reputation and customer service quality.`,
    inputSchema: {
        type: "object",
        properties: { empresa: { type: "string", description: "Company name to search" } },
        required: ["empresa"],
    },
    zodSchema: ConsumidorSchema,
    execute: async (args) => executeConsumidor(args as ConsumidorArgs),
});

// ─── Deep Profile Orchestrator ──────────────────────────────────────────────

interface DeepProfileArgs {
    cnpj: string;
    include_news?: boolean;
    include_legal?: boolean;
    include_government?: boolean;
    domain?: string;
}

// Import shared lookup service from core and sibling tool executors
import { lookup } from "../core/lookup.js";
import type { ToolExecutionContext } from "../core/registry.js";
import { executeTransparencia } from "./government.js";
import { executeDatajud, executeListaSuja } from "./legal.js";
import { executeTcuCertidoes } from "./tcu.js";

async function executeDeepProfile(
    args: DeepProfileArgs,
    apiConfig: ApiConfig,
    cache?: Cache,
    context?: ToolExecutionContext,
): Promise<LookupResult> {
    const { cnpj, include_news = true, include_legal = true, include_government = true, domain } = args;
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const results: Record<string, unknown> = {};
    const errors: string[] = [];
    const tasks: Promise<void>[] = [];

    // Reuse shared lookup() so CNPJ fetch participates in cache + in-flight deduplication
    tasks.push(
        lookup("cnpj", cleanCnpj, apiConfig, cache)
            .then(r => { results.cnpj_data = r.ok ? r.data : null; if (!r.ok) errors.push(`cnpj: ${r.error}`); })
    );
    if (include_government) {
        tasks.push(executeTransparencia({ cnpj: cleanCnpj, tipo: "contratos" }, cache).then(r => { results.government_contracts = r.ok ? r.data : null; }));
        tasks.push(executeTcuCertidoes({ cnpj: cleanCnpj }, cache).then(r => { results.tcu_certidoes = r.ok ? r.data : null; }));
    }
    if (include_legal) {
        tasks.push(executeDatajud({ query: cleanCnpj }, cache).then(r => { results.court_records = r.ok ? r.data : null; }));
    }
    if (domain) {
        tasks.push(executeWhois({ domain }, cache).then(r => { results.domain_whois = r.ok ? r.data : null; }));
    }
    tasks.push(executeListaSuja({ query: cleanCnpj }, cache).then(r => { results.lista_suja = r.ok ? r.data : null; }));
    if (include_news) {
        tasks.push(executeSearch(cleanCnpj, 5, cache, context?.requestId).then(r => { results.news_results = r.ok ? r.data : null; }));
    }
    await Promise.allSettled(tasks);

    return {
        ok: true, data: {
            cnpj: cleanCnpj, profile: results,
            errors_encountered: errors.length > 0 ? errors : undefined,
            sources_queried: Object.keys(results).filter(k => results[k] !== null),
            sources_unavailable: Object.keys(results).filter(k => results[k] === null),
        },
    };
}

registerTool({
    name: "company_deep_profile",
    description: `Generate a comprehensive OSINT profile for a Brazilian company by orchestrating multiple data sources.
Combines: CNPJ lookup, government transparency records, court records, domain WHOIS, slave labor blacklist, and web search.
This is the most powerful tool for company due diligence.`,
    inputSchema: {
        type: "object",
        properties: {
            cnpj: { type: "string", description: "CNPJ of the company to profile" },
            include_news: { type: "boolean", description: "Include web search results (default: true)", default: true },
            include_legal: { type: "boolean", description: "Include court records (default: true)", default: true },
            include_government: { type: "boolean", description: "Include government contracts (default: true)", default: true },
            domain: { type: "string", description: "Company domain for WHOIS (optional)" },
        },
        required: ["cnpj"],
    },
    zodSchema: DeepProfileSchema,
    execute: async (args, apiConfig, cache, context) =>
        executeDeepProfile(args as DeepProfileArgs, apiConfig, cache, context),
});

export { executeWhois };
export type { WhoisArgs, DeepProfileArgs };
