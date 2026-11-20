import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../lib/adapters/cloudflare.js";
import {
  createCliHttpApp,
  createGracefulShutdown,
} from "../../lib/adapters/cli-http.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { KVCache, MemoryCache } from "../../lib/core/cache.js";
import { RateLimiter } from "../../lib/infrastructure/rate-limiter.js";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "../../lib/workers/rate-limit.js";
import { handleSSEEndpoint } from "../../lib/workers/sse.js";

function createMockKV() {
  const store = new Map<string, { value: string; options?: unknown }>();
  return {
    store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
      put: vi.fn(async (key: string, value: string, options?: unknown) => {
        store.set(key, { value, options });
      }),
      delete: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
}

function sendRawHttp(
  port: number,
  options: {
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolvePromise, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method: options.method ?? "POST",
        path: options.path ?? "/messages?sessionId=abc",
        headers: {
          Host: `127.0.0.1:${port}`,
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
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
    if (options.body !== undefined) {
      req.write(options.body);
    }
    req.end();
  });
}

describe("TCK-0020 / FND-0008: Worker SSE lifecycle, KV TTL/rate-limit, RateLimiter & CLI graceful shutdown", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    process.env = { ...originalEnv };
  });

  describe("Worker handleSSEEndpoint lifecycle", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T18:00:00.000Z"));
    });

    it("keeps pingInterval and timeoutHandle alive after setup, emits pings, and closes cleanly on timeout", async () => {
      process.env.MCP_PING_INTERVAL = "100";
      process.env.MCP_SSE_TIMEOUT = "350";

      const waitUntilPromises: Array<Promise<unknown>> = [];
      const ctx = {
        waitUntil: vi.fn((p: Promise<unknown>) => waitUntilPromises.push(p)),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
        }),
        {},
        ctx,
      );

      expect(res.status).toBe(200);
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // Flush initial async writes (`connection` and `init`) and let pingInterval arm
      await vi.advanceTimersByTimeAsync(0);
      const first = await reader.read();
      const second = await reader.read();
      await vi.advanceTimersByTimeAsync(0);
      const initialText =
        decoder.decode(first.value) + decoder.decode(second.value);
      expect(initialText).toContain("event: connection");
      expect(initialText).toContain('"id":"init"');
      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(2);

      // First ping at 100ms (proves `finally` did NOT clear timers prematurely)
      await vi.advanceTimersByTimeAsync(100);
      const ping1 = await reader.read();
      expect(decoder.decode(ping1.value)).toContain("event: ping");

      // Second ping at 200ms
      await vi.advanceTimersByTimeAsync(100);
      const ping2 = await reader.read();
      expect(decoder.decode(ping2.value)).toContain("event: ping");

      // Third ping at 300ms
      await vi.advanceTimersByTimeAsync(100);
      const ping3 = await reader.read();
      expect(decoder.decode(ping3.value)).toContain("event: ping");

      // Connection timeout at 350ms closes stream cleanly and clears all timers
      await vi.advanceTimersByTimeAsync(50);
      const eof = await reader.read();
      expect(eof.done).toBe(true);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);
    });

    it("cleans up timers immediately when request.signal aborts", async () => {
      process.env.MCP_PING_INTERVAL = "100";
      process.env.MCP_SSE_TIMEOUT = "1000";

      const waitUntilPromises: Array<Promise<unknown>> = [];
      const ctx = {
        waitUntil: vi.fn((p: Promise<unknown>) => waitUntilPromises.push(p)),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const controller = new AbortController();
      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
          signal: controller.signal,
        }),
        {},
        ctx,
      );

      const reader = res.body!.getReader();
      await vi.advanceTimersByTimeAsync(0);
      await reader.read();
      await reader.read();
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(2);

      controller.abort();
      await vi.advanceTimersByTimeAsync(0);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);

      await expect(reader.read()).rejects.toThrow("SSE client disconnected");
    });

    it("cleans up timers without unhandled rejection when consumer cancels stream", async () => {
      process.env.MCP_PING_INTERVAL = "100";
      process.env.MCP_SSE_TIMEOUT = "1000";

      const waitUntilPromises: Array<Promise<unknown>> = [];
      const ctx = {
        waitUntil: vi.fn((p: Promise<unknown>) => waitUntilPromises.push(p)),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
        }),
        {},
        ctx,
      );

      const reader = res.body!.getReader();
      await vi.advanceTimersByTimeAsync(0);
      await reader.read();
      await reader.read();

      await reader.cancel("consumer closed");
      await vi.advanceTimersByTimeAsync(0);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);
    });

    it("processes POST /sse JSON-RPC requests and emits -32700 error event on invalid JSON", async () => {
      process.env.MCP_PING_INTERVAL = "500";
      process.env.MCP_SSE_TIMEOUT = "1000";

      const resOk = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "POST",
          headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 42, method: "tools/list" }),
        }),
        {},
      );
      const readerOk = resOk.body!.getReader();
      const decoder = new TextDecoder();
      await vi.advanceTimersByTimeAsync(0);
      let okOutput = "";
      for (let i = 0; i < 3; i++) {
        const chunk = await readerOk.read();
        if (chunk.value) okOutput += decoder.decode(chunk.value);
      }
      expect(okOutput).toContain("id: 42");
      expect(okOutput).toContain("cnpj_lookup");
      await readerOk.cancel();
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(0);

      const resBad = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "POST",
          headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
          body: "{invalid-json",
        }),
        {},
      );
      const readerBad = resBad.body!.getReader();
      await vi.advanceTimersByTimeAsync(0);
      let badOutput = "";
      for (let i = 0; i < 3; i++) {
        const chunk = await readerBad.read();
        if (chunk.value) badOutput += decoder.decode(chunk.value);
      }
      expect(badOutput).toContain("event: error");
      expect(badOutput).toContain("-32700");
      await readerBad.cancel();
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("resolves waitUntil and clears timers on timeout even when consumer reads 0 chunks (backpressure)", async () => {
      process.env.MCP_PING_INTERVAL = "50";
      process.env.MCP_SSE_TIMEOUT = "180";

      const waitUntilPromises: Array<Promise<unknown>> = [];
      let doneSettled = false;
      const ctx = {
        waitUntil: vi.fn((p: Promise<unknown>) => {
          waitUntilPromises.push(p.then(() => { doneSettled = true; }));
        }),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
        }),
        {},
        ctx,
      );

      // Attach reader without reading a single chunk (stalled consumer)
      const reader = res.body!.getReader();
      await vi.advanceTimersByTimeAsync(180);
      await Promise.resolve();
      expect(doneSettled).toBe(true);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);

      // Draining later yields buffered chunks followed by clean EOF
      let sawConnection = false;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (new TextDecoder().decode(chunk.value).includes("event: connection")) {
          sawConnection = true;
        }
      }
      expect(sawConnection).toBe(true);
    });

    it("drops excess pings without error spam on stalled partial reader and settles waitUntil on timeout", async () => {
      process.env.MCP_PING_INTERVAL = "10";
      process.env.MCP_SSE_TIMEOUT = "300";

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const waitUntilPromises: Array<Promise<unknown>> = [];
      let doneSettled = false;
      const ctx = {
        waitUntil: vi.fn((p: Promise<unknown>) => {
          waitUntilPromises.push(p.then(() => { doneSettled = true; }));
        }),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
        }),
        {},
        ctx,
      );

      // Read only 1 chunk (`connection`) then stall while 25+ ping intervals fire
      const reader = res.body!.getReader();
      await reader.read();

      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
      expect(doneSettled).toBe(true);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);
      const errorLevelLogs = errorSpy.mock.calls.filter((call) => {
        const msg = String(call[0] ?? "");
        return msg.includes('"level":"error"') || msg.includes("SSE write error") || msg.includes("enqueue");
      });
      expect(errorLevelLogs).toHaveLength(0);

      let count = 0;
      while (!(await reader.read()).done) {
        count += 1;
      }
      // Bounded by highWaterMark (16) + 1 init frame
      expect(count).toBeLessThanOrEqual(17);
    });

    it("resolves waitUntil and clears timers immediately when request.signal aborts with stalled 0-read consumer", async () => {
      process.env.MCP_PING_INTERVAL = "50";
      process.env.MCP_SSE_TIMEOUT = "1000";

      const waitUntilPromises: Array<Promise<unknown>> = [];
      let doneSettled = false;
      const ctx = {
        waitUntil: vi.fn((p: Promise<unknown>) => {
          waitUntilPromises.push(p.then(() => { doneSettled = true; }));
        }),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const controller = new AbortController();
      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
          signal: controller.signal,
        }),
        {},
        ctx,
      );

      const reader = res.body!.getReader();
      // Abort before any read occurs
      controller.abort();
      await Promise.resolve();
      expect(doneSettled).toBe(true);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);

      await expect(reader.read()).rejects.toThrow("SSE client disconnected");
    });

    it("handles pre-aborted request.signal cleanly with 200 status and immediate timer-free settlement", async () => {
      const waitUntilPromises: Array<Promise<unknown>> = [];
      let doneSettled = false;
      const ctx = {
        waitUntil: vi.fn((p: Promise<unknown>) => {
          waitUntilPromises.push(p.then(() => { doneSettled = true; }));
        }),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const controller = new AbortController();
      controller.abort();

      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
          signal: controller.signal,
        }),
        {},
        ctx,
      );

      expect(res.status).toBe(200);
      await Promise.resolve();
      expect(doneSettled).toBe(true);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);

      const reader = res.body!.getReader();
      await expect(reader.read()).rejects.toThrow("SSE client disconnected");
    });
  });

  describe("KVCache TTL & corrupted payload guard", () => {
    it("enforces Cloudflare KV minimum expirationTtl >= 60s, propagates longer TTLs, and guards NaN TTL", async () => {
      const { kv, store } = createMockKV();

      const shortCache = new KVCache(kv, 5_000);
      await shortCache.set("short-key", { ok: true });
      expect(kv.put).toHaveBeenCalledWith(
        "short-key",
        expect.any(String),
        { expirationTtl: 60 },
      );

      const longCache = new KVCache(kv, 300_000);
      await longCache.set("long-key", { ok: true });
      expect(kv.put).toHaveBeenCalledWith(
        "long-key",
        expect.any(String),
        { expirationTtl: 300 },
      );

      const nanCache = new KVCache(kv, Number.NaN);
      await nanCache.set("nan-key", { recovered: true });
      expect(kv.put).toHaveBeenCalledWith(
        "nan-key",
        expect.any(String),
        { expirationTtl: 60 },
      );
      const storedNan = JSON.parse(store.get("nan-key")!.value) as { expires: unknown };
      expect(typeof storedNan.expires).toBe("number");
      expect(storedNan.expires).toBeGreaterThan(Date.now());
      await expect(nanCache.get("nan-key")).resolves.toEqual({ recovered: true });
    });

    it("returns null safely when stored KV value is corrupted JSON", async () => {
      const { kv, store } = createMockKV();
      store.set("bad-key", { value: "{corrupted-json" });

      const cache = new KVCache(kv, 60_000);
      await expect(cache.get("bad-key")).resolves.toBeNull();
    });
  });

  describe("Worker checkRateLimit KV TTL, fixed-window buckets & header trust", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T18:00:00.000Z"));
    });

    it("ignores spoofed X-Forwarded-For by default and uses fixed-window bucket with expirationTtl", async () => {
      const { kv, store } = createMockKV();
      const env: Env = { MCP_KV: kv };

      // 30 requests with changing spoofed X-Forwarded-For headers must share "unknown" bucket
      for (let i = 0; i < 30; i++) {
        const res = await checkRateLimit(
          new Request("https://worker.example/mcp", {
            method: "POST",
            headers: { "X-Forwarded-For": `198.51.100.${i + 1}` },
          }),
          env,
        );
        expect(res.allowed).toBe(true);
      }

      // 31st request with a fresh spoofed X-Forwarded-For must still be blocked
      const blocked = await checkRateLimit(
        new Request("https://worker.example/mcp", {
          method: "POST",
          headers: { "X-Forwarded-For": "203.0.113.99" },
        }),
        env,
      );
      expect(blocked.allowed).toBe(false);
      expect(blocked.error?.status).toBe(429);
      expect(Number(blocked.error?.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);

      const bucketKey = Array.from(store.keys())[0];
      expect(bucketKey).toMatch(/^rate_limit:unknown:\d+$/);
      expect(store.get(bucketKey)?.options).toEqual({ expirationTtl: 120 });
    });

    it("prefers CF-Connecting-IP and honors X-Forwarded-For only when MCP_TRUST_X_FORWARDED_FOR is true", () => {
      const reqBoth = new Request("https://worker.example/mcp", {
        headers: {
          "CF-Connecting-IP": "203.0.113.10",
          "X-Forwarded-For": "198.51.100.20, 10.0.0.1",
        },
      });
      expect(extractClientIdentifier(reqBoth, {})).toBe("203.0.113.10");

      const reqXffOnly = new Request("https://worker.example/mcp", {
        headers: { "X-Forwarded-For": "198.51.100.20, 10.0.0.1" },
      });
      expect(extractClientIdentifier(reqXffOnly, {})).toBe("unknown");
      expect(
        extractClientIdentifier(reqXffOnly, { MCP_TRUST_X_FORWARDED_FOR: "true" }),
      ).toBe("198.51.100.20");

      const reqMalformed = new Request("https://worker.example/mcp", {
        headers: { "CF-Connecting-IP": "bad ip/value\n" },
      });
      expect(extractClientIdentifier(reqMalformed, {})).toBe("unknown");
    });

    it("reads TIMEOUTS.RATE_LIMIT_WINDOW_MS dynamically and recovers from corrupted KV bucket JSON", async () => {
      process.env.MCP_RATE_LIMIT_WINDOW = "45000";
      const { kv, store } = createMockKV();
      const env: Env = { MCP_KV: kv };

      const bucket0 = Math.floor(Date.now() / 45_000);
      store.set(`rate_limit:203.0.113.5:${bucket0}`, { value: "{corrupted" });

      const r1 = await checkRateLimit(
        new Request("https://worker.example/mcp", {
          headers: { "CF-Connecting-IP": "203.0.113.5" },
        }),
        env,
      );
      expect(r1.allowed).toBe(true);
      expect(store.get(`rate_limit:203.0.113.5:${bucket0}`)?.options).toEqual({
        expirationTtl: 90,
      });

      // Advancing past 45s rolls over to next fixed window bucket cleanly
      vi.advanceTimersByTime(45_000);
      const r2 = await checkRateLimit(
        new Request("https://worker.example/mcp", {
          headers: { "CF-Connecting-IP": "203.0.113.5" },
        }),
        env,
      );
      expect(r2.allowed).toBe(true);
      const bucket1 = Math.floor(Date.now() / 45_000);
      expect(bucket1).toBe(bucket0 + 1);
      expect(store.has(`rate_limit:203.0.113.5:${bucket1}`)).toBe(true);
    });
  });

  describe("RateLimiter timer lifecycle", () => {
    it("unrefs cleanup interval and supports idempotent dispose()/destroy() cleanup", () => {
      const unrefSpy = vi.fn();
      const fakeHandle = { unref: unrefSpy } as unknown as ReturnType<typeof setInterval>;
      const setIntervalSpy = vi
        .spyOn(globalThis, "setInterval")
        .mockReturnValue(fakeHandle);
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(unrefSpy).toHaveBeenCalledTimes(1);

      limiter.checkLimit("client-a");
      expect(limiter.getStats().activeClients).toBe(1);

      limiter.dispose();
      limiter.dispose(); // idempotent second call
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(clearIntervalSpy).toHaveBeenCalledWith(fakeHandle);
      expect(limiter.getStats().activeClients).toBe(0);

      const noTimerLimiter = new RateLimiter({
        windowMs: 60_000,
        maxRequests: 5,
        enableCleanupTimer: false,
      });
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      noTimerLimiter.destroy();
    });
  });

  describe("CLI graceful shutdown & HTTP security middleware ordering", () => {
    const activeServers: http.Server[] = [];

    afterEach(async () => {
      while (activeServers.length > 0) {
        const srv = activeServers.pop()!;
        if (srv.listening) {
          await new Promise<void>((r) => srv.close(() => r()));
        }
      }
    });

    it("drains SSE sessions, closes listening http.Server, MCP server and cache idempotently", async () => {
      const apiConfig = resolveApiConfig();
      const cache = new MemoryCache(10, 60_000);
      const httpContext = createCliHttpApp({
        apiConfig,
        cache,
        host: "127.0.0.1",
      });

      const sessionClose = vi.fn();
      httpContext.transports.set("sse-1", {
        transport: { close: sessionClose } as never,
        createdAt: new Date(),
        lastActivity: new Date(),
      });

      const server = http.createServer(httpContext.app);
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
      activeServers.push(server);

      const mcpClose = vi.fn(async () => {});
      const cacheClear = vi.spyOn(cache, "clear");
      const onExit = vi.fn();

      const shutdown = createGracefulShutdown({
        server,
        httpContext,
        mcpServer: { close: mcpClose },
        cache,
        timeoutMs: 2_000,
        onExit,
      });

      await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);

      expect(sessionClose).toHaveBeenCalledTimes(1);
      expect(httpContext.transports.size).toBe(0);
      expect(server.listening).toBe(false);
      expect(mcpClose).toHaveBeenCalledTimes(1);
      expect(cacheClear).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledWith(0);
    });

    it("rejects disallowed Host/Origin before JSON parsing and emits defensive headers on 400 invalid JSON", async () => {
      const apiConfig = resolveApiConfig();
      const cache = new MemoryCache(10, 60_000);
      const httpContext = createCliHttpApp({
        apiConfig,
        cache,
        host: "127.0.0.1",
      });
      const server = http.createServer(httpContext.app);
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
      activeServers.push(server);
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        throw new Error("Unexpected server address");
      }

      try {
        // Malformed JSON paired with bad Host must return 403 (Host checked BEFORE JSON parse)
        const badHostRes = await sendRawHttp(addr.port, {
          method: "POST",
          path: "/messages?sessionId=abc",
          headers: {
            Host: "evil.com",
            "Content-Type": "application/json",
          },
          body: "{not-json",
        });
        expect(badHostRes.status).toBe(403);
        expect(badHostRes.headers["x-content-type-options"]).toBe("nosniff");
        expect(badHostRes.headers["x-frame-options"]).toBe("DENY");

        // Malformed JSON paired with valid Host must return 400 JSON with defensive headers
        const badJsonRes = await sendRawHttp(addr.port, {
          method: "POST",
          path: "/messages?sessionId=abc",
          headers: {
            Host: `127.0.0.1:${addr.port}`,
            "Content-Type": "application/json",
          },
          body: "{not-json",
        });
        expect(badJsonRes.status).toBe(400);
        expect(badJsonRes.headers["x-content-type-options"]).toBe("nosniff");
        expect(badJsonRes.headers["x-frame-options"]).toBe("DENY");
        expect(badJsonRes.headers["content-security-policy"]).toBe(
          "default-src 'none'; frame-ancestors 'none'",
        );
        expect(badJsonRes.headers["referrer-policy"]).toBe("no-referrer");
        expect(JSON.parse(badJsonRes.body)).toMatchObject({
          error: "Bad Request",
        });
      } finally {
        httpContext.closeAll();
      }
    });
  });
});
