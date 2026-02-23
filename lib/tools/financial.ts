/**
 * Financial tools — Banco Central, FIPE
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { LookupResult } from "../types/index.js";

// ─── Banco Central ──────────────────────────────────────────────────────────

const BACEN_API = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";
const BACEN_SERIES: Record<string, number> = { selic: 432, ipca: 433, dolar: 1, euro: 21619, cdi: 12 };

interface BacenArgs { indicador: "selic" | "ipca" | "dolar" | "euro" | "cdi"; ultimos?: number; }

async function executeBacen(args: BacenArgs): Promise<LookupResult> {
    const { indicador, ultimos = 10 } = args;
    const serieId = BACEN_SERIES[indicador];
    if (!serieId) return { ok: false, error: `Unknown indicator: ${indicador}. Valid: selic, ipca, dolar, euro, cdi` };
    try {
        const result = await httpJson(`${BACEN_API}.${serieId}/dados/ultimos/${ultimos}?formato=json`);
        if (result.ok) return { ok: true, data: { indicador, serie_id: serieId, ultimos, results: result.data, source: "Banco Central do Brasil — SGS" } };
        return { ok: false, error: `Banco Central API error: ${result.error}` };
    } catch (err) {
        return { ok: false, error: `Banco Central error: ${err instanceof Error ? err.message : String(err)}` };
    }
}

registerTool({
    name: "bacen_taxas",
    description: `Fetch Brazilian Central Bank (BCB) financial indicators and exchange rates.
Available: selic (interest rate), ipca (inflation), dolar (USD/BRL), euro (EUR/BRL), cdi.
No API key required. Returns time series data.`,
    inputSchema: {
        type: "object",
        properties: {
            indicador: { type: "string", enum: ["selic", "ipca", "dolar", "euro", "cdi"], description: "Financial indicator" },
            ultimos: { type: "number", description: "Number of recent data points (default: 10)", default: 10 },
        },
        required: ["indicador"],
    },
    execute: async (args) => executeBacen(args as BacenArgs),
});

// ─── FIPE ───────────────────────────────────────────────────────────────────

const FIPE_API = "https://brasilapi.com.br/api/fipe";

interface FipeArgs { codigo_fipe?: string; tipo?: "carros" | "motos" | "caminhoes"; }

async function executeFipe(args: FipeArgs): Promise<LookupResult> {
    const { codigo_fipe, tipo } = args;
    if (codigo_fipe) {
        try {
            const result = await httpJson(`${FIPE_API}/preco/v1/${encodeURIComponent(codigo_fipe)}`);
            if (result.ok) return { ok: true, data: { codigo_fipe, results: result.data, source: "Tabela FIPE via BrasilAPI" } };
            return { ok: false, error: result.error || "FIPE lookup failed" };
        } catch (err) { return { ok: false, error: `FIPE error: ${err instanceof Error ? err.message : String(err)}` }; }
    }
    if (tipo) {
        try {
            const result = await httpJson(`${FIPE_API}/marcas/v1/${tipo}`);
            if (result.ok) return { ok: true, data: { tipo, brands: result.data, source: "Tabela FIPE via BrasilAPI", note: "Use the FIPE code to get prices." } };
            return { ok: false, error: result.error || "FIPE brands lookup failed" };
        } catch (err) { return { ok: false, error: `FIPE error: ${err instanceof Error ? err.message : String(err)}` }; }
    }
    return { ok: false, error: "Provide either codigo_fipe or tipo (carros/motos/caminhoes)." };
}

registerTool({
    name: "fipe_veiculos",
    description: `Look up Brazilian vehicle prices from the FIPE table.
Search by FIPE code for pricing, or list brands by vehicle type.
Via BrasilAPI. No API key required.`,
    inputSchema: {
        type: "object",
        properties: {
            codigo_fipe: { type: "string", description: "FIPE code (e.g. '001004-9')" },
            tipo: { type: "string", enum: ["carros", "motos", "caminhoes"], description: "Vehicle type to list brands" },
        },
    },
    execute: async (args) => executeFipe(args as FipeArgs),
});
