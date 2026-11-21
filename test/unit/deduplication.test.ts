import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  deduplicate,
  getPendingRequestCount,
  lookup,
} from "../../lib/tools/core.js";
import { MemoryCache } from "../../lib/core/cache.js";
import { resolveApiConfig } from "../../lib/config/index.js";
import { TIMEOUTS } from "../../lib/config/timeouts.js";

describe("Request Deduplication (lib/tools/core)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T18:00:00.000Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should deduplicate concurrent identical requests using fake timers", async () => {
    let callCount = 0;
    const mockApiCall = async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: "test", callNumber: callCount };
    };

    const p1 = deduplicate("concurrent-key", mockApiCall);
    const p2 = deduplicate("concurrent-key", mockApiCall);
    const p3 = deduplicate("concurrent-key", mockApiCall);

    expect(getPendingRequestCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(10);
    const results = await Promise.all([p1, p2, p3]);

    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
    expect(callCount).toBe(1);
    expect(getPendingRequestCount()).toBe(0);
  });

  it("should cleanup stale requests after DEDUP_TIMEOUT_MS without evicting newer requests on late resolution", async () => {
    let resolveSlow!: (value: { data: string; generation: number }) => void;
    const slowPromise = deduplicate(
      "stale-key",
      () =>
        new Promise<{ data: string; generation: number }>((resolve) => {
          resolveSlow = resolve;
        }),
    );

    expect(getPendingRequestCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(TIMEOUTS.DEDUP_TIMEOUT_MS);
    expect(getPendingRequestCount()).toBe(0);

    // Start a fresh request on the same key while generation 1 is still pending
    let resolveFresh!: (value: { data: string; generation: number }) => void;
    const freshPromise = deduplicate(
      "stale-key",
      () =>
        new Promise<{ data: string; generation: number }>((resolve) => {
          resolveFresh = resolve;
        }),
    );
    expect(getPendingRequestCount()).toBe(1);

    // Generation 1 settles late — must NOT remove generation 2 from pendingRequests
    resolveSlow({ data: "slow", generation: 1 });
    expect(await slowPromise).toEqual({ data: "slow", generation: 1 });
    expect(getPendingRequestCount()).toBe(1);

    // Generation 2 finishes and clears its own entry
    resolveFresh({ data: "fresh", generation: 2 });
    expect(await freshPromise).toEqual({ data: "fresh", generation: 2 });
    expect(getPendingRequestCount()).toBe(0);
  });

  it("should allow new requests after previous request completes", async () => {
    let callCount = 0;
    const mockApiCall = async () => {
      callCount++;
      return { data: "test", count: callCount };
    };

    const result1 = await deduplicate("sequential-key", mockApiCall);
    expect(result1.count).toBe(1);
    expect(getPendingRequestCount()).toBe(0);

    const result2 = await deduplicate("sequential-key", mockApiCall);
    expect(result2.count).toBe(2);
    expect(callCount).toBe(2);
    expect(getPendingRequestCount()).toBe(0);
  });

  it("should handle errors without leaking pending entries or timers", async () => {
    const failingApiCall = async () => {
      throw new Error("API Error");
    };

    await expect(deduplicate("error-key", failingApiCall)).rejects.toThrow("API Error");
    expect(getPendingRequestCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("deduplicates concurrent lookup() calls and serves subsequent calls from MemoryCache", async () => {
    const cache = new MemoryCache(10, 60_000);
    const apiConfig = resolveApiConfig();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(
        JSON.stringify({ razao_social: "EMPRESA TESTE LTDA" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const p1 = lookup("cnpj", "11222333000181", apiConfig, cache);
    const p2 = lookup("cnpj", "11222333000181", apiConfig, cache);

    await vi.advanceTimersByTimeAsync(15);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getPendingRequestCount()).toBe(0);

    // Third call hits MemoryCache without calling fetch again
    const r3 = await lookup("cnpj", "11222333000181", apiConfig, cache);
    expect(r3.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
