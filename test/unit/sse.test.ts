import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TIMEOUTS } from "../../lib/config/timeouts.js";
import { handleSSEEndpoint } from "../../lib/workers/sse.js";
import { createCliHttpApp, type CliHttpContext } from "../../lib/adapters/cli-http.js";
import { MemoryCache } from "../../lib/core/cache.js";
import { resolveApiConfig } from "../../lib/config/index.js";

describe("SSE Connection Management (lib/workers/sse & lib/adapters/cli-http)", () => {
  const originalEnv = { ...process.env };
  const activeContexts: CliHttpContext[] = [];

  describe("TIMEOUTS Configuration", () => {
    it("should have reasonable SSE connection timeout", () => {
      const timeout = TIMEOUTS.SSE_CONNECTION_MS;

      expect(timeout).toBeLessThanOrEqual(50000);
      expect(timeout).toBeGreaterThan(0);
    });

    it("should have reasonable ping interval", () => {
      const interval = TIMEOUTS.PING_INTERVAL_MS;

      expect(interval).toBe(30000);
      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThan(TIMEOUTS.SSE_CONNECTION_MS);
    });

    it("should allow at least 1 ping before timeout", () => {
      const pingsBeforeTimeout = Math.floor(
        TIMEOUTS.SSE_CONNECTION_MS / TIMEOUTS.PING_INTERVAL_MS,
      );

      expect(pingsBeforeTimeout).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Worker SSE Connection Lifecycle (real handleSSEEndpoint)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T18:00:00.000Z"));
    });

    afterEach(() => {
      while (activeContexts.length > 0) {
        activeContexts.pop()!.closeAll();
      }
      vi.restoreAllMocks();
      vi.useRealTimers();
      process.env = { ...originalEnv };
    });

    it("rejects incompatible Accept header with 400", async () => {
      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        {},
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toContain("text/event-stream");
    });

    it("sends initial connection/init events, emits periodic pings, and closes at SSE_CONNECTION_MS", async () => {
      const decoder = new TextDecoder();
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
      const reader = res.body!.getReader();

      const first = await reader.read();
      const second = await reader.read();
      expect(decoder.decode(first.value)).toContain("event: connection");
      expect(decoder.decode(second.value)).toContain('"id":"init"');

      // Advance to first PING_INTERVAL_MS (30s) -> heartbeat emitted
      await vi.advanceTimersByTimeAsync(TIMEOUTS.PING_INTERVAL_MS);
      const pingChunk = await reader.read();
      expect(decoder.decode(pingChunk.value)).toContain("event: ping");

      // Advance remaining time up to SSE_CONNECTION_MS (50s) -> closed cleanly
      await vi.advanceTimersByTimeAsync(
        TIMEOUTS.SSE_CONNECTION_MS - TIMEOUTS.PING_INTERVAL_MS,
      );
      const eof = await reader.read();
      expect(eof.done).toBe(true);
      await waitUntilPromises[0];
      expect(vi.getTimerCount()).toBe(0);
    });

    it("cleans up all resources on AbortController abort and consumer cancel", async () => {
      const ac = new AbortController();
      const waitUntilAbort: Array<Promise<unknown>> = [];
      const ctxAbort = {
        waitUntil: vi.fn((p: Promise<unknown>) => waitUntilAbort.push(p)),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const res1 = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
          signal: ac.signal,
        }),
        {},
        ctxAbort,
      );
      const reader1 = res1.body!.getReader();
      await reader1.read();
      ac.abort();
      await waitUntilAbort[0];
      expect(vi.getTimerCount()).toBe(0);
      await expect(reader1.read()).rejects.toThrow("SSE client disconnected");

      const waitUntilCancel: Array<Promise<unknown>> = [];
      const ctxCancel = {
        waitUntil: vi.fn((p: Promise<unknown>) => waitUntilCancel.push(p)),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext;

      const res2 = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "GET",
          headers: { Accept: "text/event-stream" },
        }),
        {},
        ctxCancel,
      );
      const reader2 = res2.body!.getReader();
      await reader2.cancel("client disconnect");
      await waitUntilCancel[0];
      expect(vi.getTimerCount()).toBe(0);
    });

    it("handles malformed JSON on POST /sse with -32700 error event", async () => {
      const res = await handleSSEEndpoint(
        new Request("https://worker.example/sse", {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: "{broken-json",
        }),
        {},
      );
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      await vi.advanceTimersByTimeAsync(0);

      let output = "";
      for (let i = 0; i < 3; i++) {
        const chunk = await reader.read();
        if (chunk.value) output += decoder.decode(chunk.value);
      }

      expect(output).toContain("event: error");
      expect(output).toContain("-32700");
      await reader.cancel();
    });
  });

  describe("CLI Session Tracking & Connection Monitoring (real createCliHttpApp)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T18:00:00.000Z"));
    });

    afterEach(() => {
      while (activeContexts.length > 0) {
        activeContexts.pop()!.closeAll();
      }
      vi.restoreAllMocks();
      vi.useRealTimers();
      process.env = { ...originalEnv };
    });

    it("evicts only stale SSE sessions during periodic connectionMonitor ticks while keeping active ones", async () => {
      const ctx = createCliHttpApp({
        apiConfig: resolveApiConfig(),
        cache: new MemoryCache(10, 60_000),
        host: "127.0.0.1",
      });
      activeContexts.push(ctx);

      const activeClose = vi.fn();
      const staleClose = vi.fn();

      ctx.transports.set("active-1", {
        transport: { close: activeClose } as never,
        createdAt: new Date(Date.now() - TIMEOUTS.SSE_CONNECTION_MS / 2),
        lastActivity: new Date(Date.now() - TIMEOUTS.SSE_CONNECTION_MS / 2),
      });
      ctx.transports.set("stale-1", {
        transport: { close: staleClose } as never,
        createdAt: new Date(Date.now() - TIMEOUTS.SSE_CONNECTION_MS - 5000),
        lastActivity: new Date(Date.now() - TIMEOUTS.SSE_CONNECTION_MS - 5000),
      });

      // Keep active-1 fresh halfway through the monitoring window
      await vi.advanceTimersByTimeAsync(TIMEOUTS.PING_INTERVAL_MS / 2);
      ctx.transports.get("active-1")!.lastActivity = new Date();

      await vi.advanceTimersByTimeAsync(TIMEOUTS.PING_INTERVAL_MS / 2);

      expect(staleClose).toHaveBeenCalledTimes(1);
      expect(activeClose).not.toHaveBeenCalled();
      expect(ctx.transports.has("stale-1")).toBe(false);
      expect(ctx.transports.has("active-1")).toBe(true);

      // Closing everything clears active transports and stops monitor/rateLimiter timers
      ctx.closeAll();
      expect(activeClose).toHaveBeenCalledTimes(1);
      expect(ctx.transports.size).toBe(0);
    });
  });

  describe("Integration with Workers CPU Limit", () => {
    it("should respect Workers 50 second CPU limit", () => {
      const timeout = TIMEOUTS.SSE_CONNECTION_MS;

      expect(timeout).toBeLessThanOrEqual(50000);
    });

    it("should allow multiple pings within timeout window", () => {
      const timeout = TIMEOUTS.SSE_CONNECTION_MS;
      const pingInterval = TIMEOUTS.PING_INTERVAL_MS;

      const possiblePings = Math.floor(timeout / pingInterval);

      expect(possiblePings).toBeGreaterThanOrEqual(1);

      if (timeout === 50000 && pingInterval === 30000) {
        expect(possiblePings).toBe(1);
      }
    });
  });
});
