/**
 * Financial tools — Banco Central, FIPE
 */

import { registerTool } from "../core/registry.js";
import { httpJson } from "../core/http-client.js";
import { BacenSchema, FipeSchema } from "../core/tool-schemas.js";
import { LookupResult } from "../types/index.js";
import { BACEN_PERIODS, BACEN_SERIES, bacenWindow, isBacenIndicator, isBacenPeriod } from "../shared/bacen.js";
import type { BacenIndicator, BacenPeriod } from "../shared/bacen.js";

// ─── Banco Central ──────────────────────────────────────────────────────────

const BACEN_API = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";
interface BacenArgs { indicador: BacenIndicator; ultimos?: number; periodo_dias?: BacenPeriod; }

async function executeBacen(args: BacenArgs): Promise<LookupResult> {
    const { indicador, ultimos = 10, periodo_dias } = args;
    if (!isBacenIndicator(indicador)) return { ok: false, error: `Unknown indicator: ${indicador}. Valid: selic, ipca, dolar, euro, cdi` };
    if (periodo_dias !== undefined && !isBacenPeriod(periodo_dias)) {
        return { ok: false, error: "periodo_dias must be 30, 90 or 365" };
    }
    const serieId = BACEN_SERIES[indicador].id;
    const window = periodo_dias === undefined ? undefined : bacenWindow(periodo_dias);
    const query = new URLSearchParams({ formato: "json" });
    if (window) {
        query.set("dataInicial", window.start);
        query.set("dataFinal", window.end);
    }
    const path = window ? "dados" : `dados/ultimos/${encodeURIComponent(ultimos)}`;
    const url = `${BACEN_API}.${serieId}/${path}?${query}`;
    try {
        const result = await httpJson(url);
        if (result.ok) return {
            ok: true,
            data: {
                indicador, serie_id: serieId,
                ...(window ? { periodo_dias, data_inicial: window.start, data_final: window.end } : { ultimos }),
                results: result.data,
                source: "Banco Central do Brasil — SGS",
            },
            source: { url, fetchedAt: new Date().toISOString() },
        };
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
            indicador: { type: "string", enum: Object.keys(BACEN_SERIES), description: "Financial indicator" },
            ultimos: { type: "number", description: "Number of recent data points (default: 10)", minimum: 1, maximum: 1000, default: 10 },
            periodo_dias: { type: "integer", enum: [...BACEN_PERIODS], description: "Calendar-day window through today in São Paulo. Overrides ultimos when supplied." },
        },
        required: ["indicador"],
    },
    zodSchema: BacenSchema,
    execute: async (args) => executeBacen(args as BacenArgs),
});

// ─── FIPE ───────────────────────────────────────────────────────────────────

const FIPE_API = "https://brasilapi.com.br/api/fipe";
const ALLOWED_FIPE_TYPES = new Set<string>(["carros", "motos", "caminhoes"]);
const FIPE_CODE_REGEX = /^[0-9]+(?:-[0-9]+)?$/;

interface FipeArgs { codigo_fipe?: string; tipo?: "carros" | "motos" | "caminhoes"; }

async function executeFipe(args: FipeArgs): Promise<LookupResult> {
    const { codigo_fipe, tipo } = args ?? {};
    if (codigo_fipe !== undefined) {
        if (typeof codigo_fipe !== "string") {
            return { ok: false, error: "Invalid codigo_fipe format (expected e.g. '001004-9')." };
        }
        const trimmed = codigo_fipe.trim();
        if (!trimmed || !FIPE_CODE_REGEX.test(trimmed)) {
            return { ok: false, error: "Invalid codigo_fipe format (expected e.g. '001004-9')." };
        }
        try {
            const result = await httpJson(`${FIPE_API}/preco/v1/${encodeURIComponent(trimmed)}`);
            if (result.ok) return { ok: true, data: { codigo_fipe: trimmed, results: result.data, source: "Tabela FIPE via BrasilAPI" } };
            return { ok: false, error: result.error || "FIPE lookup failed" };
        } catch (err) { return { ok: false, error: `FIPE error: ${err instanceof Error ? err.message : String(err)}` }; }
    }
    if (tipo !== undefined) {
        if (typeof tipo !== "string" || !ALLOWED_FIPE_TYPES.has(tipo)) {
            return { ok: false, error: "Invalid FIPE vehicle type. Valid: carros, motos, caminhoes." };
        }
        try {
            const result = await httpJson(`${FIPE_API}/marcas/v1/${encodeURIComponent(tipo)}`);
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
    zodSchema: FipeSchema,
    execute: async (args) => executeFipe(args as FipeArgs),
});
