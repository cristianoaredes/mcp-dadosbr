import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ErrorCode as SdkErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { createMCPServer, type MCPServerOptions } from "../../lib/core/mcp-server.js";
import { TOOL_DEFINITIONS } from "../../lib/core/tools.js";
import { ErrorCode } from "../../lib/shared/errors.js";
import type { Cache } from "../../lib/types/index.js";

const readAppHtmlSpy = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: async (
      target: Parameters<typeof actual.readFile>[0],
      options?: Parameters<typeof actual.readFile>[1],
    ) => {
      const targetStr = String(target);
      if (targetStr.includes("/build/lib/apps/") && targetStr.endsWith(".html")) {
        readAppHtmlSpy(targetStr, options);
        const filename = targetStr.split("/").pop() ?? "app.html";
        return `<!doctype html><html><head><title>${filename}</title></head><body>stub</body></html>`;
      }
      return actual.readFile(target, options as never);
    },
  };
});

const APP_MIME_TYPE = "text/html;profile=mcp-app";
const EXPECTED_APPS = [
  {
    tool: "ibge_localidades",
    file: "ibge.html",
    uri: "ui://dadosbr/ibge-localidades.html",
    name: "Explorador de localidades do IBGE",
  },
  {
    tool: "querido_diario",
    file: "querido-diario.html",
    uri: "ui://dadosbr/querido-diario.html",
    name: "Querido Diário",
  },
  {
    tool: "bacen_taxas",
    file: "bacen.html",
    uri: "ui://dadosbr/banco-central.html",
    name: "Indicadores do Banco Central",
  },
  {
    tool: "pncp_licitacoes",
    file: "pncp.html",
    uri: "ui://dadosbr/editais-pncp.html",
    name: "Editais do PNCP",
  },
  {
    tool: "cnpj_lookup",
    file: "cnpj.html",
    uri: "ui://dadosbr/ficha-cnpj.html",
    name: "Ficha por CNPJ",
  },
] as const;

async function withMcpClient<T>(
  options: Partial<MCPServerOptions> & { withUiCapability?: boolean } = {},
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const { withUiCapability = false, ...serverOpts } = options;
  const server = createMCPServer({
    apiConfig: resolveApiConfig(),
    ...serverOpts,
  });
  const client = new Client(
    { name: "mcp-server-handlers-test", version: "1.0.0" },
    {
      capabilities: withUiCapability
        ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: [APP_MIME_TYPE] } } }
        : {},
    },
  );
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  await client.connect(clientSide);
  try {
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}

