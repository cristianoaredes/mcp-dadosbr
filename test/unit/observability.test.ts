import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { MemoryCache } from "../../lib/core/cache.js";
import { createMCPServer } from "../../lib/core/mcp-server.js";
import {
  executeTool,
  getMetrics,
  getToolMetrics,
  resetMetrics,
} from "../../lib/core/tools.js";
import { resetCircuitBreakers } from "../../lib/core/http-client.js";
import { createLogger, Logger, LogLevel } from "../../lib/infrastructure/logger.js";
import {
  extractRequestId,
  generateRequestId,
  REQUEST_ID_HEADER,
  RequestContext,
} from "../../lib/infrastructure/tracing.js";
import { createCliHttpApp, type CliHttpContext } from "../../lib/adapters/cli-http.js";
import { handleHealthCheck, type Env } from "../../lib/adapters/cloudflare.js";
import { authenticateRequest } from "../../lib/workers/auth.js";
import { handleSSEEndpoint } from "../../lib/workers/sse.js";
import worker from "../../lib/workers/worker.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("FND-0013 / TCK-0025: Observability (Logger, Tracing, RED Metrics, Auth Audit & Health)", () => {
  const apiConfig = resolveApiConfig();
  const originalEnv = { ...process.env };
  const activeServers: Array<{ server: http.Server; ctx: CliHttpContext }> = [];

  beforeEach(() => {
    resetMetrics();
    resetCircuitBreakers();
    delete process.env.LOG_LEVEL;
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    while (activeServers.length > 0) {
      const entry = activeServers.pop()!;
      entry.ctx.closeAll();
      await new Promise<void>((resolve) => {
        if (!entry.server.listening) {
          resolve();
          return;
        }
        entry.server.close(() => resolve());
      });
    }
    process.env = { ...originalEnv };
    resetMetrics();
    resetCircuitBreakers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Logger (stderr-only & Worker-safe)", () => {
    it("emits all log levels strictly via console.error (zero stdout console.log)", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const modLogger = createLogger("obs-test", LogLevel.DEBUG);
      expect(modLogger.getLevel()).toBe(LogLevel.DEBUG);
      modLogger.debug("debug-msg", { step: 1 }, "req-1");
      modLogger.info("info-msg", { step: 2 }, "req-1");
      modLogger.warn("warn-msg", { step: 3 }, "req-1");
      modLogger.error("error-msg", { step: 4 }, "req-1");
      modLogger.legacyLog("legacy-msg");

      expect(logSpy).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalledTimes(5);

      const parsedFirst = JSON.parse(String(errSpy.mock.calls[0][0])) as Record<string, unknown>;
      expect(parsedFirst).toMatchObject({
        level: "debug",
        module: "obs-test",
        message: "debug-msg",
        requestId: "req-1",
        context: { step: 1 },
      });
    });

    it("resolves LOG_LEVEL dynamically, falls back cleanly across NODE_ENV and handles circular context / missing process", () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dynamicLogger = new Logger("dyn");

      process.env.NODE_ENV = "production";
      expect(dynamicLogger.getLevel()).toBe(LogLevel.INFO);

      process.env.NODE_ENV = "development";
      expect(dynamicLogger.getLevel()).toBe(LogLevel.DEBUG);

      process.env.LOG_LEVEL = "warn";
      expect(dynamicLogger.getLevel()).toBe(LogLevel.WARN);
      dynamicLogger.info("filtered-info");
      expect(errSpy).not.toHaveBeenCalled();

      process.env.LOG_LEVEL = "error";
      expect(dynamicLogger.getLevel()).toBe(LogLevel.ERROR);
      dynamicLogger.warn("filtered-warn");
      expect(errSpy).not.toHaveBeenCalled();

      dynamicLogger.setLevel(LogLevel.INFO);
      expect(dynamicLogger.getLevel()).toBe(LogLevel.INFO);

      // Circular reference safety fallback
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      dynamicLogger.info("circular-safe", circular, "req-circ");
      expect(errSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(errSpy.mock.calls[0][0]))).toMatchObject({
        message: "circular-safe",
        requestId: "req-circ",
        contextUnserializable: true,
      });

      // Missing process object simulation (Cloudflare Workers without nodejs_compat process)
      const workerLogger = new Logger("worker-env");
      let workerLevel: LogLevel;
      const savedProcess = globalThis.process;
      try {
        Object.defineProperty(globalThis, "process", {
          value: undefined,
          configurable: true,
          writable: true,
        });
        workerLevel = workerLogger.getLevel();
        workerLogger.info("worker-safe-msg");
      } finally {
        Object.defineProperty(globalThis, "process", {
          value: savedProcess,
          configurable: true,
          writable: true,
        });
      }
      expect(workerLevel).toBe(LogLevel.INFO);
      expect(errSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Tracing & Web Crypto Correlation IDs", () => {
    it("generates CSPRNG requestIds via Web Crypto without Math.random and validates extractRequestId", () => {
      const randomSpy = vi.spyOn(Math, "random");

      const idUuid = generateRequestId();
      expect(idUuid).toMatch(/^req_[0-9a-f-]{36}$/i);
      expect(randomSpy).not.toHaveBeenCalled();

      // Fallback to crypto.getRandomValues when randomUUID is absent
      vi.stubGlobal("crypto", {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = i + 1;
          return arr;
        },
      });
      const idRandomValues = generateRequestId();
      expect(idRandomValues).toBe("req_0102030405060708090a0b0c0d0e0f10");
      expect(randomSpy).not.toHaveBeenCalled();

      // Fail-closed when Web Crypto is missing
      vi.stubGlobal("crypto", undefined);
      expect(() => generateRequestId()).toThrow(/Web Crypto API/i);

      // Header extraction & CRLF / malformed rejection
      expect(extractRequestId(new Headers({ "X-Request-Id": "  trace_abc-123.4:5  " }))).toBe(
        "trace_abc-123.4:5"
      );
      expect(extractRequestId({ "x-request-id": ["arr-id-1", "arr-id-2"] })).toBe("arr-id-1");
      expect(extractRequestId({ "X-REQUEST-ID": "upper-case-header" })).toBe("upper-case-header");
      expect(extractRequestId({ "x-request-id": "bad id with spaces" })).toBeUndefined();
      expect(extractRequestId({ "x-request-id": "bad\r\ninject" })).toBeUndefined();
      expect(extractRequestId({ "x-request-id": "a".repeat(129) })).toBeUndefined();
    });

    it("tracks metadata, elapsed time, and structured logs in RequestContext", () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      process.env.LOG_LEVEL = "debug";
      const ctx = new RequestContext("req-fixed-123");

      ctx.addMetadata("tenant", "public-data");
      expect(ctx.getMetadata("tenant")).toBe("public-data");
      expect(ctx.getAllMetadata()).toEqual({ tenant: "public-data" });
      expect(ctx.getElapsedMs()).toBeGreaterThanOrEqual(0);

      ctx.debug("trace-debug", { op: "d" });
      ctx.info("trace-info", { op: "i" });
      ctx.warn("trace-warn", { op: "w" });
      ctx.error("trace-error", { op: "e" });

      expect(errSpy).toHaveBeenCalledTimes(4);
      const last = JSON.parse(String(errSpy.mock.calls[3][0])) as Record<string, unknown>;
      expect(last).toMatchObject({
        level: "error",
        module: "tracing",
        requestId: "req-fixed-123",
        message: "trace-error",
        context: expect.objectContaining({
          tenant: "public-data",
          op: "e",
          elapsedMs: expect.any(Number),
        }),
      });
    });
  });

  describe("Tools RED Metrics, Real cacheHits & Multi-Session Stability", () => {
    it("records real cacheHits, per-tool RED metrics, resets lastMetricsLog, and preserves metrics across createMCPServer sessions", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const cache = new MemoryCache(50, 60_000);
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        jsonResponse({ cnpj: "11222333000181", razao_social: "ACME SA" })
      );

      const missRes = await executeTool("cnpj_lookup", { cnpj: "11222333000181" }, apiConfig, cache, {
        requestId: "req-miss",
      });
      expect(missRes.ok).toBe(true);
      expect(getMetrics().cacheHits).toBe(0);

      const hitRes = await executeTool("cnpj_lookup", { cnpj: "11.222.333/0001-81" }, apiConfig, cache, {
        requestId: "req-hit",
      });
      expect(hitRes.ok).toBe(true);
      expect(getMetrics()).toMatchObject({ requests: 2, cacheHits: 1, errors: 0 });
      expect(getToolMetrics().cnpj_lookup).toMatchObject({
        requests: 2,
        cacheHits: 1,
        errors: 0,
      });

      // Second SSE / MCP session creation MUST NOT wipe accumulated global metrics
      const server2 = createMCPServer({ apiConfig, cache, rateLimit: false });
      const client2 = new Client({ name: "obs-client", version: "1.0.0" });
      const [cT, sT] = InMemoryTransport.createLinkedPair();
      try {
        await server2.connect(sT);
        await client2.connect(cT);
        expect(getMetrics().requests).toBe(2);
        const callRes = await client2.callTool({
          name: "cpf_validate",
          arguments: { cpf: "52998224725" },
        });
        expect(callRes.isError).toBeFalsy();
      } finally {
        await client2.close();
        await server2.close();
      }

      expect(getMetrics().requests).toBe(3);
      expect(getToolMetrics().cpf_validate.requests).toBe(1);

      // resetMetrics() must reset lastMetricsLog so another 100 calls emit [metrics] again
      resetMetrics();
      expect(getMetrics()).toMatchObject({ requests: 0, cacheHits: 0, errors: 0 });
      expect(getToolMetrics()).toEqual({});

      for (let i = 0; i < 100; i++) {
        await executeTool("cpf_validate", { cpf: "52998224725" }, apiConfig);
      }
      resetMetrics();
      errSpy.mockClear();
      for (let i = 0; i < 100; i++) {
        await executeTool("cpf_validate", { cpf: "52998224725" }, apiConfig);
      }
      expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[metrics\] requests=100 /));
    });
  });

  describe("Worker Auth 401 Audit Log, X-Request-Id, Bounded KV Health & SSE Logs", () => {
    it("emits structured 401 audit log with requestId without leaking secrets or query params", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const ctx = {
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;
      const env: Env = {
        MCP_API_KEY: "super-secret-master-key",
        MCP_DISABLE_RATE_LIMIT: "true",
      };

      const badToken = "wrong-token-do-not-log";
      const req = new Request(`https://worker.example/mcp?secretQuery=shouldNotLog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${badToken}`,
          "CF-Connecting-IP": "198.51.100.77",
          [REQUEST_ID_HEADER]: "client-corr-01",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(401);
      expect(res.headers.get(REQUEST_ID_HEADER)).toBe("client-corr-01");

      const combinedLogs = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(combinedLogs).not.toContain(badToken);
      expect(combinedLogs).not.toContain("super-secret-master-key");
      expect(combinedLogs).not.toContain("shouldNotLog");

      const authLogCall = errSpy.mock.calls
        .map((c) => {
          try {
            return JSON.parse(String(c[0])) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .find((entry) => entry?.message === "auth.unauthorized");

      expect(authLogCall).toMatchObject({
        level: "warn",
        module: "worker-auth",
        requestId: "client-corr-01",
        context: {
          event: "auth_failure",
          status: 401,
          method: "POST",
          path: "/mcp",
          reason: "invalid_credentials",
          authHeaderPresent: true,
          apiKeyHeaderPresent: false,
          clientIp: "198.51.100.77",
        },
      });

      // Missing credentials direct authenticateRequest check
      const missingRes = await authenticateRequest(
        new Request("https://worker.example/search", { method: "POST" }),
        env
      );
      expect(missingRes.authenticated).toBe(false);
    });

    it("probes KV in /health with bounded timeout (200 ok / unconfigured, 503 degraded on error or timeout)", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Unconfigured
      const unconfRes = await handleHealthCheck(new Request("https://worker.example/health"), {});
      expect(unconfRes.status).toBe(200);
      expect(await unconfRes.json()).toMatchObject({
        status: "healthy",
        checks: { kv: { status: "unconfigured" } },
      });

      // Healthy KV
      const okKv = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn(),
        delete: vi.fn(),
      } as unknown as KVNamespace;
      const okRes = await handleHealthCheck(new Request("https://worker.example/health"), {
        MCP_CACHE: okKv,
      });
      expect(okRes.status).toBe(200);
      expect(await okRes.json()).toMatchObject({
        status: "healthy",
        checks: { kv: { status: "ok", latencyMs: expect.any(Number) } },
      });

      // Failing KV
      const failKv = {
        get: vi.fn().mockRejectedValue(new Error("KV internal token-xyz failure")),
        put: vi.fn(),
        delete: vi.fn(),
      } as unknown as KVNamespace;
      const failRes = await handleHealthCheck(new Request("https://worker.example/health"), {
        MCP_KV: failKv,
      });
      expect(failRes.status).toBe(503);
      const failBody = (await failRes.json()) as Record<string, unknown>;
      expect(failBody).toMatchObject({
        status: "degraded",
        checks: { kv: { status: "degraded", error: "kv_unavailable" } },
      });
      expect(JSON.stringify(failBody)).not.toContain("token-xyz");
      expect(errSpy).toHaveBeenCalled();

      // Slow KV timing out cleanly
      vi.useFakeTimers();
      const slowKv = {
        get: vi.fn(() => new Promise<string | null>(() => {})),
        put: vi.fn(),
        delete: vi.fn(),
      } as unknown as KVNamespace;
      const timeoutPromise = handleHealthCheck(
        new Request("https://worker.example/health"),
        { MCP_CACHE: slowKv },
        { kvTimeoutMs: 50, requestContext: new RequestContext("req-health-to") }
      );
      await vi.advanceTimersByTimeAsync(50);
      const slowRes = await timeoutPromise;
      expect(slowRes.status).toBe(503);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("propagates sanitized X-Request-Id in CLI HTTP app and avoids console.log on Worker SSE timeout", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // CLI HTTP X-Request-Id echo & invalid injection override
      const ctx = createCliHttpApp({
        apiConfig,
        cache: new MemoryCache(10, 1000),
        host: "127.0.0.1",
      });
      const server = http.createServer(ctx.app);
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
      activeServers.push({ server, ctx });
      const addr = server.address() as { port: number };

      const validResp = await fetch(`http://127.0.0.1:${addr.port}/messages?sessionId=missing`, {
        method: "POST",
        headers: {
          Host: `127.0.0.1:${addr.port}`,
          "Content-Type": "application/json",
          "X-Request-Id": "cli-req-99",
        },
        body: "{}",
      });
      expect(validResp.status).toBe(404);
      expect(validResp.headers.get("x-request-id")).toBe("cli-req-99");

      const badHeaderResp = await fetch(`http://127.0.0.1:${addr.port}/messages`, {
        method: "POST",
        headers: {
          Host: `127.0.0.1:${addr.port}`,
          "Content-Type": "application/json",
          "X-Request-Id": "invalid request id!",
        },
        body: "{}",
      });
      expect(badHeaderResp.status).toBe(400);
      expect(badHeaderResp.headers.get("x-request-id")).toMatch(/^req_/);

      // Worker SSE timeout must log structured stderr info and never console.log
      vi.useFakeTimers();
      process.env.MCP_PING_INTERVAL = "500";
      process.env.MCP_SSE_TIMEOUT = "50";
      const workerCtx = {
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;
      const sseRes = await handleSSEEndpoint(
        new Request("https://worker.example/sse"),
        {},
        workerCtx,
        new RequestContext("req-sse-to")
      );
      const reader = sseRes.body!.getReader();
      await vi.advanceTimersByTimeAsync(60);
      await Promise.resolve();
      await reader.cancel();

      expect(logSpy).not.toHaveBeenCalled();
      const timeoutLog = errSpy.mock.calls
        .map((c) => {
          try {
            return JSON.parse(String(c[0])) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .find((entry) => entry?.message === "sse.connection_timeout");
      expect(timeoutLog).toMatchObject({
        level: "info",
        module: "worker-sse",
        requestId: "req-sse-to",
        context: { reason: "timeout" },
      });
    });
  });
});
