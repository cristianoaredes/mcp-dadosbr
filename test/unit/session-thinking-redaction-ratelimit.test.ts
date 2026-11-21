import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  SequentialThinkingProcessor,
  MAX_THOUGHT_HISTORY,
  MAX_BRANCHES,
} from "../../lib/core/sequential-thinking.js";
import {
  maskCnpj,
  summarizeQueryForLog,
  maskSensitiveText,
} from "../../lib/shared/log-redaction.js";
import { executeSearch } from "../../lib/core/search.js";
import { executeIntelligence } from "../../lib/core/intelligence.js";
import { executeTool } from "../../lib/core/tools.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";
import { MemoryCache } from "../../lib/core/cache.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { RateLimiter } from "../../lib/infrastructure/rate-limiter.js";
import { ErrorCode } from "../../lib/shared/errors.js";

vi.mock("tavily", () => {
  return {
    TavilyClient: class MockTavilyClient {
      search = vi.fn().mockResolvedValue({
        results: [
          {
            title: "Mock Result",
            url: "https://example.org/doc",
            content: "Empresa 11222333000181 citada",
            score: 0.9,
          },
        ],
      });
    },
  };
});

async function withMcpClient<T>(
  options: Parameters<typeof createMCPServer>[0],
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const server = createMCPServer(options);
  const client = new Client({ name: "tck-0017-test", version: "1.0.0" });
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

describe("TCK-0017: Session Isolation, Log Redaction & MCP Rate Limiting", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe("SequentialThinking session isolation, Map branches & bounds", () => {
    it("isolates sequentialthinking history and branches between separate MCP server sessions", async () => {
      const apiConfig = resolveApiConfig();

      await withMcpClient({ apiConfig, rateLimit: false }, async (clientA) => {
        const resA1 = await clientA.callTool({
          name: "sequentialthinking",
          arguments: {
            thought: "Session A secret reasoning",
            thoughtNumber: 1,
            totalThoughts: 2,
            nextThoughtNeeded: true,
          },
        });
        expect(resA1.isError).toBeUndefined();
        const dataA1 = JSON.parse((resA1.content as Array<{ text: string }>)[0].text);
        expect(dataA1.thoughtHistoryLength).toBe(1);

        const resA2 = await clientA.callTool({
          name: "sequentialthinking",
          arguments: {
            thought: "Session A branch step",
            thoughtNumber: 2,
            totalThoughts: 2,
            nextThoughtNeeded: false,
            branchFromThought: 1,
            branchId: "alpha",
          },
        });
        const dataA2 = JSON.parse((resA2.content as Array<{ text: string }>)[0].text);
        expect(dataA2.thoughtHistoryLength).toBe(2);
        expect(dataA2.branches).toEqual(["alpha"]);

        await withMcpClient({ apiConfig, rateLimit: false }, async (clientB) => {
          const resB1 = await clientB.callTool({
            name: "sequentialthinking",
            arguments: {
              thought: "Session B independent thought",
              thoughtNumber: 1,
              totalThoughts: 1,
              nextThoughtNeeded: false,
            },
          });
          const dataB1 = JSON.parse((resB1.content as Array<{ text: string }>)[0].text);
          expect(dataB1.thoughtHistoryLength).toBe(1);
          expect(dataB1.branches).toEqual([]);
        });
      });

      // Stateless direct executeTool calls do not accumulate cross-call state
      const direct1 = await executeTool(
        "sequentialthinking",
        {
          thought: "Stateless 1",
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          branchFromThought: 1,
          branchId: "ephemeral",
        },
        apiConfig
      );
      const direct2 = await executeTool(
        "sequentialthinking",
        {
          thought: "Stateless 2",
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
        },
        apiConfig
      );
      expect((direct1.data as { thoughtHistoryLength: number }).thoughtHistoryLength).toBe(1);
      expect((direct2.data as { thoughtHistoryLength: number }).thoughtHistoryLength).toBe(1);
      expect((direct2.data as { branches: string[] }).branches).toEqual([]);
    });

    it("prevents Object.prototype collision via Map branches and caps history/branch growth", () => {
      const proc = new SequentialThinkingProcessor();

      for (const protoKey of ["__proto__", "constructor", "toString"]) {
        const res = proc.processThought({
          thought: `Testing key ${protoKey}`,
          thoughtNumber: 1,
          totalThoughts: 2,
          nextThoughtNeeded: true,
          branchFromThought: 1,
          branchId: protoKey,
        });
        expect(res.ok).toBe(true);
      }

      expect(({} as Record<string, unknown>)["__proto__"]).toBe(Object.prototype);
      const snapshot = proc.getBranches();
      expect(Object.getPrototypeOf(snapshot)).toBeNull();
      expect(Object.keys(snapshot)).toEqual(["__proto__", "constructor", "toString"]);

      const bounded = new SequentialThinkingProcessor();
      for (let i = 1; i <= MAX_THOUGHT_HISTORY + 15; i++) {
        bounded.processThought({
          thought: `Step ${i}`,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          branchFromThought: 1,
          branchId: `b-${(i % (MAX_BRANCHES + 5)) + 1}`,
        });
      }
      expect(bounded.getHistory()).toHaveLength(MAX_THOUGHT_HISTORY);
      expect(Object.keys(bounded.getBranches()).length).toBeLessThanOrEqual(MAX_BRANCHES);
    });

    it("keeps thought logging disabled by default and masks content if explicitly enabled in non-production", () => {
      delete process.env.ENABLE_THOUGHT_LOGGING;
      delete process.env.DISABLE_THOUGHT_LOGGING;
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const defaultProc = new SequentialThinkingProcessor();
      defaultProc.processThought({
        thought: "Sensitive thought CPF 123.456.789-00",
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      });
      expect(errSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = "production";
      process.env.ENABLE_THOUGHT_LOGGING = "true";
      const prodProc = new SequentialThinkingProcessor();
      prodProc.processThought({
        thought: "Sensitive production thought 11222333000181",
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      });
      expect(errSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = "development";
      process.env.ENABLE_THOUGHT_LOGGING = "true";
      const devProc = new SequentialThinkingProcessor();
      devProc.processThought({
        thought: "Debug CPF 123.456.789-00 and email user@example.com",
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      });
      expect(errSpy).toHaveBeenCalledTimes(1);
      const logged = String(errSpy.mock.calls[0][0]);
      expect(logged).not.toContain("123.456.789-00");
      expect(logged).not.toContain("user@example.com");
      expect(logged).toContain("[REDACTED]");
    });
  });

  describe("PII, query & dork log redaction", () => {
    it("redacts helpers properly", () => {
      expect(maskCnpj("11.222.333/0001-81")).toBe("***0181");
      expect(summarizeQueryForLog("secret name")).toBe("query(len=11)");
      expect(
        maskSensitiveText("CPF 123.456.789-00 e CNPJ 11222333000181\nnova linha")
      ).toBe("CPF [REDACTED] e CNPJ [REDACTED] nova linha");
    });

    it("never logs raw search query or PII in executeSearch stderr logs", async () => {
      process.env.TAVILY_API_KEY = "test-api-key";
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const cache = new MemoryCache(10, 60000);

      const res = await executeSearch("JOAO SILVA 123.456.789-00", 5, cache);
      expect(res.ok).toBe(true);

      const entries = errSpy.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>);
      expect(entries.some((e) => e.module === "search" && e.level === "info")).toBe(true);
      const combinedLogs = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(combinedLogs).toContain("query(len=25)");
      expect(combinedLogs).not.toContain("JOAO SILVA");
      expect(combinedLogs).not.toContain("123.456.789-00");
    });

    it("masks CNPJ, company name, and dorks in executeIntelligence stderr logs", async () => {
      process.env.TAVILY_API_KEY = "test-api-key";
      process.env.LOG_LEVEL = "debug";
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const apiConfig = resolveApiConfig();

      const res = await executeIntelligence(
        {
          cnpj: "11222333000181",
          cachedCompanyData: {
            cnpj: "11222333000181",
            razao_social: "EMPRESA CONFIDENCIAL LTDA",
            qsa: [{ nome_socio: "SOCIO SIGILOSO" }],
          },
          categories: ["partners"],
          maxQueries: 2,
          maxResultsPerQuery: 2,
        },
        apiConfig
      );
      expect(res.ok).toBe(true);

      const entries = errSpy.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>);
      expect(entries.some((e) => e.module === "intelligence" && e.level === "info")).toBe(true);
      expect(entries.some((e) => e.module === "intelligence" && e.level === "debug")).toBe(true);
      const combinedLogs = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(combinedLogs).toContain("***0181");
      expect(combinedLogs).toContain("query(len=");
      expect(combinedLogs).not.toContain("11222333000181");
      expect(combinedLogs).not.toContain("EMPRESA CONFIDENCIAL LTDA");
      expect(combinedLogs).not.toContain("SOCIO SIGILOSO");
    });
  });

  describe("MCP Dispatcher Rate Limiting (stdio / SSE / Smithery)", () => {
    it("enforces configurable per-session tool rate limits and returns RATE_LIMIT_ERROR", async () => {
      const apiConfig = resolveApiConfig();

      await withMcpClient(
        { apiConfig, rateLimit: { windowMs: 60000, maxRequests: 3 } },
        async (client) => {
          for (let i = 0; i < 3; i++) {
            const okRes = await client.callTool({
              name: "cpf_validate",
              arguments: { cpf: "00000000000" },
            });
            expect(okRes.isError).toBeUndefined();
          }

          const blocked = await client.callTool({
            name: "cpf_validate",
            arguments: { cpf: "00000000000" },
          });
          expect(blocked.isError).toBe(true);
          const payload = JSON.parse(
            (blocked.content as Array<{ text: string }>)[0].text
          );
          expect(payload.code).toBe(ErrorCode.RATE_LIMIT_ERROR);
          expect(payload.error).toMatch(/Rate limit exceeded/i);
          expect(payload.details.retryAfter).toBeGreaterThanOrEqual(1);
        }
      );
    });

    it("honors MCP_TOOL_RATE_LIMIT_MAX env var and allows RateLimiter.destroy()", async () => {
      process.env.MCP_TOOL_RATE_LIMIT_MAX = "2";
      const apiConfig = resolveApiConfig();

      await withMcpClient({ apiConfig }, async (client) => {
        expect(
          (await client.callTool({ name: "cpf_validate", arguments: { cpf: "00000000000" } }))
            .isError
        ).toBeUndefined();
        expect(
          (await client.callTool({ name: "cpf_validate", arguments: { cpf: "00000000000" } }))
            .isError
        ).toBeUndefined();
        const third = await client.callTool({
          name: "cpf_validate",
          arguments: { cpf: "00000000000" },
        });
        expect(third.isError).toBe(true);
      });

      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        enableCleanupTimer: true,
      });
      limiter.checkLimit("a");
      expect(limiter.getStats().activeClients).toBe(1);
      limiter.destroy();
      expect(limiter.getStats().activeClients).toBe(0);
    });
  });
});
