/**
 * Health tools — CNES (DataSUS)
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { CnesSchema } from "../core/tool-schemas.js";
import { Cache, LookupResult } from "../types/index.js";

const CNES_API = "https://apidadosabertos.saude.gov.br/cnes";

const UF_TO_IBGE_CODE: Record<string, string> = {
    AC: "12",
    AL: "27",
    AP: "16",
    AM: "13",
    BA: "29",
    CE: "23",
    DF: "53",
    ES: "32",
    GO: "52",
    MA: "21",
    MT: "51",
    MS: "50",
    MG: "31",
    PA: "15",
    PB: "25",
    PR: "41",
    PE: "26",
    PI: "22",
    RJ: "33",
    RN: "24",
    RS: "43",
    RO: "11",
    RR: "14",
    SC: "42",
    SP: "35",
    SE: "28",
    TO: "17",
};

function normalizeCnesUf(uf: string): string {
    const trimmed = uf.trim();
    if (/^[A-Za-z]{2}$/.test(trimmed)) {
        return UF_TO_IBGE_CODE[trimmed.toUpperCase()] ?? uf;
    }
    return uf;
}

interface CnesArgs { tipo: "estabelecimento" | "profissional"; codigo_cnes?: string; nome?: string; uf?: string; municipio?: string; }

async function executeCnes(args: CnesArgs, cache?: Cache): Promise<LookupResult> {
    const { tipo, codigo_cnes, nome, uf, municipio } = args;
    const params = new URLSearchParams();
    if (codigo_cnes) params.set("codigo_cnes", codigo_cnes);
    if (nome) params.set("nome_fantasia", nome);
    if (uf) params.set("codigo_uf", normalizeCnesUf(uf));
    if (municipio) params.set("codigo_municipio", municipio);
    params.set("limit", "10"); params.set("offset", "0");
    const endpoint = tipo === "profissional" ? `${CNES_API}/profissionais` : `${CNES_API}/estabelecimentos`;
    const url = `${endpoint}?${params.toString()}`;
    const cacheKey = `cnes:${url}`;
    try {
        if (cache) {
            const cached = await cache.get(cacheKey);
            if (cached) return { ok: true, data: cached };
        }
        const result = await httpJson(url);
        if (result.ok) {
            const payload = { ...args, results: result.data, source: "CNES — DataSUS" };
            if (cache) await cache.set(cacheKey, payload);
            return { ok: true, data: payload };
        }
    } catch { /* fall through */ }
    return { ok: true, data: { ...args, source: "CNES (DataSUS)", search_url: "http://cnes.datasus.gov.br/", note: "CNES API unavailable. Use the DataSUS portal." } };
}

registerTool({
    name: "cnes_saude",
    description: `Search Brazil's National Healthcare Facility Registry (CNES — DataSUS).
Search facilities or professionals by name, CNES code, state, or municipality.
No API key required.`,
    inputSchema: {
        type: "object",
        properties: {
            tipo: { type: "string", enum: ["estabelecimento", "profissional"], description: "Search type" },
            codigo_cnes: { type: "string", description: "CNES code (optional)" },
            nome: { type: "string", description: "Name (optional)" },
            uf: { type: "string", description: "State IBGE code (e.g. '35' for SP)" },
            municipio: { type: "string", description: "Municipality IBGE code (optional)" },
        },
        required: ["tipo"],
    },
    zodSchema: CnesSchema,
    execute: async (args, _apiConfig, cache) => executeCnes(args as CnesArgs, cache),
});
