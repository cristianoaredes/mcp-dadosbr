import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Env } from "../../lib/adapters/cloudflare.js";
import * as configModule from "../../lib/config/index.js";
import { resetCircuitBreakers } from "../../lib/core/http-client.js";
import {
  handleIntelligenceEndpoint,
  handleLookupEndpoint,
  handleSearchEndpoint,
  handleThinkingEndpoint,
} from "../../lib/workers/rest.js";
import worker from "../../lib/workers/worker.js";

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

function expectDefensiveHeaders(response: Response): void {
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
}

describe("Worker REST JSON 400 handling, 500 error sanitization & defensive headers (TCK-0035)", () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  afterEach(() => {
    resetCircuitBreakers();
    vi.restoreAllMocks();
  });

  describe("Malformed JSON returns 400 without parser error leakage", () => {
    it.each([
      {
        name: "POST /search",
        path: "/search",
        handler: handleSearchEndpoint,
      },
      {
        name: "POST /intelligence",
        path: "/intelligence",
        handler: handleIntelligenceEndpoint,
      },
      {
        name: "POST /thinking",
        path: "/thinking",
        handler: handleThinkingEndpoint,
      },
    ])("$name returns 400 Invalid JSON payload on malformed or non-object bodies", async ({ path, handler }) => {
      for (const rawBody of ["{malformed", "", "null", "[]"]) {
        const res = await handler(
          new Request(`https://worker.example${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: rawBody,
          }),
          {}
        );

        expect(res.status).toBe(400);
        expect(res.headers.get("Content-Type")).toBe("application/json");
        expectDefensiveHeaders(res);

        const bodyText = await res.text();
        expect(bodyText).not.toMatch(/SyntaxError|Unexpected/i);
        expect(JSON.parse(bodyText)).toEqual({
          error: "Bad Request",
          message: "Invalid JSON payload",
        });
      }
    });
  });

  describe("Unexpected internal exceptions return sanitized 500 and masked stderr logs", () => {
    it("sanitizes 500 responses across all 4 REST handlers without exposing raw exception messages", async () => {
      const secretLeak = "secret-backend-boom cnpj=12.345.678/0001-99 owner=admin@example.com";
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(configModule, "resolveApiConfig").mockImplementation(() => {
        throw new Error(secretLeak);
      });

      const responses = await Promise.all([
        handleLookupEndpoint("cnpj", "11222333000181", {}),
        handleSearchEndpoint(
          new Request("https://worker.example/search", {
            method: "POST",
            body: JSON.stringify({ query: "Empresa Teste" }),
          }),
          {}
        ),
        handleIntelligenceEndpoint(
          new Request("https://worker.example/intelligence", {
            method: "POST",
            body: JSON.stringify({ cnpj: "11222333000181" }),
          }),
          {}
        ),
        handleThinkingEndpoint(
          new Request("https://worker.example/thinking", {
            method: "POST",
            body: JSON.stringify({
              thought: "Etapa 1",
              thoughtNumber: 1,
              totalThoughts: 1,
              nextThoughtNeeded: false,
            }),
          }),
          {}
        ),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(500);
        expectDefensiveHeaders(res);
        const rawText = await res.text();
        expect(rawText).not.toContain("secret-backend-boom");
        expect(rawText).not.toContain("12.345.678/0001-99");
        expect(rawText).not.toContain("admin@example.com");
        expect(JSON.parse(rawText)).toEqual({
          error: "Internal server error",
        });
      }

      expect(errSpy).toHaveBeenCalledTimes(4);
      const loggedLines = errSpy.mock.calls.map((call) => String(call[0]));
      for (const line of loggedLines) {
        const parsed = JSON.parse(line) as {
          level: string;
          module: string;
          message: string;
          context?: { endpoint?: string; error?: string };
        };
        expect(parsed.level).toBe("error");
        expect(parsed.module).toBe("worker-rest");
        expect(parsed.message).toBe("rest.handler_error");
        expect(parsed.context?.error).toContain("secret-backend-boom");
        expect(parsed.context?.error).not.toContain("12.345.678/0001-99");
        expect(parsed.context?.error).not.toContain("admin@example.com");
        expect(parsed.context?.error).toContain("[REDACTED]");
      }
    });

    it("returns sanitized 500 when request.json() rejects with a non-SyntaxError stream error", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const abortRequest = {
        json: vi.fn().mockRejectedValue(new Error("raw-stream-abort-token")),
      } as unknown as Request;

      const res = await handleSearchEndpoint(abortRequest, {});
      expect(res.status).toBe(500);
      const rawText = await res.text();
      expect(rawText).not.toContain("raw-stream-abort-token");
      expect(JSON.parse(rawText)).toEqual({ error: "Internal server error" });
      expect(errSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cloudflare Worker defensive security and cache headers", () => {
    it("sets X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Cache-Control across all Worker responses", async () => {
      const ctx = createExecutionContext();
      const baseEnv: Env = {
        MCP_DISABLE_RATE_LIMIT: "true",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ cnpj: "11222333000181", razao_social: "EMPRESA TESTE" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      // GET /
      const rootRes = await worker.fetch(new Request("https://worker.example/"), baseEnv, ctx);
      expect(rootRes.status).toBe(200);
      expectDefensiveHeaders(rootRes);

      // GET /health
      const healthRes = await worker.fetch(new Request("https://worker.example/health"), baseEnv, ctx);
      expect(healthRes.status).toBe(200);
      expectDefensiveHeaders(healthRes);

      // POST /mcp
      const mcpRes = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        }),
        baseEnv,
        ctx
      );
      expect(mcpRes.status).toBe(200);
      expectDefensiveHeaders(mcpRes);

      // GET /cnpj/:cnpj (REST lookup)
      const lookupRes = await worker.fetch(
        new Request("https://worker.example/cnpj/11222333000181"),
        baseEnv,
        ctx
      );
      expect(lookupRes.status).toBe(200);
      expectDefensiveHeaders(lookupRes);

      // POST /search (malformed JSON -> 400)
      const searchBadJson = await worker.fetch(
        new Request("https://worker.example/search", {
          method: "POST",
          body: "{bad",
        }),
        baseEnv,
        ctx
      );
      expect(searchBadJson.status).toBe(400);
      expectDefensiveHeaders(searchBadJson);

      // POST /intelligence (malformed JSON -> 400)
      const intelBadJson = await worker.fetch(
        new Request("https://worker.example/intelligence", {
          method: "POST",
          body: "{bad",
        }),
        baseEnv,
        ctx
      );
      expect(intelBadJson.status).toBe(400);
      expectDefensiveHeaders(intelBadJson);

      // POST /thinking (valid -> 200)
      const thinkingRes = await worker.fetch(
        new Request("https://worker.example/thinking", {
          method: "POST",
          body: JSON.stringify({
            thought: "Checar headers",
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false,
          }),
        }),
        baseEnv,
        ctx
      );
      expect(thinkingRes.status).toBe(200);
      expectDefensiveHeaders(thinkingRes);

      // OPTIONS preflight (allowed & blocked)
      const optionsAllowed = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "OPTIONS",
          headers: { Origin: "https://app.example" },
        }),
        baseEnv,
        ctx
      );
      expect(optionsAllowed.status).toBe(204);
      expectDefensiveHeaders(optionsAllowed);

      const authEnv: Env = {
        MCP_DISABLE_RATE_LIMIT: "true",
        MCP_API_KEY: "test-key-123",
        MCP_ALLOWED_ORIGINS: "https://trusted.example",
      };
      const optionsBlocked = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "OPTIONS",
          headers: { Origin: "https://evil.example" },
        }),
        authEnv,
        ctx
      );
      expect(optionsBlocked.status).toBe(403);
      expectDefensiveHeaders(optionsBlocked);

      // 401 Unauthorized
      const unauthRes = await worker.fetch(
        new Request("https://worker.example/search", {
          method: "POST",
          body: JSON.stringify({ query: "Teste" }),
        }),
        authEnv,
        ctx
      );
      expect(unauthRes.status).toBe(401);
      expectDefensiveHeaders(unauthRes);

      // 404 Not found
      const notFoundRes = await worker.fetch(
        new Request("https://worker.example/missing-route"),
        baseEnv,
        ctx
      );
      expect(notFoundRes.status).toBe(404);
      expectDefensiveHeaders(notFoundRes);
    });
  });
});
