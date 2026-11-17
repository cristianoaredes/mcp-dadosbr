import { afterEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";

const mimeType = "text/html;profile=mcp-app";
const sourceUrl = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/CE/municipios?orderBy=nome";
const items = [{ id: 2304400, nome: "Fortaleza" }];

async function callIbge(mimeTypes?: string[]) {
  const server = createMCPServer({ apiConfig: resolveApiConfig() });
  const client = new Client({ name: "app-contract-test", version: "1.0.0" }, {
    capabilities: mimeTypes ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes } } } : {},
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverSide);
    await client.connect(clientSide);
    return await client.callTool({
      name: "ibge_localidades",
      arguments: { tipo: "municipios_por_uf", uf: "CE" },
    });
  } finally {
    await client.close();
    await server.close();
  }
}

afterEach(() => vi.unstubAllGlobals());

it("preserves the original text response for legacy clients", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(items)));
  const result = await callIbge();
  expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify(items, null, 2) }] });
});

it("adds official provenance and the same records for an MCP Apps client", async () => {
  const provider = vi.fn(async () => Response.json(items));
  vi.stubGlobal("fetch", provider);
  const started = Date.now();
  const result = await callIbge([mimeType]);
  expect(provider).toHaveBeenCalledWith(sourceUrl, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(result.content).toEqual([{ type: "text", text: JSON.stringify(items, null, 2) }]);
  expect(result.structuredContent).toEqual({
    items,
    source: { url: sourceUrl, fetchedAt: expect.any(String) },
  });
  const timestamp = Date.parse((result.structuredContent as { source: { fetchedAt: string } }).source.fetchedAt);
  expect(timestamp).toBeGreaterThanOrEqual(started);
  expect(timestamp).toBeLessThanOrEqual(Date.now());
});

it("keeps text-only output for clients offering another resource type", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(items)));
  expect((await callIbge(["image/png"])).structuredContent).toBeUndefined();
});

it("preserves the tool error and omits a successful payload when fetching fails", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
  const result = await callIbge([mimeType]);
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toBeUndefined();
  expect(result.content).toEqual([{
    type: "text",
    text: expect.stringContaining("not found"),
  }]);
});
