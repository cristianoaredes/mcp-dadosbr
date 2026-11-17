import { afterEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";

const mimeType = "text/html;profile=mcp-app";
const gazettes = {
  total_gazettes: 1,
  gazettes: [{ territory_id: "2304400", territory_name: "Fortaleza", state_code: "CE", date: "2026-10-03",
    edition: "123", excerpts: ["Termo encontrado"], url: "https://data.queridodiario.org.br/2304400/2026/edicao.pdf" }],
};
const params = { query: "licitação", territory_id: "2304400", since: "2026-10-01", until: "2026-10-05", page: 2, size: 10 };

async function callGazettes(capable: boolean, args: Record<string, unknown> = params) {
  const server = createMCPServer({ apiConfig: resolveApiConfig() });
  const client = new Client({ name: "querido-diario-contract", version: "1.0.0" }, {
    capabilities: capable ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: [mimeType] } } } : {},
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverSide);
    await client.connect(clientSide);
    return await client.callTool({ name: "querido_diario", arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

afterEach(() => vi.unstubAllGlobals());

it("filters the documented API by the selected IBGE code, publication dates and page", async () => {
  const upstream = vi.fn(async (_url: string) => Response.json(gazettes));
  vi.stubGlobal("fetch", upstream);
  const result = await callGazettes(true);
  const url = new URL(upstream.mock.calls[0][0]);
  expect(url.origin + url.pathname).toBe("https://api.queridodiario.org.br/gazettes");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    territory_ids: "2304400", querystring: "licitação", published_since: "2026-10-01",
    published_until: "2026-10-05", offset: "20", size: "10",
  });
  expect(result.structuredContent).toMatchObject({
    query: "licitação", results: gazettes, provenance: { url: url.href, fetchedAt: expect.any(String) },
  });
});

it("keeps exactly the textual envelope for a client without MCP Apps", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(gazettes)));
  const legacy = await callGazettes(false);
  const enhanced = await callGazettes(true);
  const envelope = { query: params.query, results: gazettes, source: "Querido Diário — Open Knowledge Brasil",
    note: "Municipal official gazettes. Territory IDs follow IBGE codes." };
  expect(legacy).toEqual({ content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }] });
  expect(enhanced.content).toEqual(legacy.content);
});

it("requests recent editions for the chosen municipality before a term is entered", async () => {
  const upstream = vi.fn(async (_url: string) => Response.json({ total_gazettes: 0, gazettes: [] }));
  vi.stubGlobal("fetch", upstream);
  const result = await callGazettes(true, { query: "", territory_id: "2304400" });
  const url = new URL(upstream.mock.calls[0][0]);
  expect(url.searchParams.get("sort_by")).toBe("descending_date");
  expect(url.searchParams.get("territory_ids")).toBe("2304400");
  expect(result.isError).toBeUndefined();
  expect(result.structuredContent).toMatchObject({ results: { total_gazettes: 0, gazettes: [] } });
});

it("reports a provider error distinctly from an empty result for both clients", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
  for (const capable of [true, false]) {
    const result = await callGazettes(capable);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(result.content).toEqual([{ type: "text", text: expect.stringContaining("not found") }]);
  }
});