describe("TCK-0039 / FND-0024: createMCPServer handlers, MCP Apps & unexpected error catch", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    readAppHtmlSpy.mockReset();
    process.env = { ...originalEnv };
  });

  describe("ListTools, ListResources & ReadResource handlers", () => {
    it("lists all 23 tools and attaches _meta.ui.resourceUri exclusively to the 5 MCP App tools", async () => {
      await withMcpClient({}, async (client) => {
        const { tools } = await client.listTools();

        expect(tools).toHaveLength(23);
        expect(tools).toHaveLength(TOOL_DEFINITIONS.length);

        const toolsWithUi = tools.filter((t) => t._meta?.ui !== undefined);
        expect(toolsWithUi).toHaveLength(5);

        for (const app of EXPECTED_APPS) {
          const found = tools.find((t) => t.name === app.tool);
          expect(found).toBeDefined();
          expect(found?._meta).toEqual({ ui: { resourceUri: app.uri } });
        }

        const nonAppTool = tools.find((t) => t.name === "cpf_validate");
        expect(nonAppTool).toBeDefined();
        expect(nonAppTool?._meta).toBeUndefined();
      });
    });

    it("lists all 5 bundled MCP App resources with ui:// URIs and prefersBorder metadata", async () => {
      await withMcpClient({}, async (client) => {
        const { resources } = await client.listResources();

        expect(resources).toHaveLength(5);
        for (const app of EXPECTED_APPS) {
          expect(resources).toContainEqual(
            expect.objectContaining({
              uri: app.uri,
              name: app.name,
              mimeType: APP_MIME_TYPE,
              _meta: { ui: { prefersBorder: true } },
            }),
          );
        }
      });
    });

    it("reads bundled MCP App HTML content and _meta for valid URIs and rejects unknown URIs with InvalidParams", async () => {
      await withMcpClient({}, async (client) => {
        for (const app of EXPECTED_APPS) {
          const res = await client.readResource({ uri: app.uri });
          expect(res.contents).toEqual([
            {
              uri: app.uri,
              mimeType: APP_MIME_TYPE,
              text: `<!doctype html><html><head><title>${app.file}</title></head><body>stub</body></html>`,
              _meta: { ui: { prefersBorder: true } },
            },
          ]);
          expect(readAppHtmlSpy).toHaveBeenCalledWith(
            expect.stringContaining(`/build/lib/apps/${app.file}`),
            "utf8",
          );
        }

        await expect(
          client.readResource({ uri: "ui://dadosbr/nonexistent.html" }),
        ).rejects.toMatchObject({
          code: SdkErrorCode.InvalidParams,
          message: expect.stringContaining("Unknown resource URI"),
        });
      });
    });
  });

  describe("CallTool handler (MCP Apps structuredContent, rate limit, tool failure & unexpected catch)", () => {
    it("returns structuredContent for MCP App tools when io.modelcontextprotocol/ui capability is enabled", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL) => {
          const url = String(input);
          if (url.includes("opencnpj.org") || url.includes("minhareceita") || url.includes("brasilapi")) {
            return Response.json({
              cnpj: "00394460000141",
              razao_social: "ORGAO PUBLICO TESTE",
              situacao_cadastral: "Ativa",
              cnae_principal: "8411600",
            });
          }
          if (url.includes("servicodados.ibge.gov.br")) {
            return Response.json([
              { id: 2304400, nome: "Fortaleza" },
              { id: 2312908, nome: "Sobral" },
            ]);
          }
          if (url.includes("api.bcb.gov.br")) {
            return Response.json([{ data: "16/11/2026", valor: "11.25" }]);
          }
          if (url.includes("api.queridodiario.org.br")) {
            return Response.json({ total_gazettes: 0, gazettes: [] });
          }
          if (url.includes("pncp.gov.br")) {
            return Response.json({ data: [], totalRegistros: 0 });
          }
          return new Response(null, { status: 404 });
        }),
      );

      await withMcpClient({ withUiCapability: true, rateLimit: false }, async (client) => {
        const cnpjRes = await client.callTool({
          name: "cnpj_lookup",
          arguments: { cnpj: "00.394.460/0001-41" },
        });
        expect(cnpjRes.isError).toBeUndefined();
        expect(cnpjRes.structuredContent).toEqual({
          profile: expect.objectContaining({
            cnpj: "00394460000141",
            name: "ORGAO PUBLICO TESTE",
          }),
        });

        const ibgeArrayRes = await client.callTool({
          name: "ibge_localidades",
          arguments: { tipo: "municipios_por_uf", uf: "CE" },
        });
        expect(ibgeArrayRes.structuredContent).toEqual({
          items: [
            { id: 2304400, nome: "Fortaleza" },
            { id: 2312908, nome: "Sobral" },
          ],
          source: { url: expect.stringContaining("estados/CE/municipios"), fetchedAt: expect.any(String) },
        });

        const ibgePagedRes = await client.callTool({
          name: "ibge_localidades",
          arguments: { tipo: "municipios_por_uf", uf: "CE", page: 1, limit: 1 },
        });
        expect(ibgePagedRes.structuredContent).toEqual({
          items: [{ id: 2304400, nome: "Fortaleza" }],
          pagination: { page: 1, limit: 1, total: 2, total_pages: 2, has_more: true },
          source: { url: expect.stringContaining("estados/CE/municipios"), fetchedAt: expect.any(String) },
        });

        const bacenRes = await client.callTool({
          name: "bacen_taxas",
          arguments: { indicador: "selic" },
        });
        expect(bacenRes.structuredContent).toMatchObject({
          indicador: "selic",
          provenance: { url: expect.stringContaining("api.bcb.gov.br"), fetchedAt: expect.any(String) },
        });

        const qdRes = await client.callTool({
          name: "querido_diario",
          arguments: { query: "educacao" },
        });
        expect(qdRes.structuredContent).toMatchObject({
          query: "educacao",
          provenance: { url: expect.stringContaining("api.queridodiario.org.br"), fetchedAt: expect.any(String) },
        });

        const pncpRes = await client.callTool({
          name: "pncp_licitacoes",
          arguments: {
            query: "",
            data_inicial: "2026-11-16",
            data_final: "2026-11-17",
            modalidade_id: 6,
            pagina: 1,
          },
        });
        expect(pncpRes.structuredContent).toMatchObject({
          query: "",
          provenance: { url: expect.stringContaining("pncp.gov.br"), fetchedAt: expect.any(String) },
        });
      });
    });

    it("ignores non-positive or non-numeric MCP_TOOL_RATE_LIMIT_MAX and enforces rateLimit error response", async () => {
      const warnSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      for (const badEnv of ["0", "-5", "abc"]) {
        process.env.MCP_TOOL_RATE_LIMIT_MAX = badEnv;
        await withMcpClient({}, async (client) => {
          const ok = await client.callTool({
            name: "cpf_validate",
            arguments: { cpf: "00000000000" },
          });
          expect(ok.isError).toBeUndefined();
        });
      }

      delete process.env.MCP_TOOL_RATE_LIMIT_MAX;
      await withMcpClient(
        { rateLimit: { windowMs: 60_000, maxRequests: 1 } },
        async (client) => {
          const allowed = await client.callTool({
            name: "cpf_validate",
            arguments: { cpf: "00000000000" },
          });
          expect(allowed.isError).toBeUndefined();

          const blocked = await client.callTool({
            name: "cpf_validate",
            arguments: { cpf: "00000000000" },
          });
          expect(blocked.isError).toBe(true);
          const payload = JSON.parse(
            (blocked.content as Array<{ text: string }>)[0].text,
          ) as { error: string; code: number; details?: { retryAfter?: number } };
          expect(payload.code).toBe(ErrorCode.RATE_LIMIT_ERROR);
          expect(payload.error).toMatch(/Rate limit exceeded/i);
          expect(payload.details?.retryAfter).toBeGreaterThanOrEqual(1);
        },
      );

      expect(warnSpy.mock.calls.map((c) => c.join(" ")).join("\n")).toContain("mcp.rate_limited");
    });

    it("returns isError structured JSON when tool returns ok: false or validation fails", async () => {
      await withMcpClient({ rateLimit: false }, async (client) => {
        const res = await client.callTool({
          name: "cnpj_lookup",
          arguments: { cnpj: "invalid-cnpj" },
        });
        expect(res.isError).toBe(true);
        const payload = JSON.parse(
          (res.content as Array<{ text: string }>)[0].text,
        ) as { error: string; code: number };
        expect(payload.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(payload.error).toBeTruthy();
      });
    });

    it("catches unexpected thrown exceptions from executeTool (with and without error details)", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      const throwingCacheWithDetails: Cache = {
        get: async () => {
          throw new Error("unexpected cache boom");
        },
        set: async () => {},
      };

      await withMcpClient(
        { cache: throwingCacheWithDetails, rateLimit: false },
        async (client) => {
          const res = await client.callTool({
            name: "cnpj_lookup",
            arguments: { cnpj: "00394460000141" },
          });
          expect(res.isError).toBe(true);
          const payload = JSON.parse(
            (res.content as Array<{ text: string }>)[0].text,
          ) as { error: string; code: number; details?: unknown };
          expect(payload.code).toBe(ErrorCode.EXTERNAL_API_ERROR);
          expect(payload.error).toBe("unexpected cache boom");
          expect(payload.details).toBeDefined();
        },
      );

      const throwingCacheNetwork: Cache = {
        get: async () => {
          throw new Error("unexpected network connection failure");
        },
        set: async () => {},
      };

      await withMcpClient(
        { cache: throwingCacheNetwork, rateLimit: false },
        async (client) => {
          const res = await client.callTool({
            name: "cnpj_lookup",
            arguments: { cnpj: "00394460000141" },
          });
          expect(res.isError).toBe(true);
          const payload = JSON.parse(
            (res.content as Array<{ text: string }>)[0].text,
          ) as { error: string; code: number; details?: unknown };
          expect(payload.code).toBe(ErrorCode.NETWORK_ERROR);
          expect(payload.error).toBe("unexpected network connection failure");
          expect(payload.details).toBeUndefined();
        },
      );
    });
  });
});
