import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCache } from "../../lib/core/cache.js";
import { resolveApiConfig, SERVER_NAME, SERVER_VERSION } from "../../lib/config/index.js";
import { CNPJ_INTELLIGENCE_TOOL, executeIntelligence } from "../../lib/core/intelligence.js";
import { lookup } from "../../lib/core/lookup.js";
import { executeTool, resetMetrics, TOOL_DEFINITIONS } from "../../lib/core/tools.js";
import { SERVER } from "../../lib/shared/utils/constants.js";
import { handleHealthCheck, syncWorkerEnv } from "../../lib/adapters/cloudflare.js";
import { generateOpenAPISchema } from "../../lib/workers/openapi.js";
import { handleSSEEndpoint } from "../../lib/workers/sse.js";
import worker from "../../lib/workers/worker.js";
import { resetCircuitBreakers } from "../../lib/core/http-client.js";

const ROOT = resolve(import.meta.dirname, "../..");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("FND-0012 / TCK-0024: Architecture Hygiene, Contract Unification & Worker Parity", () => {
  const apiConfig = resolveApiConfig();
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    delete process.env.TRANSPARENCIA_API_KEY;
    delete process.env.DATAJUD_API_KEY;
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_KV;
    resetMetrics();
    resetCircuitBreakers();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetMetrics();
    resetCircuitBreakers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("eliminates circular core <-> tools dependency and unifies cnpj_intelligence definition", () => {
    const intelligenceSrc = readFileSync(resolve(ROOT, "lib/core/intelligence.ts"), "utf8");
    const lookupSrc = readFileSync(resolve(ROOT, "lib/core/lookup.ts"), "utf8");
    const toolsCoreSrc = readFileSync(resolve(ROOT, "lib/tools/core.ts"), "utf8");
    const companySrc = readFileSync(resolve(ROOT, "lib/tools/company.ts"), "utf8");

    expect(intelligenceSrc).toContain("./lookup.js");
    expect(intelligenceSrc).not.toMatch(/\.\.\/tools\//);
    expect(lookupSrc).not.toMatch(/\.\.\/tools\//);

    expect(toolsCoreSrc).toContain("CNPJ_INTELLIGENCE_TOOL");
    expect(toolsCoreSrc).not.toMatch(/await import\(["']\.\.\/core\/intelligence\.js["']\)/);
    expect(toolsCoreSrc).toContain("...CNPJ_INTELLIGENCE_TOOL");
    expect(companySrc).toContain("../core/lookup.js");

    const registered = TOOL_DEFINITIONS.find((t) => t.name === "cnpj_intelligence");
    expect(registered?.inputSchema).toEqual(CNPJ_INTELLIGENCE_TOOL.inputSchema);
  });

  it("normalizes CNPJ in executeIntelligence cache/lookup and forwards max_queries + max_results_per_query", async () => {
    const cache = new MemoryCache(20, 60_000);
    process.env.PERPLEXITY_API_KEY = "pplx-test-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("api.opencnpj.org")) {
        return jsonResponse({
          cnpj: "11222333000181",
          razao_social: "EMPRESA NORMALIZADA LTDA",
          nome_fantasia: "NORMALIZADA",
          uf: "SP",
          municipio: "SAO PAULO",
        });
      }
      if (url.includes("perplexity.ai")) {
        return jsonResponse({
          choices: [{ message: { content: "Resultado para CNPJ 11.222.333/0001-81" } }],
          citations: ["https://dados.gov.br/doc/1"],
        });
      }
      return jsonResponse({}, 404);
    });

    // Populate cache using unformatted digits via lookup()
    const baseLookup = await lookup("cnpj", "11222333000181", apiConfig, cache);
    expect(baseLookup.ok).toBe(true);
    expect(
      fetchSpy.mock.calls.filter(([u]) => String(u).includes("api.opencnpj.org"))
    ).toHaveLength(1);

    // Call executeIntelligence with formatted CNPJ -> must hit normalized cache with 0 extra CNPJ fetches
    const intel = await executeIntelligence(
      {
        cnpj: "11.222.333/0001-81",
        categories: ["government"],
        maxQueries: 1,
        maxResultsPerQuery: 2,
      },
      apiConfig,
      cache
    );
    expect(intel.ok).toBe(true);
    expect(
      fetchSpy.mock.calls.filter(([u]) => String(u).includes("api.opencnpj.org"))
    ).toHaveLength(1);

    // Execute via executeTool using snake_case parameters from MCP schema
    const toolRes = await executeTool(
      "cnpj_intelligence",
      {
        cnpj: "11.222.333/0001-81",
        categories: ["government"],
        max_queries: 1,
        max_results_per_query: 2,
      },
      apiConfig,
      cache
    );
    expect(toolRes.ok).toBe(true);
    expect((toolRes.data as { queries_executed: number }).queries_executed).toBe(1);
  });

  it("synchronizes SERVER_VERSION, OpenAPI, HealthCheck, SSE events, and Worker / 23-tool catalogue with package.json", async () => {
    vi.useFakeTimers();
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      version: string;
    };

    expect(SERVER.VERSION).toBe(pkg.version);
    expect(SERVER_VERSION).toBe(pkg.version);
    expect(SERVER_NAME).toBe("mcp-dadosbr");

    const openApi = generateOpenAPISchema("https://worker.example/openapi.json") as {
      info: { version: string };
    };
    expect(openApi.info.version).toBe(pkg.version);

    const healthResp = await handleHealthCheck();
    const healthJson = (await healthResp.json()) as { version: string };
    expect(healthJson.version).toBe(pkg.version);

    const ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;
    const rootResp = await worker.fetch(
      new Request("https://worker.example/"),
      { MCP_DISABLE_RATE_LIMIT: "true" },
      ctx
    );
    expect(rootResp.status).toBe(200);
    const rootJson = (await rootResp.json()) as { version: string; tools: string[] };
    expect(rootJson.version).toBe(pkg.version);
    expect(rootJson.tools).toEqual(TOOL_DEFINITIONS.map((t) => t.name));
    expect(rootJson.tools).toHaveLength(23);

    // Check SSE initial events emit SERVER_VERSION
    const sseResp = await handleSSEEndpoint(
      new Request("https://worker.example/sse", { method: "GET" }),
      {},
      ctx
    );
    const reader = sseResp.body!.getReader();
    const decoder = new TextDecoder();
    const { value: chunk1 } = await reader.read();
    const { value: chunk2 } = await reader.read();
    const sseText = decoder.decode(chunk1) + decoder.decode(chunk2);
    expect(sseText).toContain(`"version":"${pkg.version}"`);
    await reader.cancel();
  });

  it("propagates all allowlisted Worker API keys via syncWorkerEnv and worker.fetch without leaking control secrets or KV bindings", async () => {
    syncWorkerEnv({
      TAVILY_API_KEY: "tvly-sync",
      PERPLEXITY_API_KEY: "pplx-sync",
      TRANSPARENCIA_API_KEY: "transp-sync",
      DATAJUD_API_KEY: "datajud-sync",
      MCP_API_KEY: "control-secret-do-not-leak",
      MCP_KV: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as KVNamespace,
    });

    expect(process.env.TAVILY_API_KEY).toBe("tvly-sync");
    expect(process.env.PERPLEXITY_API_KEY).toBe("pplx-sync");
    expect(process.env.TRANSPARENCIA_API_KEY).toBe("transp-sync");
    expect(process.env.DATAJUD_API_KEY).toBe("datajud-sync");
    expect(process.env.MCP_API_KEY).toBeUndefined();
    expect(process.env.MCP_KV).toBeUndefined();

    delete process.env.TAVILY_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    delete process.env.TRANSPARENCIA_API_KEY;
    delete process.env.DATAJUD_API_KEY;

    const ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;
    await worker.fetch(
      new Request("https://worker.example/"),
      {
        MCP_DISABLE_RATE_LIMIT: "true",
        TAVILY_API_KEY: "tvly-fetch",
        PERPLEXITY_API_KEY: "pplx-fetch",
        TRANSPARENCIA_API_KEY: "transp-fetch",
        DATAJUD_API_KEY: "datajud-fetch",
      },
      ctx
    );

    expect(process.env.TAVILY_API_KEY).toBe("tvly-fetch");
    expect(process.env.PERPLEXITY_API_KEY).toBe("pplx-fetch");
    expect(process.env.TRANSPARENCIA_API_KEY).toBe("transp-fetch");
    expect(process.env.DATAJUD_API_KEY).toBe("datajud-fetch");
  });

  it("removes orphan patch file and broken test:sse package script", () => {
    expect(existsSync(resolve(ROOT, "test/unit/search.test.ts.patch"))).toBe(false);
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts).not.toHaveProperty("test:sse");
  });
});
