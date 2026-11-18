import { afterEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";
import { pncpCnpj, pncpDate, pncpNoticeUrl } from "../../lib/shared/pncp.js";

const mime = "text/html;profile=mcp-app";
const source = "Portal Nacional de Contratações Públicas (PNCP)";
const endpoint = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao";
const results = { data: [{ anoCompra: 2026, sequencialCompra: 27, orgaoEntidade: { cnpj: "37115375000107" } }],
  totalRegistros: 1, totalPaginas: 1, numeroPagina: 1, paginasRestantes: 0, empty: false };
const filters = {
  query: "", cnpj_orgao: "37.115.375/0001-07", data_inicial: "16/11/2026",
  data_final: "20261117", modalidade_id: 6, pagina: 1,
};

async function call(args: Record<string, unknown>, capable = false) {
  const server = createMCPServer({ apiConfig: resolveApiConfig() });
  const client = new Client({ name: "pncp-contract", version: "1.0.0" }, {
    capabilities: capable ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: [mime] } } } : {},
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverSide);
    await client.connect(clientSide);
    return await client.callTool({ name: "pncp_licitacoes", arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

afterEach(() => vi.unstubAllGlobals());

it("uses only documented filters with the official publication endpoint", async () => {
  const upstream = vi.fn(async (_url: string) => Response.json(results));
  vi.stubGlobal("fetch", upstream);
  const response = await call(filters, true);
  const url = new URL(upstream.mock.calls[0][0]);
  expect(url.origin + url.pathname).toBe(endpoint);
  expect(Object.fromEntries(url.searchParams)).toEqual({
    dataInicial: "20261116", dataFinal: "20261117", codigoModalidadeContratacao: "6",
    pagina: "1", tamanhoPagina: "10", cnpj: "37115375000107",
  });
  expect(response.structuredContent).toEqual({
    query: "", results, source, legal_basis: "Lei 14.133/2021",
    provenance: { url: url.href, fetchedAt: expect.any(String) },
  });
});

it("returns the same textual JSON for filtered requests regardless of app support", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(results)));
  const plain = await call(filters);
  const enhanced = await call(filters, true);
  expect(plain).toEqual({
    content: [{ type: "text", text: JSON.stringify({ query: "", results, source, legal_basis: "Lei 14.133/2021" }, null, 2) }],
  });
  expect(enhanced.content).toEqual(plain.content);
});

it("preserves the legacy keyword request and its portal fallback", async () => {
  const upstream = vi.fn(async (_url: string) => new Response(null, { status: 400 }));
  vi.stubGlobal("fetch", upstream);
  const legacy = await call({ query: "informática e TI" }, true);
  expect(upstream.mock.calls[0][0]).toBe(endpoint + "?q=inform%C3%A1tica+e+TI&pagina=1&tamanhoPagina=10");
  expect(legacy).toEqual({
    content: [{
      type: "text",
      text: JSON.stringify({
        query: "informática e TI", note: "PNCP API may be temporarily unavailable.",
        search_url: "https://pncp.gov.br/app/editais?q=inform%C3%A1tica%20e%20TI",
      }, null, 2),
    }],
  });
});

it("preserves the prior success envelope when the legacy endpoint returns results", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(results)));
  const legacy = await call({ query: "informática" });
  expect(legacy).toEqual({
    content: [{ type: "text", text: JSON.stringify({ query: "informática", results, source, legal_basis: "Lei 14.133/2021" }, null, 2) }],
  });
});

it("turns HTTP 204 into an empty page and still reports HTTP 422 as a tool error", async () => {
  const upstream = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", upstream);
  const empty = await call({ ...filters, pagina: 2 }, true);
  expect(empty.isError).toBeUndefined();
  expect(empty.structuredContent).toMatchObject({
    results: { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 2, empty: true },
  });
  upstream.mockResolvedValueOnce(new Response(null, { status: 422 }));
  const invalid = await call(filters, true);
  expect(invalid.isError).toBe(true);
  expect(invalid.structuredContent).toBeUndefined();
  expect(invalid.content).toEqual([{ type: "text", text: expect.stringContaining("HTTP 422") }]);
});

it("rejects reversed or invalid dates, nonpositive pages and combined keyword filtering locally", async () => {
  const upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  for (const invalid of [
    { data_inicial: "2026-11-18" }, { data_final: "31/02/2026" },
    { pagina: 0 }, { modalidade_id: 3.2 }, { query: "computadores" }, { cnpj_orgao: "example.com" },
  ]) {
    expect((await call({ ...filters, ...invalid }, true)).isError).toBe(true);
  }
  expect(upstream).not.toHaveBeenCalled();
});

it("normalizes alphanumeric CNPJ and composes only canonical PNCP links", () => {
  expect(pncpCnpj("12.abC.345/01dE-35")).toBe("12ABC34501DE35");
  expect(pncpDate("20240229")).toBe("2024-02-29");
  expect(pncpDate("2025-02-29")).toBeUndefined();
  expect(pncpNoticeUrl("37.115.375/0001-07", 2026, 27)).toBe("https://pncp.gov.br/app/editais/37115375000107/2026/27");
  expect(pncpNoticeUrl("https://example.net", 2026, 27)).toBeUndefined();
  expect(pncpNoticeUrl("37115375000107", 2026, "27?redirect=//example.net")).toBeUndefined();
});
