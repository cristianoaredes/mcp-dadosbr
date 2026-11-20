import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleHealthCheck,
  handleMCPEndpoint,
  handleMCPRequest,
  type Env,
} from "../../lib/adapters/cloudflare.js";
import {
  handleIntelligenceEndpoint,
  handleLookupEndpoint,
  handleSearchEndpoint,
  handleThinkingEndpoint,
} from "../../lib/workers/rest.js";
import { generateSecureToken } from "../../lib/workers/tokens.js";
import worker from "../../lib/workers/worker.js";
import { TOOL_DEFINITIONS } from "../../lib/core/tools.js";
import { resetCircuitBreakers } from "../../lib/core/http-client.js";

function createMemoryKv(initial: Record<string, string> = {}): KVNamespace & {
  store: Map<string, { value: string; options?: unknown }>;
} {
  const store = new Map<string, { value: string; options?: unknown }>(
    Object.entries(initial).map(([k, v]) => [k, { value: v }])
  );
  return {
    store,
    async get(key: string): Promise<string | null> {
      return store.get(key)?.value ?? null;
    },
    async put(
      key: string,
      value: string,
      options?: { expiration?: number; expirationTtl?: number; metadata?: unknown }
    ): Promise<void> {
      store.set(key, { value, options });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

describe("Workers REST API, Tokens, Worker Router & Cloudflare Adapter", () => {
  const originalTavily = process.env.TAVILY_API_KEY;
  const originalPerplexity = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    resetCircuitBreakers();
  });

  afterEach(() => {
    if (originalTavily === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = originalTavily;

    if (originalPerplexity === undefined) delete process.env.PERPLEXITY_API_KEY;
    else process.env.PERPLEXITY_API_KEY = originalPerplexity;

    resetCircuitBreakers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("lib/workers/tokens.ts", () => {
    it("generates cryptographically random 64-hex-char tokens with default and custom prefixes", () => {
      const defaultToken = generateSecureToken();
      const secondToken = generateSecureToken();
      const oauthToken = generateSecureToken("oauth");

      expect(defaultToken).toMatch(/^mcp_[0-9a-f]{64}$/);
      expect(oauthToken).toMatch(/^oauth_[0-9a-f]{64}$/);
      expect(secondToken).not.toBe(defaultToken);
    });
  });

  describe("lib/workers/rest.ts", () => {
    it("handleLookupEndpoint serves valid CNPJ, serves cache hits on KV, and handles invalid/not-found/500", async () => {
      const cacheKv = createMemoryKv();
      const env: Env = { MCP_CACHE: cacheKv };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          jsonResponse({ cnpj: "11222333000181", razao_social: "EMPRESA TESTE LTDA" })
        );

      const okResp = await handleLookupEndpoint("cnpj", "11.222.333/0001-81", env);
      expect(okResp.status).toBe(200);
      const okPayload = (await okResp.json()) as { content: Array<{ text: string }> };
      const parsed = JSON.parse(okPayload.content[0].text) as Record<string, unknown>;
      expect(parsed.razao_social).toBe("EMPRESA TESTE LTDA");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Subsequent lookup should hit KVCache without calling fetch again
      const cachedResp = await handleLookupEndpoint("cnpj", "11222333000181", env);
      expect(cachedResp.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Invalid input -> 400 with tool validation error (-32603)
      const invalidResp = await handleLookupEndpoint("cep", "invalid-cep", {});
      expect(invalidResp.status).toBe(400);
      const invalidBody = (await invalidResp.json()) as { error: string; code: number };
      expect(invalidBody.code).toBe(-32603);

      // Upstream 404 on valid checksum CNPJ -> tool returns "CNPJ not found" -> REST endpoint maps to 400
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ message: "not found" }, 404));
      const notFoundResp = await handleLookupEndpoint("cnpj", "33000167000101", {});
      expect(notFoundResp.status).toBe(400);
      const nfBody = (await notFoundResp.json()) as { data?: string };
      expect(nfBody.data).toMatch(/not found/i);

      // Trigger outer try/catch -> 500 when env triggers TypeError in handleMCPRequest
      const errResp = await handleLookupEndpoint("cnpj", "11222333000181", null as unknown as Env);
      expect(errResp.status).toBe(500);
      const errBody = (await errResp.json()) as { error: string };
      expect(errBody.error).toBe("Internal server error");
    });

    it("handleSearchEndpoint validates query, returns 200 on provider hit, 400 on provider error, and 500 on malformed JSON", async () => {
      const missingResp = await handleSearchEndpoint(
        new Request("https://worker.example/search", {
          method: "POST",
          body: JSON.stringify({ max_results: 3 }),
        }),
        {}
      );
      expect(missingResp.status).toBe(400);
      expect(await missingResp.json()).toEqual({ error: "Missing query parameter" });

      // No search API keys configured -> tool execution fails -> 400
      const noKeyResp = await handleSearchEndpoint(
        new Request("https://worker.example/search", {
          method: "POST",
          body: JSON.stringify({ query: "Empresa Teste", max_results: 2 }),
        }),
        {}
      );
      expect(noKeyResp.status).toBe(400);

      // Configure Perplexity API key & mock fetch -> 200
      process.env.PERPLEXITY_API_KEY = "pplx-test-key";
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: "Empresa Teste S/A summary" } }],
          citations: ["https://dados.gov.br/empresa"],
        })
      );

      const okResp = await handleSearchEndpoint(
        new Request("https://worker.example/search", {
          method: "POST",
          body: JSON.stringify({ query: "Empresa Teste", max_results: 2 }),
        }),
        {}
      );
      expect(okResp.status).toBe(200);
      const okData = (await okResp.json()) as { content: Array<{ text: string }> };
      expect(okData.content[0].text).toContain("Empresa Teste S/A summary");

      // Invalid JSON triggers 500
      const malformedResp = await handleSearchEndpoint(
        new Request("https://worker.example/search", {
          method: "POST",
          body: "{not-json",
        }),
        {}
      );
      expect(malformedResp.status).toBe(500);
    });

    it("handleIntelligenceEndpoint validates cnpj, handles 200 with mocked fetch, 400 on bad cnpj, and 500 on malformed JSON", async () => {
      const missingResp = await handleIntelligenceEndpoint(
        new Request("https://worker.example/intelligence", {
          method: "POST",
          body: JSON.stringify({ categories: ["government"] }),
        }),
        {}
      );
      expect(missingResp.status).toBe(400);
      expect(await missingResp.json()).toEqual({ error: "Missing cnpj parameter" });

      const invalidResp = await handleIntelligenceEndpoint(
        new Request("https://worker.example/intelligence", {
          method: "POST",
          body: JSON.stringify({ cnpj: "123" }),
        }),
        {}
      );
      expect(invalidResp.status).toBe(400);

      process.env.PERPLEXITY_API_KEY = "pplx-test-key";
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("perplexity.ai")) {
          return jsonResponse({
            choices: [{ message: { content: "Contrato federal para 11222333000181" } }],
            citations: ["https://portaldatransparencia.gov.br/contratos/1"],
          });
        }
        return jsonResponse({
          cnpj: "11222333000181",
          razao_social: "EMPRESA INTEL LTDA",
          nome_fantasia: "INTEL",
          municipio: "SAO PAULO",
          uf: "SP",
        });
      });

      const okResp = await handleIntelligenceEndpoint(
        new Request("https://worker.example/intelligence", {
          method: "POST",
          body: JSON.stringify({
            cnpj: "11222333000181",
            categories: ["government"],
            max_queries: 1,
            max_results_per_query: 2,
          }),
        }),
        {}
      );
      expect(okResp.status).toBe(200);
      const okPayload = (await okResp.json()) as { content: Array<{ text: string }> };
      expect(okPayload.content[0].text).toContain("EMPRESA INTEL LTDA");

      const malformedResp = await handleIntelligenceEndpoint(
        new Request("https://worker.example/intelligence", {
          method: "POST",
          body: "bad-json",
        }),
        {}
      );
      expect(malformedResp.status).toBe(500);
    });

    it("handleThinkingEndpoint supports valid thoughts (200), schema failure (400), and invalid JSON (500)", async () => {
      const okResp = await handleThinkingEndpoint(
        new Request("https://worker.example/thinking", {
          method: "POST",
          body: JSON.stringify({
            thought: "Verificar quadro societário",
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false,
          }),
        }),
        {}
      );
      expect(okResp.status).toBe(200);
      const payload = (await okResp.json()) as { content: Array<{ text: string }> };
      expect(payload.content[0].text).toContain("thoughtNumber");

      const badParamsResp = await handleThinkingEndpoint(
        new Request("https://worker.example/thinking", {
          method: "POST",
          body: JSON.stringify({ thought: "invalid", thoughtNumber: 0 }),
        }),
        {}
      );
      expect(badParamsResp.status).toBe(400);

      const badJsonResp = await handleThinkingEndpoint(
        new Request("https://worker.example/thinking", {
          method: "POST",
          body: "{bad",
        }),
        {}
      );
      expect(badJsonResp.status).toBe(500);
    });
  });

  describe("lib/adapters/cloudflare.ts", () => {
    it("handles tools/list, tools/call (ok, failure, throw), unknown method, and env propagation", async () => {
      const listResp = await handleMCPRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }, {});
      expect(listResp.error).toBeUndefined();
      expect((listResp.result as { tools: unknown[] }).tools).toHaveLength(TOOL_DEFINITIONS.length);

      const kv = createMemoryKv();
      const callOk = await handleMCPRequest(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "cpf_validate", arguments: { cpf: "52998224725" } },
        },
        { MCP_CACHE: kv, TAVILY_API_KEY: "tvly-propagated" }
      );
      expect(process.env.TAVILY_API_KEY).toBe("tvly-propagated");
      expect(callOk.error).toBeUndefined();
      const okText = ((callOk.result as { content: Array<{ text: string }> }).content[0]).text;
      expect(JSON.parse(okText)).toMatchObject({ valid: true, region: "ES/RJ" });

      // Tool returns ok:false (-32603)
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ error: "not found" }, 404));
      const callFail = await handleMCPRequest(
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "cnpj_lookup", arguments: { cnpj: "11222333000181" } },
        },
        {}
      );
      expect(callFail.error).toMatchObject({ code: -32603, message: "Tool execution failed" });

      // Inner catch (-32602) when KVCache rejects during executeTool
      const throwingKv: KVNamespace = {
        get: vi.fn().mockRejectedValue(new Error("kv outage")),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      const callThrow = await handleMCPRequest(
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "cnpj_lookup", arguments: { cnpj: "11222333000181" } },
        },
        { MCP_CACHE: throwingKv }
      );
      expect(callThrow.error).toMatchObject({
        code: -32602,
        message: "Invalid parameters",
        data: "kv outage",
      });

      // Outer catch (-32603) when params is null
      const nullParams = await handleMCPRequest(
        { jsonrpc: "2.0", id: 5, method: "tools/call", params: null },
        {}
      );
      expect(nullParams.error).toMatchObject({ code: -32603, message: "Internal error" });

      // Unknown method (-32601)
      const unknownMethod = await handleMCPRequest(
        { jsonrpc: "2.0", id: 6, method: "resources/unknown" },
        {}
      );
      expect(unknownMethod.error).toMatchObject({ code: -32601, message: "Method not found" });
    });

    it("handleMCPEndpoint handles valid requests, invalid JSON (-32700), request read errors (500), and health check", async () => {
      const okResp = await handleMCPEndpoint(
        new Request("https://worker.example/mcp", {
          method: "POST",
          body: JSON.stringify({ jsonrpc: "2.0", id: 10, method: "tools/list" }),
        }),
        { TAVILY_API_KEY: "tvly-endpoint" }
      );
      expect(okResp.status).toBe(200);
      expect(process.env.TAVILY_API_KEY).toBe("tvly-endpoint");

      const parseErrResp = await handleMCPEndpoint(
        new Request("https://worker.example/mcp", { method: "POST", body: "{invalid" }),
        {}
      );
      expect(parseErrResp.status).toBe(400);
      const parseErrBody = (await parseErrResp.json()) as { error: { code: number } };
      expect(parseErrBody.error.code).toBe(-32700);

      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const badRequest = {
        text: vi.fn().mockRejectedValue(new Error("stream aborted")),
      } as unknown as Request;
      const internalErrResp = await handleMCPEndpoint(badRequest, {});
      expect(internalErrResp.status).toBe(500);
      const internalBody = (await internalErrResp.json()) as { error: { code: number; data: string } };
      expect(internalBody.error).toMatchObject({ code: -32603, data: "stream aborted" });
      expect(errSpy).toHaveBeenCalled();

      const healthResp = handleHealthCheck();
      expect(healthResp.status).toBe(200);
      expect(await healthResp.json()).toMatchObject({
        status: "healthy",
        service: "mcp-dadosbr",
        runtime: "cloudflare-workers",
      });
    });
  });

  describe("lib/workers/worker.ts", () => {
    it("routes /, /mcp 405, /sse 405, REST endpoints, unknown 404, env propagation, and 429 rate limits", async () => {
      const ctx = createExecutionContext();
      const baseEnv: Env = { MCP_DISABLE_RATE_LIMIT: "true" };

      // Root /
      const rootResp = await worker.fetch(new Request("https://worker.example/"), baseEnv, ctx);
      expect(rootResp.status).toBe(200);
      const rootJson = (await rootResp.json()) as { service: string; endpoints: Record<string, string> };
      expect(rootJson.service).toBe("MCP DadosBR");
      expect(rootJson.endpoints.mcp).toBe("/mcp (HTTP JSON-RPC)");

      // 405 Method Not Allowed on GET /mcp & DELETE /sse
      const mcpGet = await worker.fetch(new Request("https://worker.example/mcp"), baseEnv, ctx);
      expect(mcpGet.status).toBe(405);

      const sseDel = await worker.fetch(
        new Request("https://worker.example/sse", { method: "DELETE" }),
        baseEnv,
        ctx
      );
      expect(sseDel.status).toBe(405);

      // 404 Unknown route
      const notFound = await worker.fetch(
        new Request("https://worker.example/unknown/route"),
        baseEnv,
        ctx
      );
      expect(notFound.status).toBe(404);

      // GET /cnpj/:cnpj and /cep/:cep with mocked fetch + env.TAVILY_API_KEY propagation
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        jsonResponse({ cnpj: "11222333000181", cep: "01310100", ok: true })
      );
      const cnpjResp = await worker.fetch(
        new Request("https://worker.example/cnpj/11222333000181"),
        { ...baseEnv, TAVILY_API_KEY: "tvly-worker" },
        ctx
      );
      expect(cnpjResp.status).toBe(200);
      expect(process.env.TAVILY_API_KEY).toBe("tvly-worker");

      const cepResp = await worker.fetch(
        new Request("https://worker.example/cep/01310100"),
        baseEnv,
        ctx
      );
      expect(cepResp.status).toBe(200);

      // POST /search, /intelligence, /thinking via worker router
      const searchResp = await worker.fetch(
        new Request("https://worker.example/search", { method: "POST", body: "{}" }),
        baseEnv,
        ctx
      );
      expect(searchResp.status).toBe(400);

      const intelResp = await worker.fetch(
        new Request("https://worker.example/intelligence", { method: "POST", body: "{}" }),
        baseEnv,
        ctx
      );
      expect(intelResp.status).toBe(400);

      const thinkResp = await worker.fetch(
        new Request("https://worker.example/thinking", {
          method: "POST",
          body: JSON.stringify({
            thought: "step",
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false,
          }),
        }),
        baseEnv,
        ctx
      );
      expect(thinkResp.status).toBe(200);

      // Rate limit 429 enforcement via MCP_KV
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      const bucket = Math.floor(Date.now() / 60000);
      const rateKv = createMemoryKv({
        [`rate_limit:198.51.100.10:${bucket}`]: JSON.stringify({ count: 30 }),
      });

      const limitedResp = await worker.fetch(
        new Request("https://worker.example/cep/01310100", {
          headers: { "CF-Connecting-IP": "198.51.100.10", Origin: "https://app.example" },
        }),
        { MCP_KV: rateKv },
        ctx
      );
      expect(limitedResp.status).toBe(429);
      expect(limitedResp.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});
