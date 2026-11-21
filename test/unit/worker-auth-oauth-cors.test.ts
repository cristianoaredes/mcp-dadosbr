import { describe, expect, it, vi } from "vitest";
import worker from "../../lib/workers/worker.js";
import { constantTimeEqual } from "../../lib/workers/auth.js";
import { parseAllowedOrigins } from "../../lib/adapters/cloudflare.js";
import { generateOpenAPISchema } from "../../lib/workers/openapi.js";
import type { Env } from "../../lib/adapters/cloudflare.js";

const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
} as unknown as ExecutionContext;

function makeMcpListRequest(
  headers: Record<string, string> = {},
  method = "POST"
): Request {
  return new Request("https://worker.example/mcp", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...(method === "POST"
      ? {
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          }),
        }
      : {}),
  });
}

describe("Worker Auth, OAuth Fail-Closed & CORS Hardening (TCK-0013)", () => {
  describe("constantTimeEqual", () => {
    it("returns true for identical strings and false for single-char, length, empty, or UTF-8 mismatches", () => {
      expect(constantTimeEqual("secret-token-123", "secret-token-123")).toBe(true);
      expect(constantTimeEqual("", "")).toBe(true);
      expect(constantTimeEqual("secret-token-123", "secret-token-124")).toBe(false);
      expect(constantTimeEqual("secret-token-123", "secret-token-12")).toBe(false);
      expect(constantTimeEqual("secret-token-123", "secret-token-1234")).toBe(false);
      expect(constantTimeEqual("", "a")).toBe(false);
      expect(constantTimeEqual("a", "")).toBe(false);
      expect(constantTimeEqual("chave-áéíóú", "chave-áéíóú")).toBe(true);
      expect(constantTimeEqual("chave-áéíóú", "chave-aeiou")).toBe(false);
    });
  });

  describe("Authentication enforcement with MCP_API_KEY", () => {
    const env: Env = { MCP_API_KEY: "super-secret-worker-key" };

    it("rejects unauthenticated POST /mcp and GET /sse with 401 and WWW-Authenticate", async () => {
      const mcpRes = await worker.fetch(makeMcpListRequest(), env, mockCtx);
      expect(mcpRes.status).toBe(401);
      expect(mcpRes.headers.get("WWW-Authenticate")).toBe("Bearer");

      const sseRes = await worker.fetch(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
        }),
        env,
        mockCtx
      );
      expect(sseRes.status).toBe(401);
      expect(sseRes.headers.get("WWW-Authenticate")).toBe("Bearer");
    });

    it("rejects wrong or different-length Bearer tokens on /mcp", async () => {
      const wrongSameLen = await worker.fetch(
        makeMcpListRequest({ Authorization: "Bearer super-secret-worker-kez" }),
        env,
        mockCtx
      );
      expect(wrongSameLen.status).toBe(401);

      const wrongLen = await worker.fetch(
        makeMcpListRequest({ Authorization: "Bearer short" }),
        env,
        mockCtx
      );
      expect(wrongLen.status).toBe(401);
    });

    it("rejects unauthenticated REST endpoints (/cnpj/* and /search) with 401", async () => {
      const cnpjRes = await worker.fetch(
        new Request("https://worker.example/cnpj/11222333000181"),
        env,
        mockCtx
      );
      expect(cnpjRes.status).toBe(401);

      const searchRes = await worker.fetch(
        new Request("https://worker.example/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "teste" }),
        }),
        env,
        mockCtx
      );
      expect(searchRes.status).toBe(401);
    });

    it("allows POST /mcp tools/list with valid Authorization Bearer or X-API-Key", async () => {
      const bearerRes = await worker.fetch(
        makeMcpListRequest({ Authorization: "Bearer super-secret-worker-key" }),
        env,
        mockCtx
      );
      expect(bearerRes.status).toBe(200);
      const bearerJson = (await bearerRes.json()) as {
        result?: { tools?: Array<{ name: string }> };
      };
      expect(Array.isArray(bearerJson.result?.tools)).toBe(true);
      expect(bearerJson.result?.tools?.length).toBeGreaterThan(0);

      const headerRes = await worker.fetch(
        makeMcpListRequest({ "X-API-Key": "super-secret-worker-key" }),
        env,
        mockCtx
      );
      expect(headerRes.status).toBe(200);
    });

    it("allows GET /sse past auth when valid API key is supplied", async () => {
      const sseRes = await worker.fetch(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: {
            Accept: "text/plain",
            Authorization: "Bearer super-secret-worker-key",
          },
        }),
        env,
        mockCtx
      );
      expect(sseRes.status).toBe(400);
    });

    it("keeps /health and /openapi.json publicly accessible", async () => {
      const healthRes = await worker.fetch(
        new Request("https://worker.example/health"),
        env,
        mockCtx
      );
      expect(healthRes.status).toBe(200);

      const openapiRes = await worker.fetch(
        new Request("https://worker.example/openapi.json"),
        env,
        mockCtx
      );
      expect(openapiRes.status).toBe(200);
    });
  });

  describe("Demo mode without MCP_API_KEY", () => {
    it("allows POST /mcp tools/list when MCP_API_KEY is unset", async () => {
      const res = await worker.fetch(makeMcpListRequest(), {}, mockCtx);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        result?: { tools?: unknown[] };
      };
      expect(Array.isArray(body.result?.tools)).toBe(true);
    });
  });

  describe("OAuth fail-closed & Open Redirect protection", () => {
    it("returns 401 on /oauth/authorize without key when MCP_API_KEY is set and 501 without Location when authorized or in demo mode", async () => {
      const guardedEnv: Env = { MCP_API_KEY: "super-secret-worker-key" };

      const unauth = await worker.fetch(
        new Request(
          "https://worker.example/oauth/authorize?client_id=x&redirect_uri=https://evil.example/cb&state=1"
        ),
        guardedEnv,
        mockCtx
      );
      expect(unauth.status).toBe(401);
      expect(unauth.headers.get("Location")).toBeNull();

      for (const env of [guardedEnv, {}] as Env[]) {
        const headers: Record<string, string> = env.MCP_API_KEY
          ? { Authorization: `Bearer ${env.MCP_API_KEY}` }
          : {};

        for (const uri of [
          "https://evil.example/cb",
          "javascript:alert(1)",
          "not-a-url",
        ]) {
          const res = await worker.fetch(
            new Request(
              `https://worker.example/oauth/authorize?client_id=x&redirect_uri=${encodeURIComponent(uri)}&state=1`,
              { headers }
            ),
            env,
            mockCtx
          );
          expect(res.status).toBe(501);
          expect(res.status).not.toBe(302);
          expect(res.headers.get("Location")).toBeNull();
          expect(res.headers.get("Cache-Control")).toBe("no-store");
        }
      }
    });

    it("returns 501 without issuing tokens on /oauth/token, /oauth/register, /oauth/userinfo, and discovery/JWKS", async () => {
      const tokenRes = await worker.fetch(
        new Request("https://worker.example/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=authorization_code&code=forged",
        }),
        {},
        mockCtx
      );
      expect(tokenRes.status).toBe(501);
      expect(tokenRes.headers.get("Cache-Control")).toBe("no-store");
      const tokenJson = (await tokenRes.json()) as Record<string, unknown>;
      expect(tokenJson.error).toBe("oauth_not_supported");
      expect(tokenJson.access_token).toBeUndefined();
      expect(tokenJson.id_token).toBeUndefined();

      const registerRes = await worker.fetch(
        new Request("https://worker.example/oauth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redirect_uris: ["https://evil.example/cb"] }),
        }),
        {},
        mockCtx
      );
      expect(registerRes.status).toBe(501);
      expect(registerRes.headers.get("Cache-Control")).toBe("no-store");

      const userInfoRes = await worker.fetch(
        new Request("https://worker.example/oauth/userinfo"),
        {},
        mockCtx
      );
      expect(userInfoRes.status).toBe(501);
      expect(userInfoRes.headers.get("Cache-Control")).toBe("no-store");

      const discoveryRes = await worker.fetch(
        new Request("https://worker.example/.well-known/oauth-authorization-server"),
        { MCP_API_KEY: "super-secret-worker-key" },
        mockCtx
      );
      expect(discoveryRes.status).toBe(501);
      expect(discoveryRes.headers.get("Cache-Control")).toBe("no-store");

      const jwksRes = await worker.fetch(
        new Request("https://worker.example/.well-known/jwks.json"),
        { MCP_API_KEY: "super-secret-worker-key" },
        mockCtx
      );
      expect(jwksRes.status).toBe(501);
      expect(jwksRes.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("CORS hardening", () => {
    it("parses allowed origins safely and ignores wildcard or invalid URLs", () => {
      expect(
        parseAllowedOrigins("https://trusted.example, *, ftp://bad.example, not-a-url, https://app.example/path")
      ).toEqual(["https://trusted.example", "https://app.example"]);
    });

    it("omits Access-Control-Allow-Origin and blocks preflight when MCP_API_KEY is set without MCP_ALLOWED_ORIGINS", async () => {
      const env: Env = { MCP_API_KEY: "super-secret-worker-key" };

      const unauthRes = await worker.fetch(
        makeMcpListRequest({ Origin: "https://evil.example" }),
        env,
        mockCtx
      );
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(unauthRes.headers.get("Vary")).toBe("Origin");
      expect(unauthRes.headers.get("X-Content-Type-Options")).toBe("nosniff");
      const allowHeaders = unauthRes.headers.get("Access-Control-Allow-Headers") || "";
      expect(allowHeaders).toContain("Authorization");
      expect(allowHeaders).toContain("X-API-Key");

      const authRes = await worker.fetch(
        makeMcpListRequest({
          Origin: "https://evil.example",
          Authorization: "Bearer super-secret-worker-key",
        }),
        env,
        mockCtx
      );
      expect(authRes.status).toBe(200);
      expect(authRes.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(authRes.headers.get("Vary")).toBe("Origin");
      expect(authRes.headers.get("X-Content-Type-Options")).toBe("nosniff");

      const preflight = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "OPTIONS",
          headers: { Origin: "https://evil.example" },
        }),
        env,
        mockCtx
      );
      expect(preflight.status).toBe(403);
      expect(preflight.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("reflects exact allowlisted origins and blocks untrusted origins when MCP_ALLOWED_ORIGINS is configured", async () => {
      const env: Env = {
        MCP_API_KEY: "super-secret-worker-key",
        MCP_ALLOWED_ORIGINS: "https://trusted.example, https://app.example",
      };

      const trustedPreflight = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "OPTIONS",
          headers: { Origin: "https://trusted.example" },
        }),
        env,
        mockCtx
      );
      expect(trustedPreflight.status).toBe(204);
      expect(trustedPreflight.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://trusted.example"
      );
      expect(trustedPreflight.headers.get("Vary")).toBe("Origin");

      const trustedPost = await worker.fetch(
        makeMcpListRequest({
          Origin: "https://trusted.example",
          Authorization: "Bearer super-secret-worker-key",
        }),
        env,
        mockCtx
      );
      expect(trustedPost.status).toBe(200);
      expect(trustedPost.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://trusted.example"
      );
      expect(trustedPost.headers.get("Vary")).toBe("Origin");

      const evilPreflight = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "OPTIONS",
          headers: { Origin: "https://evil.example" },
        }),
        env,
        mockCtx
      );
      expect(evilPreflight.status).toBe(403);
      expect(evilPreflight.headers.get("Access-Control-Allow-Origin")).toBeNull();

      const evilPost = await worker.fetch(
        makeMcpListRequest({
          Origin: "https://evil.example",
          Authorization: "Bearer super-secret-worker-key",
        }),
        env,
        mockCtx
      );
      expect(evilPost.status).toBe(200);
      expect(evilPost.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("ignores wildcard '*' in MCP_ALLOWED_ORIGINS", async () => {
      const env: Env = {
        MCP_API_KEY: "super-secret-worker-key",
        MCP_ALLOWED_ORIGINS: "*",
      };

      const preflight = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "OPTIONS",
          headers: { Origin: "https://evil.example" },
        }),
        env,
        mockCtx
      );
      expect(preflight.status).toBe(403);
      expect(preflight.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("allows wildcard CORS on OPTIONS /mcp in demo mode when MCP_API_KEY and MCP_ALLOWED_ORIGINS are unset", async () => {
      const preflight = await worker.fetch(
        new Request("https://worker.example/mcp", {
          method: "OPTIONS",
          headers: { Origin: "https://demo-client.example" },
        }),
        {},
        mockCtx
      );
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("OpenAPI schema security definitions", () => {
    it("removes OAuth2 and declares ApiKeyAuth and BearerAuth including /mcp and /sse", () => {
      const schema = generateOpenAPISchema("https://worker.example/openapi.json") as {
        security: Array<Record<string, unknown>>;
        components: { securitySchemes: Record<string, unknown> };
        paths: Record<string, Record<string, { security?: Array<Record<string, unknown>> }>>;
      };

      expect(schema.components.securitySchemes.OAuth2).toBeUndefined();
      expect(schema.components.securitySchemes.ApiKeyAuth).toBeDefined();
      expect(schema.components.securitySchemes.BearerAuth).toBeDefined();
      expect(JSON.stringify(schema)).not.toContain("OAuth2");
      expect(schema.paths["/mcp"].post.security?.length).toBeGreaterThan(0);
      expect(schema.paths["/sse"].get.security?.length).toBeGreaterThan(0);
    });
  });
});
