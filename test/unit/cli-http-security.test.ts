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
});
