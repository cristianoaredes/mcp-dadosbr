import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMEOUTS } from "../../lib/config/timeouts.js";
import {
  calculateBackoffDelayMs,
  formatTimeoutMessage,
  getCircuitBreaker,
  getCircuitBreakerMetrics,
  getUpstreamKey,
  httpJson,
  resetCircuitBreakers,
  RETRY_STATUS_CODES,
} from "../../lib/core/http-client.js";

function createAbortAwareHangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const onAbort = () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      if (init?.signal?.aborted) {
        onAbort();
        return;
      }
      init?.signal?.addEventListener("abort", onAbort, { once: true });
    });
  });
}

describe("httpJson & per-upstream CircuitBreaker", () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("1. Transient failure threshold opens breaker & blocks retries", () => {
    it.each([
      {
        label: "HTTP 503",
        expectedError: "service temporarily unavailable",
        setupFetch: () => vi.fn(async () => new Response(null, { status: 503 })),
      },
      {
        label: "HTTP 429",
        expectedError: "rate limited",
        setupFetch: () => vi.fn(async () => new Response(null, { status: 429 })),
      },
      {
        label: "network error",
        expectedError: "network error",
        setupFetch: () => vi.fn(async () => Promise.reject(new Error("ECONNRESET"))),
      },
    ])("opens after 5 consecutive $label failures and short-circuits next call", async ({ expectedError, setupFetch }) => {
      const url = "https://api.opencnpj.org/v1/11222333000181";
      const fetchMock = setupFetch();
      vi.stubGlobal("fetch", fetchMock);

      for (let i = 0; i < 5; i++) {
        const res = await httpJson(url, undefined, 5000, { maxRetries: 0 });
        expect(res.ok).toBe(false);
        expect(res.error).toBe(expectedError);
      }

      expect(getCircuitBreaker(url).getState()).toBe("OPEN");
      const callsBeforeOpenShortCircuit = fetchMock.mock.calls.length;

      const blocked = await httpJson(url, undefined, 5000, {
        maxRetries: 3,
        initialRetryDelayMs: 1,
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.error).toMatch(/Circuit breaker is OPEN/);
      expect(blocked.source).toBe(url);
      expect(fetchMock.mock.calls.length).toBe(callsBeforeOpenShortCircuit);
    });

    it("opens after 5 consecutive timeouts without retrying", async () => {
      vi.useFakeTimers();
      const url = "https://api.opencnpj.org/v1/timeout";
      const fetchMock = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", fetchMock);

      for (let i = 0; i < 5; i++) {
        const pending = httpJson(url, undefined, 1000, { maxRetries: 3, initialRetryDelayMs: 50 });
        await vi.advanceTimersByTimeAsync(1000);
        const res = await pending;
        expect(res.ok).toBe(false);
        expect(res.error).toBe("request timeout after 1 second");
      }

      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(getCircuitBreaker(url).getState()).toBe("OPEN");

      const blocked = await httpJson(url, undefined, 1000, { maxRetries: 3 });
      expect(blocked.ok).toBe(false);
      expect(blocked.error).toMatch(/Circuit breaker is OPEN/);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });
  });

  describe("2. Per-upstream isolation", () => {
    it("isolates open state to failing origin while keeping other upstreams CLOSED", async () => {
      const cnpjUrl = "https://api.opencnpj.org/v1/11222333000181";
      const cepUrl = "https://opencep.com/v1/01310100";
      const pncpUrl = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao";

      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string) => {
          if (input.startsWith("https://api.opencnpj.org")) {
            return new Response(null, { status: 503 });
          }
          return Response.json({ upstream: getUpstreamKey(input) });
        }),
      );

      for (let i = 0; i < 5; i++) {
        await httpJson(cnpjUrl, undefined, 5000, { maxRetries: 0 });
      }

      expect(getCircuitBreaker("HTTPS://API.OPENCNPJ.ORG/other").getState()).toBe("OPEN");
      expect(getCircuitBreaker(cepUrl).getState()).toBe("CLOSED");
      expect(getCircuitBreaker(pncpUrl).getState()).toBe("CLOSED");

      const cepRes = await httpJson(cepUrl);
      const pncpRes = await httpJson(pncpUrl);
      expect(cepRes).toEqual({ ok: true, data: { upstream: "https://opencep.com" }, source: cepUrl });
      expect(pncpRes).toEqual({ ok: true, data: { upstream: "https://pncp.gov.br" }, source: pncpUrl });

      const cnpjBlocked = await httpJson(cnpjUrl);
      expect(cnpjBlocked.ok).toBe(false);
      expect(cnpjBlocked.error).toMatch(/Circuit breaker is OPEN/);
    });
  });

  describe("3. Non-429 4xx responses do not retry or open breaker", () => {
    it.each([404, 400, 403])("keeps breaker CLOSED with 0 failures after 10x HTTP %i", async (status) => {
      const url = `https://opencep.com/v1/status-${status}`;
      const fetchMock = vi.fn(async () => new Response(null, { status }));
      vi.stubGlobal("fetch", fetchMock);

      for (let i = 0; i < 10; i++) {
        const res = await httpJson(url, undefined, 5000, { maxRetries: 3, initialRetryDelayMs: 1 });
        expect(res.ok).toBe(false);
        expect(res.error).toBe(status === 404 ? "not found" : `HTTP ${status}`);
      }

      expect(fetchMock).toHaveBeenCalledTimes(10);
      expect(getCircuitBreaker(url).getState()).toBe("CLOSED");
      expect(getCircuitBreaker(url).getMetrics().failures).toBe(0);
    });
  });

  describe("4. OPEN -> HALF_OPEN -> CLOSED recovery", () => {
    it("transitions OPEN -> HALF_OPEN -> CLOSED after resetTimeoutMs when upstream recovers", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      const url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados";

      let fail = true;
      const fetchMock = vi.fn(async () => {
        if (fail) {
          return new Response(null, { status: 503 });
        }
        return Response.json([{ valor: "10.5" }]);
      });
      vi.stubGlobal("fetch", fetchMock);

      for (let i = 0; i < 5; i++) {
        await httpJson(url, undefined, 5000, { maxRetries: 0 });
      }
      expect(getCircuitBreaker(url).getState()).toBe("OPEN");

      const stillOpen = await httpJson(url);
      expect(stillOpen.ok).toBe(false);
      expect(stillOpen.error).toMatch(/Circuit breaker is OPEN/);
      expect(fetchMock).toHaveBeenCalledTimes(5);

      await vi.advanceTimersByTimeAsync(TIMEOUTS.CIRCUIT_BREAKER_RESET_MS + 1);
      fail = false;

      const recovered = await httpJson(url);
      expect(recovered.ok).toBe(true);
      expect(recovered.data).toEqual([{ valor: "10.5" }]);
      expect(getCircuitBreaker(url).getState()).toBe("CLOSED");
      expect(getCircuitBreaker(url).getMetrics().failures).toBe(0);
    });
  });

  describe("5. Mid-retry short-circuit", () => {
    it("stops remaining retries immediately without sleeping once breaker opens on an attempt", async () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      const url = "https://api.queridodiario.org.br/gazettes";
      const fetchMock = vi.fn(async () => new Response(null, { status: 503 }));
      vi.stubGlobal("fetch", fetchMock);

      for (let i = 0; i < 4; i++) {
        await httpJson(url, undefined, 5000, { maxRetries: 0 });
      }
      expect(getCircuitBreaker(url).getState()).toBe("CLOSED");
      expect(getCircuitBreaker(url).getMetrics().failures).toBe(4);
      setTimeoutSpy.mockClear();

      const res = await httpJson(url, undefined, 5000, {
        maxRetries: 3,
        initialRetryDelayMs: 1000,
        random: () => 0.5,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBe("service temporarily unavailable");
      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(getCircuitBreaker(url).getState()).toBe("OPEN");
      // Only the 1 request timeout timer should have been created; zero retry sleep timers.
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("6. clearTimeout leak prevention", () => {
    it.each([
      {
        label: "200 OK",
        setupFetch: () => vi.fn(async () => Response.json({ ok: true })),
        expectOk: true,
      },
      {
        label: "404 Not Found",
        setupFetch: () => vi.fn(async () => new Response(null, { status: 404 })),
        expectOk: false,
      },
      {
        label: "503 Service Unavailable",
        setupFetch: () => vi.fn(async () => new Response(null, { status: 503 })),
        expectOk: false,
      },
      {
        label: "network error",
        setupFetch: () => vi.fn(async () => Promise.reject(new Error("connect ECONNREFUSED"))),
        expectOk: false,
      },
      {
        label: "invalid JSON body",
        setupFetch: () =>
          vi.fn(async () => new Response("{not-json", { status: 200, headers: { "content-type": "application/json" } })),
        expectOk: false,
      },
    ])("clears timeout timer in finally on $label leaving zero active timers", async ({ setupFetch, expectOk }) => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      vi.stubGlobal("fetch", setupFetch());

      const res = await httpJson("https://brasilapi.com.br/api/fipe/marcas/v1/carros", undefined, 8000, {
        maxRetries: 0,
      });

      expect(res.ok).toBe(expectOk);
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("7. Dynamic timeoutMs error message", () => {
    it.each([
      { timeoutMs: 8000, expected: "request timeout after 8 seconds" },
      { timeoutMs: 1500, expected: "request timeout after 1.5 seconds" },
      { timeoutMs: 1000, expected: "request timeout after 1 second" },
      { timeoutMs: 50, expected: "request timeout after 0.05 seconds" },
    ])("formats $timeoutMs ms as '$expected' and propagates from httpJson", async ({ timeoutMs, expected }) => {
      expect(formatTimeoutMessage(timeoutMs)).toBe(expected);

      vi.useFakeTimers();
      const fetchMock = createAbortAwareHangingFetch();
      vi.stubGlobal("fetch", fetchMock);

      const url = `https://timeout-check-${timeoutMs}.example.org/data`;
      const pending = httpJson(url, undefined, timeoutMs, { maxRetries: 2, initialRetryDelayMs: 50 });
      await vi.advanceTimersByTimeAsync(timeoutMs);
      const res = await pending;

      expect(res).toEqual({ ok: false, error: expected, source: url });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getCircuitBreaker(url).getMetrics().failures).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("8. RETRY_STATUS_CODES consistency", () => {
    it("exports expected retryable status codes", () => {
      expect([...RETRY_STATUS_CODES].sort((a, b) => a - b)).toEqual([429, 500, 502, 503, 504]);
    });

    it.each([429, 500, 502, 503, 504])("retries HTTP %i up to maxRetries and increments breaker failures", async (status) => {
      const url = `https://retry-${status}.example.org/resource`;
      const fetchMock = vi.fn(async () => new Response(null, { status }));
      vi.stubGlobal("fetch", fetchMock);

      const res = await httpJson(url, undefined, 5000, {
        maxRetries: 2,
        initialRetryDelayMs: 1,
        random: () => 0,
      });

      expect(res.ok).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(getCircuitBreaker(url).getMetrics().failures).toBe(3);
    });

    it("trips breaker on HTTP 501 without retrying", async () => {
      const url = "https://not-implemented.example.org/resource";
      const fetchMock = vi.fn(async () => new Response(null, { status: 501 }));
      vi.stubGlobal("fetch", fetchMock);

      const res = await httpJson(url, undefined, 5000, {
        maxRetries: 3,
        initialRetryDelayMs: 1,
      });

      expect(res).toEqual({ ok: false, error: "HTTP 501", source: url });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getCircuitBreaker(url).getMetrics().failures).toBe(1);
    });
  });

  describe("9. Equal jitter in calculateBackoffDelayMs and retry scheduling", () => {
    it("keeps delays inside [base/2, base] with single random() sample and clamping", () => {
      const rngZero = vi.fn(() => 0);
      const rngHalf = vi.fn(() => 0.5);
      const rngOne = vi.fn(() => 1);

      expect(calculateBackoffDelayMs(0, 1000, rngZero)).toBe(500);
      expect(calculateBackoffDelayMs(0, 1000, rngHalf)).toBe(750);
      expect(calculateBackoffDelayMs(0, 1000, rngOne)).toBe(1000);
      expect(rngZero).toHaveBeenCalledTimes(1);
      expect(rngHalf).toHaveBeenCalledTimes(1);
      expect(rngOne).toHaveBeenCalledTimes(1);

      expect(calculateBackoffDelayMs(1, 1000, () => 0)).toBe(1000);
      expect(calculateBackoffDelayMs(1, 1000, () => 1)).toBe(2000);
      expect(calculateBackoffDelayMs(2, 1000, () => 0)).toBe(2000);
      expect(calculateBackoffDelayMs(2, 1000, () => 1)).toBe(4000);

      // Clamping & NaN resilience
      expect(calculateBackoffDelayMs(0, 1000, () => -5)).toBe(500);
      expect(calculateBackoffDelayMs(0, 1000, () => 5)).toBe(1000);
      expect(calculateBackoffDelayMs(0, 1000, () => Number.NaN)).toBe(750);
      expect(calculateBackoffDelayMs(0, 1000, () => Number.POSITIVE_INFINITY)).toBe(750);
    });

    it("schedules jittered sleep durations during retries in httpJson", async () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      const randomSpy = vi.fn().mockReturnValueOnce(0.2).mockReturnValueOnce(0.8);
      let calls = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          calls++;
          if (calls < 3) {
            return new Response(null, { status: 503 });
          }
          return Response.json({ recovered: true });
        }),
      );

      const pending = httpJson("https://jitter.example.org/test", undefined, 8000, {
        maxRetries: 2,
        initialRetryDelayMs: 100,
        random: randomSpy,
      });

      // Attempt 0 delay: round(50 + 0.2 * 50) = 60ms
      // Attempt 1 delay: round(100 + 0.8 * 100) = 180ms
      await vi.advanceTimersByTimeAsync(60);
      await vi.advanceTimersByTimeAsync(180);

      const res = await pending;
      expect(res.ok).toBe(true);
      expect(randomSpy).toHaveBeenCalledTimes(2);
      const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
      expect(delays).toContain(60);
      expect(delays).toContain(180);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("10. HTTP 204 noContent, invalid URLs, and registry cap", () => {
    it("returns options.noContent on 204 only when noContent key is present", async () => {
      const url = "https://pncp.gov.br/api/consulta/v1/empty";
      vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));

      const emptyPage = { data: [] };
      const withNoContent = await httpJson(url, undefined, 5000, { noContent: emptyPage, maxRetries: 0 });
      expect(withNoContent).toEqual({ ok: true, data: emptyPage, source: url });

      const withNullNoContent = await httpJson(url, undefined, 5000, { noContent: null, maxRetries: 0 });
      expect(withNullNoContent).toEqual({ ok: true, data: null, source: url });

      const withoutNoContentKey = await httpJson(url, undefined, 5000, { maxRetries: 0 });
      expect(withoutNoContentKey).toEqual({ ok: false, error: "unknown error", source: url });
    });

    it("rejects invalid or non-HTTP URLs without invoking fetch or creating breaker entries", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      for (const badUrl of ["not-a-url", "ftp://example.org/file", "javascript:alert(1)"]) {
        const res = await httpJson(badUrl);
        expect(res).toEqual({ ok: false, error: "invalid url", source: badUrl });
      }

      expect(fetchMock).not.toHaveBeenCalled();
      expect(Object.keys(getCircuitBreakerMetrics())).toHaveLength(0);
    });

    it("caps circuit breaker registry at 100 origins and prioritizes evicting CLOSED breakers", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string) => {
          if (input.startsWith("https://open-origin.example.org")) {
            return new Response(null, { status: 503 });
          }
          return Response.json({ ok: true });
        }),
      );

      // Open the first origin
      for (let i = 0; i < 5; i++) {
        await httpJson("https://open-origin.example.org/test", undefined, 5000, { maxRetries: 0 });
      }
      expect(getCircuitBreaker("https://open-origin.example.org").getState()).toBe("OPEN");

      // Populate 104 more distinct origins (105 total > MAX_CIRCUIT_BREAKERS=100)
      for (let i = 0; i < 104; i++) {
        const res = await httpJson(`https://origin-${i}.example.org/test`, undefined, 5000, { maxRetries: 0 });
        expect(res.ok).toBe(true);
      }

      const metrics = getCircuitBreakerMetrics();
      const keys = Object.keys(metrics);
      expect(keys.length).toBeLessThanOrEqual(100);
      expect(keys).toHaveLength(100);
      expect(metrics["https://open-origin.example.org"]?.state).toBe("OPEN");
    });
  });
});
