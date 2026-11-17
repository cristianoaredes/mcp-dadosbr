import { afterEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";
import { bacenWindow, brazilToday } from "../../lib/shared/bacen.js";
import { readObservations } from "../../apps/bacen/series.js";

const mime = "text/html;profile=mcp-app";
const results = [{ data: "16/11/2026", valor: "4.275" }];

async function call(args: Record<string, unknown>, capable = false) {
  const server = createMCPServer({ apiConfig: resolveApiConfig() });
  const client = new Client({ name: "bacen-contract", version: "1.0.0" }, {
    capabilities: capable ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: [mime] } } } : {},
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverSide);
    await client.connect(clientSide);
    return await client.callTool({ name: "bacen_taxas", arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("preserves exactly the original default JSON and upstream URL", async () => {
  const upstream = vi.fn(async (_url: string) => Response.json(results));
  vi.stubGlobal("fetch", upstream);
  const args = { indicador: "selic" };
  const legacy = await call(args);
  const enhanced = await call(args, true);
  const endpoint = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/10?formato=json";
  const payload = { indicador: "selic", serie_id: 432, ultimos: 10, results, source: "Banco Central do Brasil — SGS" };
  expect(upstream.mock.calls[0][0]).toBe(endpoint);
  expect(legacy).toEqual({ content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] });
  expect(enhanced.content).toEqual(legacy.content);
  expect(enhanced.structuredContent).toEqual({ ...payload, provenance: { url: endpoint, fetchedAt: expect.any(String) } });
});

it.each([["selic", 432], ["ipca", 433], ["dolar", 1], ["euro", 21619], ["cdi", 12]])(
  "queries %s with a bounded date range in series %i",
  async (indicator, id) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T01:15:00Z"));
    const upstream = vi.fn(async (_url: string) => Response.json(results));
    vi.stubGlobal("fetch", upstream);
    const response = await call({ indicador: indicator, periodo_dias: 30, ultimos: 3 }, true);
    const url = new URL(upstream.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.bcb.gov.br/dados/serie/bcdata.sgs." + id + "/dados");
    expect(Object.fromEntries(url.searchParams)).toEqual({ formato: "json", dataInicial: "19/10/2026", dataFinal: "17/11/2026" });
    expect(response.structuredContent).toMatchObject({
      indicador: indicator, serie_id: id, periodo_dias: 30, data_inicial: "19/10/2026", data_final: "17/11/2026", results,
    });
  },
);

it("preserves protocol errors and rejects an unsupported period before calling SGS", async () => {
  const upstream = vi.fn(async (_url: string) => new Response(null, { status: 404 }));
  vi.stubGlobal("fetch", upstream);
  expect((await call({ indicador: "cdi", periodo_dias: 300 }, true)).isError).toBe(true);
  expect(upstream).not.toHaveBeenCalled();
  const failed = await call({ indicador: "euro" }, true);
  expect(failed.isError).toBe(true);
  expect(failed.structuredContent).toBeUndefined();
  expect(failed.content).toEqual([{ type: "text", text: expect.stringContaining("not found") }]);
});

it("uses calendar days in São Paulo across UTC and year boundaries", () => {
  const instant = new Date("2026-01-01T02:15:00Z");
  expect(brazilToday(instant)).toBe("2025-12-31");
  expect(bacenWindow(90, instant)).toEqual({ start: "03/10/2025", end: "31/12/2025" });
});

it("sorts observations, preserves negative and zero values, and excludes future references", () => {
  const rows = readObservations([
    { data: "01/12/2026", valor: "14.00" },
    { data: "17/11/2026", valor: "0" },
    { data: "16/11/2026", valor: "-0.32" },
  ], "2026-11-17");
  expect(rows.map(({ date, value }) => [date, value])).toEqual([["2026-11-16", -0.32], ["2026-11-17", 0]]);
  expect(() => readObservations([{ data: "31/02/2026", valor: "2.0" }], "2026-11-17")).toThrow();
});
