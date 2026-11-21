import { readFileSync } from "node:fs";
import http from "node:http";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryCache } from "../../lib/core/cache.js";
import { loadServerConfiguration, resolveApiConfig } from "../../lib/config/index.js";
import {
  createCliHttpApp,
  type CliHttpContext,
  type CliHttpOptions,
  isAllowedCliHost,
  isAllowedCliOrigin,
  isLoopbackHost,
  isValidApiKey,
  isValidSessionId,
  normalizeHostHeader,
} from "../../lib/adapters/cli-http.js";

interface HttpTestResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function sendRawHttpRequest(
  port: number,
  options: {
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<HttpTestResponse> {
  return new Promise((resolvePromise, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method: options.method ?? "GET",
        path: options.path ?? "/messages",
        headers: {
          Host: `127.0.0.1:${port}`,
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolvePromise({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

describe("TCK-0015 / FND-0003: CLI HTTP/SSE hardening & Cloudflare deploy workflow", () => {
  const originalEnv = { ...process.env };
  const activeServers: Array<{ server: http.Server; ctx: CliHttpContext }> = [];

  async function startTestServer(overrides: Partial<CliHttpOptions> = {}) {
    const apiConfig = resolveApiConfig();
    const cache = new MemoryCache(50, 60_000);
    const ctx = createCliHttpApp({
      apiConfig,
      cache,
      host: "127.0.0.1",
      ...overrides,
    });
    const server = http.createServer(ctx.app);
    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", () => resolvePromise());
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      throw new Error("Unexpected server address");
    }
    activeServers.push({ server, ctx });
    return { port: addr.port, ctx, server };
  }

  afterEach(async () => {
    while (activeServers.length > 0) {
      const entry = activeServers.pop()!;
      entry.ctx.closeAll();
      await new Promise<void>((resolvePromise) => {
        entry.server.close(() => resolvePromise());
      });
    }
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("defaults loadServerConfiguration().httpHost to 127.0.0.1 and honors MCP_HTTP_HOST override", () => {
    delete process.env.MCP_HTTP_HOST;
    expect(loadServerConfiguration().httpHost).toBe("127.0.0.1");

    process.env.MCP_HTTP_HOST = "  ::1  ";
    expect(loadServerConfiguration().httpHost).toBe("::1");
  });

  it("sets defensive headers, disables x-powered-by, and never emits Access-Control-Allow-Origin: *", async () => {
    const { port } = await startTestServer();
    const res = await sendRawHttpRequest(port, {
      method: "POST",
      path: "/messages",
      headers: {
        Host: `127.0.0.1:${port}`,
        Origin: "http://localhost:6274",
      },
    });

    expect(res.status).toBe(400);
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:6274");
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
    expect(res.headers["vary"]).toBe("Origin");
  });

  it("blocks DNS rebinding via spoofed Host headers while allowing loopback and explicit bindHost", async () => {
    expect(normalizeHostHeader("localhost:3000")).toBe("localhost");
    expect(normalizeHostHeader("[::1]:8080")).toBe("::1");
    expect(normalizeHostHeader("evil.com/path")).toBeNull();
    expect(isAllowedCliHost(undefined, "127.0.0.1")).toBe(false);
    expect(isAllowedCliHost("evil.com", "0.0.0.0")).toBe(false);

    const { port } = await startTestServer();

    for (const badHost of ["evil.com", "127.0.0.1.evil.com", "localhost.attacker.test", "127.0.0.1:99999"]) {
      const blocked = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=abc",
        headers: { Host: badHost },
      });
      expect(blocked.status).toBe(403);
    }

    for (const goodHost of [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]) {
      const allowed = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=nonexistent",
        headers: { Host: goodHost },
      });
      expect(allowed.status).toBe(404);
    }
  });

  it("enforces strict Origin/CORS checks without wildcard for local and explicit allowlists", async () => {
    expect(isAllowedCliOrigin("http://localhost:6274")).toEqual({
      allowed: true,
      allowOriginHeader: "http://localhost:6274",
    });
    expect(isAllowedCliOrigin("http://localhost.evil.com")).toEqual({ allowed: false });
    expect(isAllowedCliOrigin("null")).toEqual({ allowed: false });
    expect(isAllowedCliOrigin("*", ["*"])).toEqual({ allowed: false });
    expect(isAllowedCliOrigin("http://localhost:6274", ["*"])).toEqual({ allowed: false });

    const { port } = await startTestServer();

    for (const badOrigin of ["https://evil.com", "http://localhost.evil.com", "null"]) {
      const postRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=abc",
        headers: { Origin: badOrigin },
      });
      expect(postRes.status).toBe(403);
      expect(postRes.headers["access-control-allow-origin"]).toBeUndefined();

      const preflightRes = await sendRawHttpRequest(port, {
        method: "OPTIONS",
        path: "/mcp",
        headers: { Origin: badOrigin },
      });
      expect(preflightRes.status).toBe(403);
      expect(preflightRes.headers["access-control-allow-origin"]).toBeUndefined();
    }

    const okPreflight = await sendRawHttpRequest(port, {
      method: "OPTIONS",
      path: "/mcp",
      headers: { Origin: "http://localhost:6274" },
    });
    expect(okPreflight.status).toBe(204);
    expect(okPreflight.headers["access-control-allow-origin"]).toBe("http://localhost:6274");
    expect(okPreflight.headers["vary"]).toBe("Origin");

    const explicitServer = await startTestServer({
      allowedOrigins: ["*", "https://trusted.example"],
    });
    const trustedRes = await sendRawHttpRequest(explicitServer.port, {
      method: "OPTIONS",
      path: "/mcp",
      headers: { Origin: "https://trusted.example" },
    });
    expect(trustedRes.status).toBe(204);
    expect(trustedRes.headers["access-control-allow-origin"]).toBe("https://trusted.example");

    const rejectedLoopback = await sendRawHttpRequest(explicitServer.port, {
      method: "OPTIONS",
      path: "/mcp",
      headers: { Origin: "http://localhost:6274" },
    });
    expect(rejectedLoopback.status).toBe(403);
    expect(rejectedLoopback.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("uses Map for transports (immune to prototype keys) and validates sessionId", async () => {
    expect(isValidSessionId("valid-session_123")).toBe(true);
    expect(isValidSessionId("../etc")).toBe(false);
    expect(isValidSessionId(["a", "b"])).toBe(false);

    const { port, ctx } = await startTestServer();
    expect(ctx.transports).toBeInstanceOf(Map);

    for (const protoKey of ["toString", "constructor", "__proto__", "valueOf", "hasOwnProperty"]) {
      const res = await sendRawHttpRequest(port, {
        method: "POST",
        path: `/messages?sessionId=${encodeURIComponent(protoKey)}`,
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(res.status).toBe(404);
    }

    for (const badQuery of [
      "/messages",
      "/messages?sessionId=a&sessionId=b",
      "/messages?sessionId=../etc/passwd",
      "/messages?sessionId=bad.session!",
    ]) {
      const res = await sendRawHttpRequest(port, {
        method: "POST",
        path: badQuery,
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(res.status).toBe(400);
    }
  });

  it("returns 503 when active SSE sessions reach maxSessions cap", async () => {
    const { port, ctx } = await startTestServer({ maxSessions: 2 });
    const mockClose = vi.fn();
    ctx.transports.set("sess-1", {
      transport: { close: mockClose } as never,
      createdAt: new Date(),
      lastActivity: new Date(),
    });
    ctx.transports.set("sess-2", {
      transport: { close: mockClose } as never,
      createdAt: new Date(),
      lastActivity: new Date(),
    });

    const res = await sendRawHttpRequest(port, {
      method: "GET",
      path: "/mcp",
    });
    expect(res.status).toBe(503);
    expect(res.body).toContain("Maximum active SSE sessions reached");
  });

  it("declares least-privilege permissions and persist-credentials: false in cloudflare-deploy.yml", () => {
    const workflowPath = resolve(import.meta.dirname, "../../.github/workflows/cloudflare-deploy.yml");
    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toMatch(/^permissions:\s*\n\s+contents:\s*read\b/m);
    expect(workflow).toMatch(/uses:\s*actions\/checkout@v4\s*\n\s+with:\s*\n\s+persist-credentials:\s*false/);
  });

  describe("TCK-0034 / FND-0019: CLI HTTP/SSE MCP_API_KEY authentication & non-loopback fail-closed", () => {
    it("isLoopbackHost accepts only loopback addresses and rejects non-loopback hosts", () => {
      expect(isLoopbackHost("127.0.0.1")).toBe(true);
      expect(isLoopbackHost("localhost")).toBe(true);
      expect(isLoopbackHost("  LOCALHOST  ")).toBe(true);
      expect(isLoopbackHost("::1")).toBe(true);
      expect(isLoopbackHost("[::1]")).toBe(true);

      expect(isLoopbackHost("0.0.0.0")).toBe(false);
      expect(isLoopbackHost("::")).toBe(false);
      expect(isLoopbackHost("10.0.0.1")).toBe(false);
      expect(isLoopbackHost("example.com")).toBe(false);
      expect(isLoopbackHost("")).toBe(false);
      expect(isLoopbackHost(undefined as unknown as string)).toBe(false);
    });

    it("isValidApiKey matches identical keys and rejects mismatches, different lengths, and empty keys", () => {
      expect(isValidApiKey("secret-key-123", "secret-key-123")).toBe(true);
      expect(isValidApiKey("secret-key-123", "secret-key-124")).toBe(false);
      expect(isValidApiKey("short", "much-longer-secret-key")).toBe(false);
      expect(isValidApiKey("much-longer-secret-key", "short")).toBe(false);
      expect(isValidApiKey("", "secret-key-123")).toBe(false);
      expect(isValidApiKey("secret-key-123", "")).toBe(false);
      expect(isValidApiKey("", "")).toBe(false);
    });

    it("fails closed when createCliHttpApp is configured on a non-loopback host without apiKey", () => {
      const apiConfig = resolveApiConfig();
      const cache = new MemoryCache(10, 60_000);

      for (const nonLoopback of ["0.0.0.0", "::", "10.0.0.5", ""]) {
        expect(() =>
          createCliHttpApp({
            apiConfig,
            cache,
            host: nonLoopback,
          }),
        ).toThrow(/Refusing to start HTTP\/SSE server on non-loopback host/);

        expect(() =>
          createCliHttpApp({
            apiConfig,
            cache,
            host: nonLoopback,
            apiKey: "   ",
          }),
        ).toThrow(/Refusing to start HTTP\/SSE server on non-loopback host/);
      }
    });

    it("enforces Bearer / X-API-Key auth on non-loopback host, keeps CORS preflight open, and never logs raw secrets", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { port } = await startTestServer({
        host: "0.0.0.0",
        apiKey: "  super-secret-cli-key  ",
      });

      // CORS preflight OPTIONS must succeed (204) and advertise X-API-Key in Access-Control-Allow-Headers
      const preflight = await sendRawHttpRequest(port, {
        method: "OPTIONS",
        path: "/mcp",
        headers: { Origin: "http://localhost:6274" },
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers["access-control-allow-headers"]).toBe(
        "Content-Type, Authorization, X-API-Key",
      );

      // Missing credentials -> 401 + WWW-Authenticate: Bearer
      const missingRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(missingRes.status).toBe(401);
      expect(missingRes.headers["www-authenticate"]).toBe("Bearer");
      expect(JSON.parse(missingRes.body)).toEqual({
        error: "Unauthorized",
        message: "Valid API key required",
      });

      // Empty Bearer / non-Bearer / conflicting headers -> 401
      const emptyBearerRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: { Authorization: "Bearer   " },
      });
      expect(emptyBearerRes.status).toBe(401);

      const basicAuthRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });
      expect(basicAuthRes.status).toBe(401);

      const wrongBearerWithValidApiKeyRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: {
          Authorization: "Bearer wrong-secret-attempt-999",
          "X-API-Key": "super-secret-cli-key",
        },
      });
      expect(wrongBearerWithValidApiKeyRes.status).toBe(401);

      // Wrong Bearer token -> 401
      const wrongToken = "wrong-secret-attempt-999";
      const wrongBearerRes = await sendRawHttpRequest(port, {
        method: "GET",
        path: "/mcp",
        headers: { Authorization: `Bearer ${wrongToken}` },
      });
      expect(wrongBearerRes.status).toBe(401);
      expect(wrongBearerRes.headers["www-authenticate"]).toBe("Bearer");

      // Wrong X-API-Key -> 401
      const wrongApiKeyRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: { "X-API-Key": wrongToken },
      });
      expect(wrongApiKeyRes.status).toBe(401);
      expect(wrongApiKeyRes.headers["www-authenticate"]).toBe("Bearer");

      // Duplicate X-API-Key headers -> 401
      const duplicateHeaderRes = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=missing",
        headers: {
          "X-API-Key": ["super-secret-cli-key", "super-secret-cli-key"] as unknown as string,
        },
      });
      expect(duplicateHeaderRes.status).toBe(401);

      // Verify auth.unauthorized was logged without raw token, expected secret, or raw IP
      const loggedLines = errSpy.mock.calls.map((args) => args.join(" ")).join("\n");
      expect(loggedLines).toContain("auth.unauthorized");
      expect(loggedLines).not.toContain("super-secret-cli-key");
      expect(loggedLines).not.toContain(wrongToken);
      expect(loggedLines).not.toContain("127.0.0.1");

      // Valid Authorization: Bearer (case-insensitive scheme) succeeds past auth middleware
      const validBearerPost = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=nonexistent",
        headers: {
          Authorization: "bearer super-secret-cli-key",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      expect(validBearerPost.status).toBe(404);

      // Valid X-API-Key succeeds past auth middleware (verify on GET /mcp hitting maxSessions 503)
      const { port: cappedPort, ctx: cappedCtx } = await startTestServer({
        host: "0.0.0.0",
        apiKey: "super-secret-cli-key",
        maxSessions: 1,
      });
      cappedCtx.transports.set("full", {
        transport: { close: vi.fn() } as never,
        createdAt: new Date(),
        lastActivity: new Date(),
      });

      const validHeaderGet = await sendRawHttpRequest(cappedPort, {
        method: "GET",
        path: "/mcp",
        headers: { "X-API-Key": "super-secret-cli-key" },
      });
      expect(validHeaderGet.status).toBe(503);

      const validHeaderPost = await sendRawHttpRequest(port, {
        method: "POST",
        path: "/messages?sessionId=nonexistent",
        headers: {
          "X-API-Key": "super-secret-cli-key",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      expect(validHeaderPost.status).toBe(404);
    });

    it("enforces auth on loopback when apiKey is set and preserves open local access when omitted", async () => {
      const protectedLoopback = await startTestServer({
        host: "127.0.0.1",
        apiKey: "loopback-secret",
      });

      const unauthLoopback = await sendRawHttpRequest(protectedLoopback.port, {
        method: "POST",
        path: "/messages?sessionId=nonexistent",
      });
      expect(unauthLoopback.status).toBe(401);
      expect(unauthLoopback.headers["www-authenticate"]).toBe("Bearer");

      const authLoopback = await sendRawHttpRequest(protectedLoopback.port, {
        method: "POST",
        path: "/messages?sessionId=nonexistent",
        headers: { Authorization: "Bearer loopback-secret" },
      });
      expect(authLoopback.status).toBe(404);

      const openLoopback = await startTestServer({ host: "127.0.0.1" });
      const openRes = await sendRawHttpRequest(openLoopback.port, {
        method: "POST",
        path: "/messages?sessionId=nonexistent",
      });
      expect(openRes.status).toBe(404);
    });
  });
});
