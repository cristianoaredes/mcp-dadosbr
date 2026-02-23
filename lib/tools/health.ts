/**
 * Health tools — CNES (DataSUS)
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { LookupResult } from "../types/index.js";

const CNES_API = "https://apidadosabertos.saude.gov.br/cnes";

interface CnesArgs { tipo: "estabelecimento" | "profissional"; codigo_cnes?: string; nome?: string; uf?: string; municipio?: string; }

async function executeCnes(args: CnesArgs): Promise<LookupResult> {
    const { tipo, codigo_cnes, nome, uf, municipio } = args;
    const params = new URLSearchParams();
    if (codigo_cnes) params.set("codigo_cnes", codigo_cnes);
    if (nome) params.set("nome_fantasia", nome);
    if (uf) params.set("codigo_uf", uf);
    if (municipio) params.set("codigo_municipio", municipio);
    params.set("limit", "10"); params.set("offset", "0");
    const endpoint = tipo === "profissional" ? `${CNES_API}/profissionais` : `${CNES_API}/estabelecimentos`;
    try {
        const result = await httpJson(`${endpoint}?${params.toString()}`);
        if (result.ok) return { ok: true, data: { ...args, results: result.data, source: "CNES — DataSUS" } };
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
    execute: async (args) => executeCnes(args as CnesArgs),
});
